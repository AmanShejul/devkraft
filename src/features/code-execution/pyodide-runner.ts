import type { CodeExecutionResult } from "@/types/domain";

const PYODIDE_VERSION = "0.27.2";
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_MODULE_URL = `${PYODIDE_BASE_URL}pyodide.mjs`;
const DEFAULT_TIMEOUT_MS = 20_000;

type WorkerResultMessage = {
  type: "result";
  id: number;
  status: "completed" | "failed";
  stdout: string;
  stderr: string;
  durationMs: number;
};

type PendingRun = {
  resolve: (result: CodeExecutionResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type PyodideRunnerErrorKind = "unavailable" | "timeout" | "runtime";

export class PyodideRunnerError extends Error {
  constructor(readonly kind: PyodideRunnerErrorKind, message: string) {
    super(message);
    this.name = "PyodideRunnerError";
  }
}

const workerSource = `
import { loadPyodide } from ${JSON.stringify(PYODIDE_MODULE_URL)};

let pyodidePromise;

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_BASE_URL)} });
  }
  return pyodidePromise;
}

self.onmessage = async (event) => {
  const { id, sourceCode, stdin } = event.data;
  const startedAt = performance.now();
  let stdout = "";
  let stderr = "";

  try {
    const pyodide = await getPyodide();
    const inputLines = String(stdin || "").split(/\\r?\\n/);
    let inputIndex = 0;
    pyodide.setStdout({ batched: (text) => { stdout += text; } });
    pyodide.setStderr({ batched: (text) => { stderr += text; } });
    pyodide.setStdin({ stdin: () => inputIndex < inputLines.length ? inputLines[inputIndex++] : null });
    await pyodide.runPythonAsync(sourceCode);
    self.postMessage({ type: "result", id, status: "completed", stdout, stderr, durationMs: performance.now() - startedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ type: "result", id, status: "failed", stdout, stderr: stderr ? stderr + "\\n" + message : message, durationMs: performance.now() - startedAt });
  }
};
`;

let activeWorker: Worker | null = null;
let nextRunId = 1;
const pendingRuns = new Map<number, PendingRun>();

function rejectAllPending(error: PyodideRunnerError) {
  for (const [id, pending] of pendingRuns) {
    clearTimeout(pending.timer);
    pending.reject(error);
    pendingRuns.delete(id);
  }
}

function stopWorker(error: PyodideRunnerError) {
  activeWorker?.terminate();
  activeWorker = null;
  rejectAllPending(error);
}

function handleWorkerMessage(event: MessageEvent<WorkerResultMessage>) {
  const message = event.data;
  if (!message || message.type !== "result" || typeof message.id !== "number") return;
  const pending = pendingRuns.get(message.id);
  if (!pending) return;
  pendingRuns.delete(message.id);
  clearTimeout(pending.timer);
  pending.resolve({
    status: message.status,
    stdout: message.stdout,
    stderr: message.stderr,
    failureKind: message.status === "failed" ? "runtime-error" : undefined,
    durationMs: message.durationMs,
    provider: "pyodide-local",
  });
}

function getWorker(): Worker {
  if (activeWorker) return activeWorker;
  if (typeof Worker === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") {
    throw new PyodideRunnerError("unavailable", "This browser does not support the local Python runner.");
  }

  const blob = new Blob([workerSource], { type: "application/javascript" });
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl, { type: "module" });
  URL.revokeObjectURL(workerUrl);
  worker.onmessage = handleWorkerMessage;
  worker.onerror = () => stopWorker(new PyodideRunnerError("unavailable", "The local Python runtime could not be loaded."));
  activeWorker = worker;
  return worker;
}

export function runPythonInBrowser(sourceCode: string, stdin = "", timeoutMs = DEFAULT_TIMEOUT_MS): Promise<CodeExecutionResult> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = getWorker();
    } catch (error) {
      reject(error instanceof Error ? error : new PyodideRunnerError("unavailable", "The local Python runtime is unavailable."));
      return;
    }

    const id = nextRunId++;
    const timer = setTimeout(() => {
      if (!pendingRuns.has(id)) return;
      stopWorker(new PyodideRunnerError("timeout", "The local Python program exceeded its 20-second limit."));
    }, timeoutMs);
    pendingRuns.set(id, { resolve, reject, timer });

    try {
      worker.postMessage({ id, sourceCode, stdin });
    } catch {
      stopWorker(new PyodideRunnerError("unavailable", "The local Python runtime could not receive the program."));
    }
  });
}

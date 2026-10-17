"use client";

export type PyodideStatus = "idle" | "loading" | "ready";

type WorkerResponse = {
  id: number;
  ok: boolean;
  output?: string;
  error?: string;
};

type WorkerStatusMessage =
  | { type: "ready" }
  | { type: "runtime-error"; error: string };

type PendingRun = {
  resolve: (result: { output: string } | { error: string }) => void;
  loadTimer: ReturnType<typeof setTimeout>;
  timeoutMs: number;
  timer?: ReturnType<typeof setTimeout>;
};

const RUNTIME_LOAD_TIMEOUT_MS = 60_000;

let worker: Worker | null = null;
let status: PyodideStatus = "idle";
let nextRequestId = 1;
const pendingRuns = new Map<number, PendingRun>();

function resolvePendingWithError(error: string) {
  for (const [id, pending] of pendingRuns) {
    clearTimeout(pending.loadTimer);
    clearTimeout(pending.timer);
    pending.resolve({ error });
    pendingRuns.delete(id);
  }
}

function disposeWorker(error: string) {
  worker?.terminate();
  worker = null;
  status = "idle";
  resolvePendingWithError(error);
}

function handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
  const message = event.data as WorkerResponse | WorkerStatusMessage;
  if ("type" in message && message.type === "ready") {
    status = "ready";
    for (const [id, pending] of pendingRuns) {
      clearTimeout(pending.loadTimer);
      pending.timer = setTimeout(() => {
        if (!pendingRuns.has(id)) return;
        disposeWorker("The Python program exceeded the 12-second execution limit.");
      }, pending.timeoutMs);
    }
    return;
  }
  if ("type" in message && message.type === "runtime-error") {
    disposeWorker(`The local Python runtime could not load: ${message.error}`);
    return;
  }
  if (!message || typeof message.id !== "number") return;

  const pending = pendingRuns.get(message.id);
  if (!pending) return;
  pendingRuns.delete(message.id);
  clearTimeout(pending.loadTimer);
  clearTimeout(pending.timer);
  status = "ready";

  if (message.ok) {
    pending.resolve({ output: typeof message.output === "string" ? message.output : "" });
  } else {
    pending.resolve({ error: message.error || "The Python program failed." });
  }
}

function getWorker() {
  if (worker) return worker;
  if (typeof Worker === "undefined") {
    throw new Error("This browser does not support local Python execution.");
  }

  const nextWorker = new Worker("/pyodide-worker.js");
  nextWorker.onmessage = handleWorkerMessage;
  nextWorker.onerror = () => disposeWorker("The local Python runtime could not be loaded.");
  worker = nextWorker;
  status = "loading";
  return nextWorker;
}

export function getStatus(): PyodideStatus {
  return status;
}

export function runPython(code: string, timeoutMs = 12_000): Promise<{ output: string } | { error: string }> {
  return new Promise((resolve) => {
    let activeWorker: Worker;
    try {
      activeWorker = getWorker();
    } catch (caught) {
      resolve({ error: caught instanceof Error ? caught.message : "The local Python runtime is unavailable." });
      return;
    }

    const id = nextRequestId++;
    const loadTimer = setTimeout(() => {
      if (!pendingRuns.has(id)) return;
      disposeWorker("The Python runtime took too long to load. Check the browser connection and try again.");
    }, status === "ready" ? 0 : RUNTIME_LOAD_TIMEOUT_MS);
    pendingRuns.set(id, { resolve, loadTimer, timeoutMs });

    if (status === "ready") {
      clearTimeout(loadTimer);
      pendingRuns.get(id)!.timer = setTimeout(() => {
        if (!pendingRuns.has(id)) return;
        disposeWorker("The Python program exceeded the 12-second execution limit.");
      }, timeoutMs);
    }

    try {
      activeWorker.postMessage({ id, code });
    } catch {
      disposeWorker("The local Python runtime could not receive the program.");
    }
  });
}

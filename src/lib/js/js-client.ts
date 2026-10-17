"use client";

export type JavaScriptStatus = "idle" | "running";

type WorkerResponse = { id: number; ok: boolean; output?: string; error?: string };
type PendingRun = {
  resolve: (result: { output: string } | { error: string }) => void;
  timer: ReturnType<typeof setTimeout>;
};

let worker: Worker | null = null;
let status: JavaScriptStatus = "idle";
let nextRequestId = 1;
const pendingRuns = new Map<number, PendingRun>();

function disposeWorker(error?: string) {
  worker?.terminate();
  worker = null;
  status = "idle";
  if (error) {
    for (const [id, pending] of pendingRuns) {
      clearTimeout(pending.timer);
      pending.resolve({ error });
      pendingRuns.delete(id);
    }
  }
}

function handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
  const message = event.data;
  if (!message || typeof message.id !== "number") return;
  const pending = pendingRuns.get(message.id);
  if (!pending) return;
  pendingRuns.delete(message.id);
  clearTimeout(pending.timer);
  disposeWorker();
  pending.resolve(message.ok
    ? { output: typeof message.output === "string" ? message.output : "" }
    : { error: message.error || "The JavaScript program failed." });
}

function getWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === "undefined") throw new Error("This browser does not support local JavaScript execution.");
  const nextWorker = new Worker("/js-worker.js");
  nextWorker.onmessage = handleWorkerMessage;
  nextWorker.onerror = () => disposeWorker("The local JavaScript worker could not run this program.");
  worker = nextWorker;
  status = "running";
  return nextWorker;
}

export function getJavaScriptStatus(): JavaScriptStatus {
  return status;
}

export function runJavaScript(code: string, timeoutMs = 12_000): Promise<{ output: string } | { error: string }> {
  return new Promise((resolve) => {
    let activeWorker: Worker;
    try {
      activeWorker = getWorker();
    } catch (error) {
      resolve({ error: error instanceof Error ? error.message : "The local JavaScript worker is unavailable." });
      return;
    }

    const id = nextRequestId++;
    const timer = setTimeout(() => {
      if (!pendingRuns.has(id)) return;
      disposeWorker("The JavaScript program exceeded the 12-second execution limit.");
    }, timeoutMs);
    pendingRuns.set(id, { resolve, timer });
    try {
      activeWorker.postMessage({ id, code });
    } catch {
      disposeWorker("The local JavaScript worker could not receive the program.");
    }
  });
}

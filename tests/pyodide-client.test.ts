import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockWorker {
  static last: MockWorker | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  message: unknown;
  terminated = false;

  constructor() {
    MockWorker.last = this;
  }

  postMessage(message: unknown) {
    this.message = message;
  }

  terminate() {
    this.terminated = true;
  }
}

describe("Pyodide client protocol", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("Worker", MockWorker);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("sends code to the worker and resolves its output", async () => {
    const client = await import("@/lib/pyodide/pyodide-client");
    const pending = client.runPython("print(42)");
    const worker = MockWorker.last;

    expect(client.getStatus()).toBe("loading");
    expect(worker?.message).toEqual({ id: 1, code: "print(42)" });
    worker?.onmessage?.({ data: { id: 1, ok: true, output: "42\n" } } as MessageEvent);

    await expect(pending).resolves.toEqual({ output: "42\n" });
    expect(client.getStatus()).toBe("ready");
  });

  it("terminates a timed-out worker and recreates it on the next run", async () => {
    vi.useFakeTimers();
    const client = await import("@/lib/pyodide/pyodide-client");
    const first = client.runPython("while True: pass");
    const firstWorker = MockWorker.last;

    await vi.advanceTimersByTimeAsync(12_000);
    await expect(first).resolves.toEqual({ error: "The Python program exceeded the 12-second execution limit." });
    expect(firstWorker?.terminated).toBe(true);
    expect(client.getStatus()).toBe("idle");

    const second = client.runPython("print(1)");
    const secondWorker = MockWorker.last;
    expect(secondWorker).not.toBe(firstWorker);
    secondWorker?.onmessage?.({ data: { id: 2, ok: true, output: "1\n" } } as MessageEvent);
    await expect(second).resolves.toEqual({ output: "1\n" });
  });
});

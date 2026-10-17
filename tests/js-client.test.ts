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

describe("JavaScript worker client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("Worker", MockWorker);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("posts JavaScript to the worker and resolves its output", async () => {
    const client = await import("@/lib/js/js-client");
    const pending = client.runJavaScript("console.log(42)");
    const worker = MockWorker.last;

    expect(worker?.message).toEqual({ id: 1, code: "console.log(42)" });
    worker?.onmessage?.({ data: { id: 1, ok: true, output: "42" } } as MessageEvent);
    await expect(pending).resolves.toEqual({ output: "42" });
    expect(worker?.terminated).toBe(true);
    expect(client.getJavaScriptStatus()).toBe("idle");
  });

  it("terminates an infinite-loop worker after the execution limit", async () => {
    vi.useFakeTimers();
    const client = await import("@/lib/js/js-client");
    const pending = client.runJavaScript("while (true) {}", 12_000);
    const worker = MockWorker.last;

    await vi.advanceTimersByTimeAsync(12_000);
    await expect(pending).resolves.toEqual({ error: "The JavaScript program exceeded the 12-second execution limit." });
    expect(worker?.terminated).toBe(true);
    expect(client.getJavaScriptStatus()).toBe("idle");
  });
});

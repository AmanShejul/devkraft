import { describe, expect, it } from "vitest";
import { createAnimationLoop } from "@/components/landing/animation-loop";

function createFrameHarness() {
  const pending = new Map<number, FrameRequestCallback>();
  let nextId = 1;

  return {
    requestFrame: (callback: FrameRequestCallback) => {
      const id = nextId++;
      pending.set(id, callback);
      return id;
    },
    cancelFrame: (id: number) => {
      pending.delete(id);
    },
    runNext: (timestamp: number) => {
      const next = pending.entries().next().value as [number, FrameRequestCallback] | undefined;
      if (!next) throw new Error("No animation frame is scheduled");
      pending.delete(next[0]);
      next[1](timestamp);
    },
    pendingCount: () => pending.size,
  };
}

describe("canvas animation loop", () => {
  it("skips hidden-tab drawing and resumes on wake with one scheduled frame", () => {
    const frames = createFrameHarness();
    const draws: number[] = [];
    let hidden = false;
    const loop = createAnimationLoop({
      ...frames,
      isHidden: () => hidden,
      draw: (timestamp) => draws.push(timestamp),
    });

    loop.start();
    expect(frames.pendingCount()).toBe(1);
    frames.runNext(100);
    expect(draws).toEqual([100]);

    hidden = true;
    frames.runNext(200);
    expect(draws).toEqual([100]);
    expect(frames.pendingCount()).toBe(1);

    hidden = false;
    loop.wake();
    expect(frames.pendingCount()).toBe(1);
    frames.runNext(300);
    expect(draws).toEqual([100, 300]);

    loop.stop();
    expect(frames.pendingCount()).toBe(0);
  });

  it("keeps scheduling the loop after a drawing error", () => {
    const frames = createFrameHarness();
    const loop = createAnimationLoop({
      ...frames,
      isHidden: () => false,
      draw: () => {
        throw new Error("Canvas draw failed");
      },
    });
    loop.start();

    expect(() => frames.runNext(100)).toThrow("Canvas draw failed");
    expect(frames.pendingCount()).toBe(1);
    loop.stop();
  });
});

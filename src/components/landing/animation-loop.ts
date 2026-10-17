type AnimationLoopOptions = {
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (id: number) => void;
  isHidden: () => boolean;
  draw: (timestamp: number) => void;
};

export function createAnimationLoop({
  requestFrame,
  cancelFrame,
  isHidden,
  draw,
}: AnimationLoopOptions) {
  let frameId: number | null = null;
  let stopped = false;
  let paused = false;

  const schedule = () => {
    if (!stopped && !paused && frameId === null) {
      frameId = requestFrame(onFrame);
    }
  };

  const onFrame: FrameRequestCallback = (timestamp) => {
    frameId = null;
    if (stopped) return;

    try {
      if (!isHidden()) draw(timestamp);
    } finally {
      schedule();
    }
  };

  return {
    start: schedule,
    wake: () => {
      if (stopped) return;
      paused = false;
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
      schedule();
    },
    pause: () => {
      paused = true;
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
    },
    stop: () => {
      stopped = true;
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
    },
  };
}

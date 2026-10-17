export function getStarTwinkle(timestamp: number, speed: number, phase: number): number {
  return 0.38 + (Math.sin((timestamp / 1000) * speed + phase) + 1) * 0.31;
}

export function getStarFormationProgress(elapsedMs: number, delayMs: number, durationMs: number): number {
  const progress = Math.min(1, Math.max(0, (elapsedMs - delayMs) / durationMs));
  return progress * progress * (3 - 2 * progress);
}

type HeroBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function getCursorPosition(
  clientX: number,
  clientY: number,
  bounds: HeroBounds,
) : { x: number; y: number } | null {
  const x = (clientX - bounds.left) / bounds.width;
  const y = (clientY - bounds.top) / bounds.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) {
    return null;
  }

  return { x: x * bounds.width, y: y * bounds.height };
}

export function getStarCursorOffset(
  starX: number,
  starY: number,
  cursorX: number,
  cursorY: number,
  radius = 180,
  strength = 18,
  output?: { x: number; y: number },
) {
  const dx = starX - cursorX;
  const dy = starY - cursorY;
  const distance = Math.hypot(dx, dy);
  if (distance >= radius || distance === 0) {
    if (output) {
      output.x = 0;
      output.y = 0;
      return output;
    }
    return { x: 0, y: 0 };
  }

  const influence = (1 - distance / radius) ** 2;
  const amount = strength * influence;
  const x = (dx / distance) * amount;
  const y = (dy / distance) * amount;
  if (output) {
    output.x = x;
    output.y = y;
    return output;
  }
  return { x, y };
}

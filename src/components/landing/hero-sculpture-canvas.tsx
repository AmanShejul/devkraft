"use client";

import { useEffect, useRef } from "react";
import { createAnimationLoop } from "./animation-loop";
import { getCursorPosition, getStarCursorOffset, getStarTwinkle } from "./starfield-animation";

type Star = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  phase: number;
  speed: number;
  opacity: number;
  color: string;
  blur: number;
  glint: boolean;
  cursorOffsetX: number;
  cursorOffsetY: number;
};

const STAR_COUNT = 800;
const INTRO_DURATION = 3_000;
const palette = [
  { color: "#f5f2ea", weight: 70 },
  { color: "#b8d4f0", weight: 12 },
  { color: "#f0b8c8", weight: 10 },
  { color: "#e8b96a", weight: 8 },
] as const;

function pickColor(): string {
  const value = Math.random() * 100;
  let accumulated = 0;
  for (const entry of palette) {
    accumulated += entry.weight;
    if (value < accumulated) return entry.color;
  }
  return palette[0].color;
}

function createStars(width: number, height: number): Star[] {
  const centerX = width * 0.7;
  const visibleHeight = Math.min(height, window.innerHeight);
  const centerY = Math.min(height * 0.5, visibleHeight * 0.5);
  const radiusLimit = Math.min(visibleHeight * 0.58, width * 0.38);

  return Array.from({ length: STAR_COUNT }, (_, index) => {
    const inCore = Math.random() < 0.28;
    let radius: number;
    let angle: number;
    if (inCore) {
      radius = Math.pow(Math.random(), 2.4) * radiusLimit * 0.22;
      angle = Math.random() * Math.PI * 2;
    } else {
      radius = Math.pow(Math.random(), 0.72) * radiusLimit;
      const arm = index % 2 === 0 ? 0 : Math.PI;
      angle = arm + Math.log(Math.max(radius / radiusLimit, 0.025)) * 1.65;
      angle += (Math.random() - 0.5) * (0.13 + radius / radiusLimit * 0.42);
    }

    return {
      x: Math.random() * width,
      y: Math.random() * height,
      targetX: centerX + Math.cos(angle) * radius * 1.45,
      targetY: centerY + Math.sin(angle) * radius * 0.78,
      size: index < 8 ? 7 + Math.random() * 5 : 1 + Math.pow(Math.random(), 3.4) * 11,
      phase: Math.random() * Math.PI * 2,
      speed: 1 + Math.random() * 2,
      opacity: 0.35 + Math.random() * 0.65,
      color: pickColor(),
      blur: Math.random() < 0.2 ? 2 + Math.random() * 7 : 0,
      glint: index < 8,
      cursorOffsetX: 0,
      cursorOffsetY: 0,
    };
  });
}

export default function HeroSculptureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let stars: Star[] = [];
    let cursorPosition: { x: number; y: number } | null = null;
    const startTime = performance.now();

    const draw = (timestamp: number) => {
      context.clearRect(0, 0, width, height);
      const glow = context.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.65);
      glow.addColorStop(0, "rgba(18, 30, 55, 0)");
      glow.addColorStop(0.72, "rgba(18, 30, 55, 0.025)");
      glow.addColorStop(1, "rgba(35, 60, 100, 0.08)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      const intro = motionQuery.matches ? 1 : Math.min(1, Math.max(0, (timestamp - startTime) / INTRO_DURATION));
      const ease = intro * intro * (3 - 2 * intro);
      const centerX = width * 0.7;
      const centerY = Math.min(height * 0.5, Math.min(height, window.innerHeight) * 0.5);
      const ambientTime = Math.max(0, timestamp - startTime - INTRO_DURATION);
      const rotation = motionQuery.matches
        ? 0
        : -(ambientTime / 1000) * (Math.PI / 180) * 0.3;
      context.save();
      context.translate(centerX, centerY);
      context.rotate(rotation);
      context.translate(-centerX, -centerY);
      for (const star of stars) {
        const baseX = star.x + (star.targetX - star.x) * ease;
        const baseY = star.y + (star.targetY - star.y) * ease;
        const cursorOffset = cursorPosition && !motionQuery.matches
          ? getStarCursorOffset(baseX, baseY, cursorPosition.x, cursorPosition.y, 190, 14 + star.size * 0.7)
          : { x: 0, y: 0 };
        star.cursorOffsetX += (cursorOffset.x - star.cursorOffsetX) * 0.16;
        star.cursorOffsetY += (cursorOffset.y - star.cursorOffsetY) * 0.16;
        const x = baseX + star.cursorOffsetX;
        const y = baseY + star.cursorOffsetY;
        const twinkle = motionQuery.matches ? 1 : getStarTwinkle(timestamp, star.speed, star.phase);
        context.globalAlpha = star.opacity * twinkle;
        context.fillStyle = star.color;
        if (star.blur > 0) {
          context.shadowColor = star.color;
          context.shadowBlur = star.blur;
        } else {
          context.shadowBlur = 0;
        }
        context.beginPath();
        context.arc(x, y, star.size / 2, 0, Math.PI * 2);
        context.fill();
        if (star.glint) {
          context.globalAlpha *= 0.45;
          context.shadowBlur = star.size * 1.5;
          context.beginPath();
          context.moveTo(x - star.size * 1.7, y);
          context.lineTo(x + star.size * 1.7, y);
          context.moveTo(x, y - star.size * 1.7);
          context.lineTo(x, y + star.size * 1.7);
          context.strokeStyle = star.color;
          context.lineWidth = Math.max(0.5, star.size * 0.12);
          context.stroke();
        }
      }
      context.restore();
      context.globalAlpha = 1;

      const vignette = context.createLinearGradient(0, 0, 0, height);
      vignette.addColorStop(0, "rgba(0, 0, 0, 0.22)");
      vignette.addColorStop(0.16, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(0.84, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.24)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);
    };

    let resizePending = false;
    const resizeAndPaint = () => {
      if (document.hidden) {
        resizePending = true;
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) return;
      const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.round(bounds.width * nextPixelRatio);
      const nextHeight = Math.round(bounds.height * nextPixelRatio);
      if (!resizePending && nextWidth === canvas.width && nextHeight === canvas.height) return;

      width = bounds.width;
      height = bounds.height;
      pixelRatio = nextPixelRatio;
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      stars = createStars(width, height);
      resizePending = false;
      draw(document.hidden ? startTime + INTRO_DURATION : performance.now());
    };

    const animationLoop = createAnimationLoop({
      requestFrame: window.requestAnimationFrame.bind(window),
      cancelFrame: window.cancelAnimationFrame.bind(window),
      isHidden: () => document.hidden,
      draw: (timestamp) => {
        if (!motionQuery.matches) draw(timestamp);
      },
    });
    const onMotionChange = () => {
      if (motionQuery.matches) {
        cursorPosition = null;
      }
      if (!document.hidden) draw(performance.now());
      animationLoop.wake();
    };
    const onVisibilityChange = () => {
      if (document.hidden) return;
      try {
        resizeAndPaint();
      } finally {
        animationLoop.wake();
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (motionQuery.matches) {
        cursorPosition = null;
        return;
      }
      const cursor = getCursorPosition(event.clientX, event.clientY, canvas.getBoundingClientRect());
      cursorPosition = cursor;
    };
    const onPointerLeave = () => {
      cursorPosition = null;
    };
    const observer = new ResizeObserver(resizeAndPaint);

    resizeAndPaint();
    observer.observe(canvas);
    window.addEventListener("resize", resizeAndPaint);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    motionQuery.addEventListener("change", onMotionChange);
    animationLoop.start();

    return () => {
      animationLoop.stop();
      observer.disconnect();
      window.removeEventListener("resize", resizeAndPaint);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery.removeEventListener("change", onMotionChange);
    };
  }, []);

  return <canvas
    ref={canvasRef}
    aria-hidden="true"
    className="absolute inset-0 h-full w-full"
  />;
}

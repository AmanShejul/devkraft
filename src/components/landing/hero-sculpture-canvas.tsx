"use client";

import { useEffect, useRef } from "react";
import { createAnimationLoop } from "./animation-loop";
import { getCursorPosition, getStarCursorOffset, getStarFormationProgress, getStarTwinkle } from "./starfield-animation";

type Star = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  formationDelay: number;
  formationDuration: number;
  spiralOffset: number;
  size: number;
  phase: number;
  speed: number;
  opacity: number;
  color: string;
  blur: number;
  glint: boolean;
  depthLayer: 0 | 1 | 2;
  cursorOffsetX: number;
  cursorOffsetY: number;
};

type Nebula = {
  x: number;
  y: number;
  radius: number;
  phase: number;
  speed: number;
  driftX: number;
  driftY: number;
  innerColor: string;
  outerColor: string;
  texture: HTMLCanvasElement;
};

type Meteor = {
  active: boolean;
  startTime: number;
  duration: number;
  startX: number;
  startY: number;
  directionX: number;
  directionY: number;
  tailLength: number;
};

type Ripple = {
  active: boolean;
  x: number;
  y: number;
  startTime: number;
};

type BurstParticle = {
  active: boolean;
  x: number;
  y: number;
  originX: number;
  originY: number;
  velocityX: number;
  velocityY: number;
  size: number;
  startTime: number;
};

const STAR_COUNT = 800;
const INTRO_DURATION = 4_700;
const FORMATION_FLASH_DURATION = 1_800;
const BASE_ROTATION_DEGREES_PER_SECOND = 4;
const METEOR_MIN_DELAY = 4_000;
const METEOR_MAX_DELAY = 9_000;
const METEOR_DURATION = 1_200;
const RIPPLE_DURATION = 800;
const RIPPLE_COUNT = 4;
const BURST_PARTICLES_PER_RIPPLE = 12;
const BURST_PARTICLE_COUNT = RIPPLE_COUNT * BURST_PARTICLES_PER_RIPPLE;
const DEPTH_PARALLAX_STRENGTH = [0.35, 0.65, 1] as const;
const TAU = Math.PI * 2;
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

    const normalizedRadius = radius / radiusLimit;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      targetX: centerX + Math.cos(angle) * radius * 1.45,
      targetY: centerY + Math.sin(angle) * radius * 0.78,
      formationDelay: inCore ? Math.random() * 500 : 400 + normalizedRadius * 2_000,
      formationDuration: 1_500 + Math.random() * 800,
      spiralOffset: -(1.4 + Math.random() * 2.2),
      size: index < 8 ? 7 + Math.random() * 5 : 1 + Math.pow(Math.random(), 3.4) * 11,
      phase: Math.random() * Math.PI * 2,
      speed: 1 + Math.random() * 2,
      opacity: 0.35 + Math.random() * 0.65,
      color: pickColor(),
      blur: Math.random() < 0.2 ? 2 + Math.random() * 7 : 0,
      glint: index < 8,
      depthLayer: (index % 3) as 0 | 1 | 2,
      cursorOffsetX: 0,
      cursorOffsetY: 0,
    };
  });
}

function createNebulae(width: number, height: number): Nebula[] {
  const radius = Math.max(width, height) * 0.42;
  const definitions = [
    { x: width * 0.58, y: height * 0.3, radius, phase: 0.4, speed: 0.18, driftX: width * 0.08, driftY: height * 0.05, innerColor: "rgba(37, 75, 170, 0.055)", outerColor: "rgba(37, 75, 170, 0)" },
    { x: width * 0.78, y: height * 0.58, radius: radius * 0.82, phase: 2.1, speed: 0.13, driftX: width * 0.06, driftY: height * 0.08, innerColor: "rgba(101, 59, 176, 0.05)", outerColor: "rgba(101, 59, 176, 0)" },
    { x: width * 0.48, y: height * 0.72, radius: radius * 0.7, phase: 4.2, speed: 0.16, driftX: width * 0.09, driftY: height * 0.04, innerColor: "rgba(213, 153, 57, 0.045)", outerColor: "rgba(213, 153, 57, 0)" },
    { x: width * 0.9, y: height * 0.2, radius: radius * 0.62, phase: 5.5, speed: 0.11, driftX: width * 0.05, driftY: height * 0.07, innerColor: "rgba(54, 107, 189, 0.05)", outerColor: "rgba(54, 107, 189, 0)" },
  ];
  return definitions.map((definition) => {
    const texture = document.createElement("canvas");
    const textureSize = Math.ceil(definition.radius * 2);
    texture.width = textureSize;
    texture.height = textureSize;
    const textureContext = texture.getContext("2d");
    if (textureContext) {
      const gradient = textureContext.createRadialGradient(definition.radius, definition.radius, 0, definition.radius, definition.radius, definition.radius);
      gradient.addColorStop(0, definition.innerColor);
      gradient.addColorStop(1, definition.outerColor);
      textureContext.fillStyle = gradient;
      textureContext.fillRect(0, 0, textureSize, textureSize);
    }
    return { ...definition, texture };
  });
}

function randomMeteorDelay(): number {
  return METEOR_MIN_DELAY + Math.random() * (METEOR_MAX_DELAY - METEOR_MIN_DELAY);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
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
    let nebulae: Nebula[] = [];
    let backgroundGlow: CanvasGradient | null = null;
    let coreGlow: CanvasGradient | null = null;
    let formationFlashGlow: CanvasGradient | null = null;
    let vignette: CanvasGradient | null = null;
    let cursorPosition: { x: number; y: number } | null = null;
    const depthOffsetX = [0, 0, 0];
    const depthOffsetY = [0, 0, 0];
    const cursorOffset = { x: 0, y: 0 };
    const meteors: Meteor[] = Array.from({ length: 2 }, () => ({
      active: false,
      startTime: 0,
      duration: METEOR_DURATION,
      startX: 0,
      startY: 0,
      directionX: 0,
      directionY: 0,
      tailLength: 110,
    }));
    const ripples: Ripple[] = Array.from({ length: RIPPLE_COUNT }, () => ({
      active: false,
      x: 0,
      y: 0,
      startTime: 0,
    }));
    const burstParticles: BurstParticle[] = Array.from({ length: BURST_PARTICLE_COUNT }, () => ({
      active: false,
      x: 0,
      y: 0,
      originX: 0,
      originY: 0,
      velocityX: 0,
      velocityY: 0,
      size: 1,
      startTime: 0,
    }));
    const startTime = performance.now();
    let nextMeteorAt = startTime + randomMeteorDelay();
    let meteorCursor = 0;
    let rippleCursor = 0;
    let rotation = 0;
    let lastRotationTimestamp = startTime;
    let scrollProgress = 0;
    let scrollFrameId: number | null = null;

    const clearInteractiveEffects = () => {
      for (const meteor of meteors) meteor.active = false;
      for (const ripple of ripples) ripple.active = false;
      for (const particle of burstParticles) particle.active = false;
    };

    const spawnMeteor = (timestamp: number): boolean => {
      let meteor: Meteor | undefined;
      for (let index = 0; index < meteors.length; index += 1) {
        const candidate = meteors[(meteorCursor + index) % meteors.length];
        if (!candidate.active) {
          meteor = candidate;
          meteorCursor = (meteorCursor + index + 1) % meteors.length;
          break;
        }
      }
      if (!meteor) return false;

      const directionX = width * (0.24 + Math.random() * 0.2);
      const directionY = height * (0.24 + Math.random() * 0.2);
      meteor.active = true;
      meteor.startTime = timestamp;
      meteor.duration = METEOR_DURATION * (0.85 + Math.random() * 0.3);
      meteor.startX = Math.random() * width * 0.9 - width * 0.15;
      meteor.startY = Math.random() * height * 0.35 - height * 0.18;
      meteor.directionX = directionX;
      meteor.directionY = directionY;
      meteor.tailLength = 90 + Math.random() * 55;
      return true;
    };

    const spawnRipple = (x: number, y: number, timestamp: number) => {
      const rippleIndex = rippleCursor;
      rippleCursor = (rippleCursor + 1) % ripples.length;
      const ripple = ripples[rippleIndex];
      ripple.active = true;
      ripple.x = x;
      ripple.y = y;
      ripple.startTime = timestamp;

      const particleStart = rippleIndex * BURST_PARTICLES_PER_RIPPLE;
      for (let index = 0; index < BURST_PARTICLES_PER_RIPPLE; index += 1) {
        const particle = burstParticles[particleStart + index];
        const angle = (index / BURST_PARTICLES_PER_RIPPLE) * TAU + (Math.random() - 0.5) * 0.18;
        const speed = 45 + Math.random() * 70;
        particle.active = true;
        particle.originX = x;
        particle.originY = y;
        particle.x = x;
        particle.y = y;
        particle.velocityX = Math.cos(angle) * speed;
        particle.velocityY = Math.sin(angle) * speed;
        particle.size = 1 + Math.random() * 2;
        particle.startTime = timestamp;
      }
    };

    const draw = (timestamp: number) => {
      if (width < 1 || height < 1 || !backgroundGlow || !vignette) return;
      context.clearRect(0, 0, width, height);
      context.fillStyle = backgroundGlow;
      context.fillRect(0, 0, width, height);

      const motionEnabled = !motionQuery.matches;
      const elapsed = timestamp - startTime;
      const centerX = width * 0.7;
      const centerY = Math.min(height * 0.5, Math.min(height, window.innerHeight) * 0.5);

      if (motionEnabled) {
        const delta = clamp(timestamp - lastRotationTimestamp, 0, 100);
        lastRotationTimestamp = timestamp;
        if (timestamp - startTime >= INTRO_DURATION) {
          const scrollEase = scrollProgress * scrollProgress * (3 - 2 * scrollProgress);
          const speedMultiplier = 1 + scrollEase * 2;
          rotation -= (delta / 1000) * (Math.PI / 180) * BASE_ROTATION_DEGREES_PER_SECOND * speedMultiplier;
        }
      } else {
        lastRotationTimestamp = timestamp;
      }

      if (motionEnabled) {
        const nebulaTime = (timestamp - startTime) / 1000;
        for (const nebula of nebulae) {
          const nebulaX = nebula.x + Math.sin(nebulaTime * nebula.speed + nebula.phase) * nebula.driftX;
          const nebulaY = nebula.y + Math.cos(nebulaTime * nebula.speed * 0.83 + nebula.phase) * nebula.driftY;
          context.drawImage(nebula.texture, nebulaX - nebula.radius, nebulaY - nebula.radius);
        }

        const pulse = 0.5 + Math.sin((timestamp - startTime) / 1000 * (TAU / 6)) * 0.5;
        if (coreGlow) {
          context.globalAlpha = 0.2 + pulse * 0.22;
          context.fillStyle = coreGlow;
          context.fillRect(0, 0, width, height);
          context.globalAlpha = 1;
        }
      }

      const scrollEase = scrollProgress * scrollProgress * (3 - 2 * scrollProgress);
      const spiralScale = motionEnabled ? 1 + scrollEase * 0.15 : 1;
      context.save();
      context.translate(centerX, centerY);
      context.rotate(motionEnabled ? rotation : 0);
      context.scale(spiralScale, spiralScale);
      context.translate(-centerX, -centerY);

      const pointerX = cursorPosition ? (cursorPosition.x - centerX) / Math.max(1, width) : 0;
      const pointerY = cursorPosition ? (cursorPosition.y - centerY) / Math.max(1, height) : 0;
      for (let layer = 0; layer < 3; layer += 1) {
        const targetX = motionEnabled ? pointerX * width * 0.12 * DEPTH_PARALLAX_STRENGTH[layer] : 0;
        const targetY = motionEnabled ? pointerY * height * 0.12 * DEPTH_PARALLAX_STRENGTH[layer] : 0;
        depthOffsetX[layer] += (targetX - depthOffsetX[layer]) * 0.08;
        depthOffsetY[layer] += (targetY - depthOffsetY[layer]) * 0.08;
      }

      for (const star of stars) {
        const formation = motionEnabled
          ? getStarFormationProgress(elapsed, star.formationDelay, star.formationDuration)
          : 1;
        const remainingSpiral = star.spiralOffset * (1 - formation);
        const targetOffsetX = star.targetX - centerX;
        const targetOffsetY = star.targetY - centerY;
        const arcTargetX = centerX + targetOffsetX * Math.cos(remainingSpiral) - targetOffsetY * Math.sin(remainingSpiral);
        const arcTargetY = centerY + targetOffsetX * Math.sin(remainingSpiral) + targetOffsetY * Math.cos(remainingSpiral);
        const baseX = star.x + (arcTargetX - star.x) * formation;
        const baseY = star.y + (arcTargetY - star.y) * formation;
        if (cursorPosition && motionEnabled) {
          getStarCursorOffset(baseX, baseY, cursorPosition.x, cursorPosition.y, 190, 14 + star.size * 0.7, cursorOffset);
        } else {
          cursorOffset.x = 0;
          cursorOffset.y = 0;
        }
        star.cursorOffsetX += (cursorOffset.x - star.cursorOffsetX) * 0.16;
        star.cursorOffsetY += (cursorOffset.y - star.cursorOffsetY) * 0.16;
        const x = baseX + depthOffsetX[star.depthLayer] + star.cursorOffsetX;
        const y = baseY + depthOffsetY[star.depthLayer] + star.cursorOffsetY;
        const twinkle = motionEnabled ? getStarTwinkle(timestamp, star.speed, star.phase) : 1;
        context.globalAlpha = star.opacity * (0.15 + formation * 0.85) * twinkle;
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

      if (motionEnabled) {
        if (formationFlashGlow && elapsed >= INTRO_DURATION && elapsed < INTRO_DURATION + FORMATION_FLASH_DURATION) {
          const flashProgress = (elapsed - INTRO_DURATION) / FORMATION_FLASH_DURATION;
          context.globalAlpha = Math.sin(flashProgress * Math.PI);
          context.fillStyle = formationFlashGlow;
          context.fillRect(0, 0, width, height);
          context.globalAlpha = 1;
        }

        if (timestamp >= nextMeteorAt) {
          nextMeteorAt = timestamp + (spawnMeteor(timestamp) ? randomMeteorDelay() : 500);
        }
        for (const meteor of meteors) {
          if (!meteor.active) continue;
          const progress = (timestamp - meteor.startTime) / meteor.duration;
          if (progress >= 1) {
            meteor.active = false;
            continue;
          }
          const easedProgress = 1 - (1 - progress) ** 3;
          const headX = meteor.startX + meteor.directionX * easedProgress;
          const headY = meteor.startY + meteor.directionY * easedProgress;
          const directionLength = Math.hypot(meteor.directionX, meteor.directionY);
          const tailX = headX - (meteor.directionX / directionLength) * meteor.tailLength;
          const tailY = headY - (meteor.directionY / directionLength) * meteor.tailLength;
          const meteorGradient = context.createLinearGradient(tailX, tailY, headX, headY);
          meteorGradient.addColorStop(0, "rgba(255, 214, 126, 0)");
          meteorGradient.addColorStop(0.7, "rgba(255, 214, 126, 0.3)");
          meteorGradient.addColorStop(1, "rgba(255, 246, 211, 0.95)");
          context.save();
          context.globalAlpha = 1 - progress * 0.35;
          context.strokeStyle = meteorGradient;
          context.lineWidth = 2;
          context.lineCap = "round";
          context.beginPath();
          context.moveTo(tailX, tailY);
          context.lineTo(headX, headY);
          context.stroke();
          context.restore();
        }

        for (const ripple of ripples) {
          if (!ripple.active) continue;
          const progress = (timestamp - ripple.startTime) / RIPPLE_DURATION;
          if (progress >= 1) {
            ripple.active = false;
            continue;
          }
          context.save();
          context.globalAlpha = (1 - progress) * 0.75;
          context.strokeStyle = "rgba(241, 190, 89, 0.95)";
          context.lineWidth = 1.5 + (1 - progress);
          context.beginPath();
          context.arc(ripple.x, ripple.y, 12 + progress * 105, 0, TAU);
          context.stroke();
          context.restore();
        }

        for (const particle of burstParticles) {
          if (!particle.active) continue;
          const progress = (timestamp - particle.startTime) / RIPPLE_DURATION;
          if (progress >= 1) {
            particle.active = false;
            continue;
          }
          particle.x = particle.originX + particle.velocityX * progress * 0.8;
          particle.y = particle.originY + particle.velocityY * progress * 0.8;
          context.globalAlpha = (1 - progress) * 0.9;
          context.fillStyle = "#f1be59";
          context.beginPath();
          context.arc(particle.x, particle.y, particle.size * (1 - progress * 0.35), 0, TAU);
          context.fill();
        }
        context.globalAlpha = 1;
      }

      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);
    };

    const updateScrollResponse = () => {
      scrollFrameId = null;
      if (motionQuery.matches) {
        scrollProgress = 0;
        return;
      }
      const bounds = canvas.getBoundingClientRect();
      scrollProgress = clamp(-bounds.top / Math.max(1, bounds.height), 0, 1);
    };

    const onScroll = () => {
      if (scrollFrameId !== null) return;
      scrollFrameId = window.requestAnimationFrame(updateScrollResponse);
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
      backgroundGlow = context.createRadialGradient(width * 0.5, height * 0.5, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.65);
      backgroundGlow.addColorStop(0, "rgba(18, 30, 55, 0)");
      backgroundGlow.addColorStop(0.72, "rgba(18, 30, 55, 0.025)");
      backgroundGlow.addColorStop(1, "rgba(35, 60, 100, 0.08)");
      const coreCenterY = Math.min(height * 0.5, Math.min(height, window.innerHeight) * 0.5);
      coreGlow = context.createRadialGradient(width * 0.7, coreCenterY, 0, width * 0.7, coreCenterY, Math.max(width, height) * 0.2);
      coreGlow.addColorStop(0, "rgba(255, 220, 142, 0.9)");
      coreGlow.addColorStop(0.25, "rgba(231, 174, 72, 0.32)");
      coreGlow.addColorStop(1, "rgba(231, 174, 72, 0)");
      formationFlashGlow = context.createRadialGradient(width * 0.7, coreCenterY, 0, width * 0.7, coreCenterY, Math.max(width, height) * 0.24);
      formationFlashGlow.addColorStop(0, "rgba(255, 240, 190, 0.9)");
      formationFlashGlow.addColorStop(0.16, "rgba(255, 203, 104, 0.52)");
      formationFlashGlow.addColorStop(1, "rgba(255, 180, 60, 0)");
      vignette = context.createLinearGradient(0, 0, 0, height);
      vignette.addColorStop(0, "rgba(0, 0, 0, 0.22)");
      vignette.addColorStop(0.16, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(0.84, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.24)");
      stars = createStars(width, height);
      nebulae = createNebulae(width, height);
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
        scrollProgress = 0;
        clearInteractiveEffects();
      } else {
        nextMeteorAt = performance.now() + randomMeteorDelay();
      }
      lastRotationTimestamp = performance.now();
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
    const onPointerDown = (event: PointerEvent) => {
      if (motionQuery.matches || event.button !== 0) return;
      const position = getCursorPosition(event.clientX, event.clientY, canvas.getBoundingClientRect());
      if (position) spawnRipple(position.x, position.y, performance.now());
    };
    const observer = new ResizeObserver(resizeAndPaint);

    resizeAndPaint();
    updateScrollResponse();
    observer.observe(canvas);
    window.addEventListener("resize", resizeAndPaint);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    motionQuery.addEventListener("change", onMotionChange);
    animationLoop.start();

    return () => {
      animationLoop.stop();
      if (scrollFrameId !== null) window.cancelAnimationFrame(scrollFrameId);
      observer.disconnect();
      window.removeEventListener("resize", resizeAndPaint);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
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

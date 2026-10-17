"use client";

import { useEffect, useRef } from "react";
import { createAnimationLoop } from "./animation-loop";
import { getCursorPosition, getStarCursorOffset, getStarFormationProgress, getStarFormationTiming, getStarTwinkle } from "./starfield-animation";

type Star = {
  x: number;
  y: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  normalizedRadius: number;
  isCore: boolean;
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

type BackgroundStar = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  phase: number;
};

type AccretionParticle = {
  phase: number;
  duration: number;
  arm: number;
  angularOffset: number;
  size: number;
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
const BACKGROUND_STAR_COUNT = 150;
const ACCRETION_PARTICLE_COUNT = 120;
const CORE_IGNITION_AT = 2_000;
const ARMS_COMPLETE_AT = 7_000;
const INTRO_DURATION = 8_000;
const COMPLETION_FLASH_DURATION = 750;
const SHOCKWAVE_DURATION = 1_200;
const BASE_ROTATION_DEGREES_PER_SECOND = 4;
const METEOR_MIN_DELAY = 7_000;
const METEOR_MAX_DELAY = 12_000;
const METEOR_DURATION = 1_800;
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
    const formation = getStarFormationTiming(normalizedRadius, inCore);
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      currentX: 0,
      currentY: 0,
      targetX: centerX + Math.cos(angle) * radius * 1.45,
      targetY: centerY + Math.sin(angle) * radius * 0.78,
      normalizedRadius,
      isCore: inCore,
      formationDelay: formation.delayMs + Math.random() * (inCore ? 100 : 200),
      formationDuration: formation.durationMs + Math.random() * 150,
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
    { x: width * 0.36, y: height * 0.34, radius, phase: 0.4, speed: 0.028, driftX: width * 0.055, driftY: height * 0.04, innerColor: "rgba(139, 92, 246, 0.055)", outerColor: "rgba(139, 92, 246, 0)" },
    { x: width * 0.76, y: height * 0.58, radius: radius * 0.86, phase: 2.1, speed: 0.022, driftX: width * 0.045, driftY: height * 0.055, innerColor: "rgba(45, 212, 191, 0.05)", outerColor: "rgba(45, 212, 191, 0)" },
    { x: width * 0.52, y: height * 0.82, radius: radius * 0.78, phase: 4.2, speed: 0.025, driftX: width * 0.06, driftY: height * 0.035, innerColor: "rgba(244, 114, 182, 0.045)", outerColor: "rgba(244, 114, 182, 0)" },
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

function createBackgroundStars(width: number, height: number): BackgroundStar[] {
  return Array.from({ length: BACKGROUND_STAR_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 0.45 + Math.random() * 0.9,
    opacity: 0.3 + Math.random() * 0.2,
    color: Math.random() > 0.72 ? "#b8d4f0" : "#f5f2ea",
    phase: Math.random() * TAU,
  }));
}

function createAccretionParticles(): AccretionParticle[] {
  return Array.from({ length: ACCRETION_PARTICLE_COUNT }, (_, index) => ({
    phase: Math.random(),
    duration: 4_500 + Math.random() * 2_500,
    arm: index % 2 === 0 ? 0 : Math.PI,
    angularOffset: (Math.random() - 0.5) * 0.3,
    size: 0.7 + Math.random() * 1.4,
  }));
}

function randomMeteorDelay(): number {
  return METEOR_MIN_DELAY + Math.random() * (METEOR_MAX_DELAY - METEOR_MIN_DELAY);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(value: number): number {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - 2 * progress);
}

export default function HeroSculptureCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const grainCanvas = document.createElement("canvas");
    grainCanvas.width = 128;
    grainCanvas.height = 128;
    const grainContext = grainCanvas.getContext("2d");
    if (!grainContext) return;
    const grainImage = grainContext.createImageData(grainCanvas.width, grainCanvas.height);
    for (let index = 0; index < grainImage.data.length; index += 4) {
      const shade = 96 + Math.floor(Math.random() * 160);
      grainImage.data[index] = shade;
      grainImage.data[index + 1] = shade;
      grainImage.data[index + 2] = shade;
      grainImage.data[index + 3] = 255;
    }
    grainContext.putImageData(grainImage, 0, 0);
    const grainPattern = context.createPattern(grainCanvas, "repeat");
    const grainTransform = new DOMMatrix();
    const cometCanvas = document.createElement("canvas");
    cometCanvas.width = 256;
    cometCanvas.height = 12;
    const cometContext = cometCanvas.getContext("2d");
    const cometGradient = cometContext?.createLinearGradient(0, 0, cometCanvas.width, 0);
    if (cometContext && cometGradient) {
      cometGradient.addColorStop(0, "rgba(255, 205, 116, 0)");
      cometGradient.addColorStop(0.55, "rgba(255, 205, 116, 0.16)");
      cometGradient.addColorStop(0.88, "rgba(255, 227, 170, 0.58)");
      cometGradient.addColorStop(1, "rgba(255, 250, 232, 0.92)");
      cometContext.fillStyle = cometGradient;
      cometContext.fillRect(0, 0, cometCanvas.width, cometCanvas.height);
    }

    let width = 0;
    let height = 0;
    let radiusLimit = 0;
    let pixelRatio = 1;
    let stars: Star[] = [];
    let backgroundStars: BackgroundStar[] = [];
    let accretionParticles: AccretionParticle[] = [];
    let nebulae: Nebula[] = [];
    let backgroundGlow: CanvasGradient | null = null;
    let coolCoreGlow: CanvasGradient | null = null;
    let coreGlow: CanvasGradient | null = null;
    let ignitionGlow: CanvasGradient | null = null;
    let formationFlashGlow: CanvasGradient | null = null;
    let vignette: CanvasGradient | null = null;
    let coreTexture: HTMLCanvasElement | null = null;
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
    let nextMeteorAt = startTime + INTRO_DURATION + randomMeteorDelay();
    let meteorCursor = 0;
    let rippleCursor = 0;
    let flareStarIndex = -1;
    let flareStartedAt = 0;
    let nextFlareAt = startTime + INTRO_DURATION + 2_000 + Math.random() * 2_000;
    let rotation = 0;
    let lastRotationTimestamp = startTime;
    let lastGrainFrame = -1;
    let scrollProgress = 0;
    let scrollFrameId: number | null = null;

    const clearInteractiveEffects = () => {
      for (const meteor of meteors) meteor.active = false;
      for (const ripple of ripples) ripple.active = false;
      for (const particle of burstParticles) particle.active = false;
    };

    const spawnMeteor = (timestamp: number): boolean => {
      if (meteors.some((meteor) => meteor.active)) return false;
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
      meteor.tailLength = 190 + Math.random() * 110;
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
      const elapsed = Math.max(0, timestamp - startTime);
      const centerX = width * 0.7;
      const centerY = Math.min(height * 0.5, Math.min(height, window.innerHeight) * 0.5);
      const scrollEase = smoothstep(scrollProgress);
      const pointerX = cursorPosition ? (cursorPosition.x - centerX) / Math.max(1, width) : 0;
      const pointerY = cursorPosition ? (cursorPosition.y - centerY) / Math.max(1, height) : 0;

      if (motionEnabled) {
        const delta = clamp(timestamp - lastRotationTimestamp, 0, 100);
        lastRotationTimestamp = timestamp;
        if (elapsed >= INTRO_DURATION) {
          const speedMultiplier = 1 + scrollEase * 2;
          rotation -= (delta / 1000) * (Math.PI / 180) * BASE_ROTATION_DEGREES_PER_SECOND * speedMultiplier;
        }
      } else {
        lastRotationTimestamp = timestamp;
      }

      const backgroundParallaxX = motionEnabled ? pointerX * width * 0.018 : 0;
      const backgroundParallaxY = motionEnabled ? pointerY * height * 0.018 : 0;
      const backgroundTime = elapsed / 1000;
      for (const star of backgroundStars) {
        const drift = motionEnabled ? Math.sin(backgroundTime * 0.08 + star.phase) * 1.5 : 0;
        const twinkle = motionEnabled ? 0.82 + Math.sin(backgroundTime * 0.35 + star.phase) * 0.18 : 1;
        context.globalAlpha = star.opacity * twinkle;
        context.fillStyle = star.color;
        context.fillRect(star.x + backgroundParallaxX + drift, star.y + backgroundParallaxY, star.size, star.size);
      }
      context.globalAlpha = 1;

      if (motionEnabled) {
        for (const nebula of nebulae) {
          const nebulaX = nebula.x + Math.sin(backgroundTime * nebula.speed + nebula.phase) * nebula.driftX;
          const nebulaY = nebula.y + Math.cos(backgroundTime * nebula.speed * 0.83 + nebula.phase) * nebula.driftY;
          context.drawImage(nebula.texture, nebulaX - nebula.radius, nebulaY - nebula.radius);
        }
      } else {
        for (const nebula of nebulae) {
          context.drawImage(nebula.texture, nebula.x - nebula.radius, nebula.y - nebula.radius);
        }
      }

      const corePulse = motionEnabled ? 0.5 + Math.sin(backgroundTime * (TAU / 8)) * 0.5 : 0.5;
      const coreVisibility = motionEnabled ? smoothstep((elapsed - CORE_IGNITION_AT) / 700) : 1;
      if (coolCoreGlow && coreGlow && coreVisibility > 0) {
        context.globalAlpha = coreVisibility * (0.12 + corePulse * 0.1);
        context.fillStyle = coolCoreGlow;
        context.fillRect(0, 0, width, height);
        context.globalAlpha = coreVisibility * (0.13 + corePulse * 0.12);
        context.fillStyle = coreGlow;
        context.fillRect(0, 0, width, height);
        context.globalAlpha = 1;
      }

      if (coreTexture && coreVisibility > 0) {
        const coreSize = Math.max(110, Math.min(width, height) * 0.62);
        const coreAngle = motionEnabled ? Math.max(0, elapsed - INTRO_DURATION) * 0.000035 : 0;
        context.save();
        context.globalCompositeOperation = "lighter";
        context.globalAlpha = coreVisibility * (0.18 + corePulse * 0.08);
        context.translate(centerX, centerY);
        context.rotate(coreAngle);
        context.drawImage(coreTexture, -coreSize / 2, -coreSize / 2, coreSize, coreSize);
        context.restore();
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
      }

      if (motionEnabled && ignitionGlow && elapsed >= CORE_IGNITION_AT && elapsed < CORE_IGNITION_AT + 900) {
        const ignitionProgress = (elapsed - CORE_IGNITION_AT) / 900;
        context.globalAlpha = Math.sin(ignitionProgress * Math.PI) * 0.32;
        context.fillStyle = ignitionGlow;
        context.fillRect(0, 0, width, height);
        context.globalAlpha = 1;
      }

      const spiralScale = motionEnabled ? 1 + scrollEase * 0.15 : 1;
      context.save();
      context.translate(centerX, centerY);
      context.rotate(motionEnabled ? rotation : 0);
      context.scale(spiralScale, spiralScale);
      context.translate(-centerX, -centerY);

      for (let layer = 0; layer < 3; layer += 1) {
        const targetX = motionEnabled ? pointerX * width * 0.12 * DEPTH_PARALLAX_STRENGTH[layer] : 0;
        const targetY = motionEnabled ? pointerY * height * 0.12 * DEPTH_PARALLAX_STRENGTH[layer] : 0;
        depthOffsetX[layer] += (targetX - depthOffsetX[layer]) * 0.08;
        depthOffsetY[layer] += (targetY - depthOffsetY[layer]) * 0.08;
      }

      const completionBoost = motionEnabled && elapsed >= ARMS_COMPLETE_AT && elapsed < INTRO_DURATION
        ? 1 + (1 - (elapsed - ARMS_COMPLETE_AT) / (INTRO_DURATION - ARMS_COMPLETE_AT)) * 0.2
        : 1;
      for (let index = 0; index < stars.length; index += 1) {
        const star = stars[index];
        const formation = motionEnabled
          ? getStarFormationProgress(elapsed, star.formationDelay, star.formationDuration)
          : 1;
        const remainingSpiral = star.spiralOffset * (1 - formation);
        const targetOffsetX = star.targetX - centerX;
        const targetOffsetY = star.targetY - centerY;
        const arcTargetX = centerX + targetOffsetX * Math.cos(remainingSpiral) - targetOffsetY * Math.sin(remainingSpiral);
        const arcTargetY = centerY + targetOffsetX * Math.sin(remainingSpiral) + targetOffsetY * Math.cos(remainingSpiral);
        const driftAmount = (1 - formation) * 4;
        const scatteredX = star.x + (motionEnabled ? Math.sin(backgroundTime * 0.32 + star.phase) * driftAmount : 0);
        const scatteredY = star.y + (motionEnabled ? Math.cos(backgroundTime * 0.29 + star.phase) * driftAmount : 0);
        const baseX = scatteredX + (arcTargetX - scatteredX) * formation;
        const baseY = scatteredY + (arcTargetY - scatteredY) * formation;
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
        star.currentX = x;
        star.currentY = y;
        const twinkle = motionEnabled ? getStarTwinkle(timestamp, star.speed, star.phase) : 1;
        context.globalAlpha = star.opacity * (0.1 + formation * 0.9) * twinkle * completionBoost;
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

        const lockAge = elapsed - star.formationDelay - star.formationDuration;
        if (motionEnabled && lockAge >= 0 && lockAge < 420) {
          const travelX = arcTargetX - star.x;
          const travelY = arcTargetY - star.y;
          const travelLength = Math.max(1, Math.hypot(travelX, travelY));
          const trailLength = 3 + star.size * 1.5;
          context.globalAlpha = (1 - lockAge / 420) * 0.55;
          context.strokeStyle = star.color;
          context.lineWidth = Math.max(0.6, star.size * 0.12);
          context.beginPath();
          context.moveTo(x - (travelX / travelLength) * trailLength, y - (travelY / travelLength) * trailLength);
          context.lineTo(x, y);
          context.stroke();
          context.globalAlpha = (1 - lockAge / 420) * 0.75;
          context.beginPath();
          context.arc(x, y, Math.max(1, star.size * 0.42), 0, TAU);
          context.fill();
        }
      }

      if (motionEnabled && elapsed >= nextFlareAt && stars.length > 0) {
        flareStarIndex = Math.floor(Math.random() * stars.length);
        flareStartedAt = timestamp;
        nextFlareAt = timestamp + 2_000 + Math.random() * 2_000;
      }
      if (motionEnabled && flareStarIndex >= 0) {
        const flareProgress = (timestamp - flareStartedAt) / 600;
        if (flareProgress >= 1) {
          flareStarIndex = -1;
        } else if (flareProgress >= 0) {
          const flare = stars[flareStarIndex];
          const flareStrength = Math.sin(flareProgress * Math.PI);
          context.globalAlpha = flareStrength * flare.opacity * 1.5;
          context.fillStyle = "#fff1c8";
          context.shadowColor = "#ffd27a";
          context.shadowBlur = 12;
          context.beginPath();
          context.arc(flare.currentX, flare.currentY, flare.size * 1.25, 0, TAU);
          context.fill();
          context.globalAlpha *= 0.72;
          context.beginPath();
          context.moveTo(flare.currentX - flare.size * 3, flare.currentY);
          context.lineTo(flare.currentX + flare.size * 3, flare.currentY);
          context.moveTo(flare.currentX, flare.currentY - flare.size * 3);
          context.lineTo(flare.currentX, flare.currentY + flare.size * 3);
          context.strokeStyle = "#fff1c8";
          context.lineWidth = Math.max(0.7, flare.size * 0.16);
          context.stroke();
          context.shadowBlur = 0;
        }
      }

      if (motionEnabled && elapsed >= INTRO_DURATION && accretionParticles.length > 0) {
        context.globalCompositeOperation = "lighter";
        context.shadowColor = "#e8b96a";
        context.shadowBlur = 5;
        for (const particle of accretionParticles) {
          const progress = ((elapsed - INTRO_DURATION) / particle.duration + particle.phase) % 1;
          const radiusProgress = 0.05 + (1 - progress) * 0.9;
          const particleRadius = radiusLimit * radiusProgress;
          const angle = particle.arm + Math.log(Math.max(radiusProgress, 0.025)) * 1.65 + particle.angularOffset;
          const particleX = centerX + Math.cos(angle) * particleRadius * 1.45;
          const particleY = centerY + Math.sin(angle) * particleRadius * 0.78;
          const fadeAtCore = smoothstep((radiusProgress - 0.06) / 0.2);
          const fadeAtLoop = 1 - smoothstep((progress - 0.9) / 0.1);
          context.globalAlpha = fadeAtCore * fadeAtLoop * 0.62;
          context.fillStyle = "#f6d28f";
          context.beginPath();
          context.arc(particleX, particleY, particle.size, 0, TAU);
          context.fill();
        }
        context.shadowBlur = 0;
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
      }

      context.restore();
      context.globalAlpha = 1;

      if (motionEnabled) {
        if (formationFlashGlow && elapsed >= ARMS_COMPLETE_AT && elapsed < ARMS_COMPLETE_AT + COMPLETION_FLASH_DURATION) {
          const flashProgress = (elapsed - ARMS_COMPLETE_AT) / COMPLETION_FLASH_DURATION;
          context.globalAlpha = Math.sin(flashProgress * Math.PI) * 0.62;
          context.fillStyle = formationFlashGlow;
          context.fillRect(0, 0, width, height);
          context.globalAlpha = 1;
        }

        const shockwaveProgress = (elapsed - ARMS_COMPLETE_AT) / SHOCKWAVE_DURATION;
        if (shockwaveProgress >= 0 && shockwaveProgress < 1) {
          context.save();
          context.globalCompositeOperation = "lighter";
          context.globalAlpha = (1 - shockwaveProgress) * 0.72;
          context.strokeStyle = "rgba(255, 221, 155, 0.9)";
          context.shadowColor = "#f3bd68";
          context.shadowBlur = 13;
          context.lineWidth = 2 - shockwaveProgress;
          context.beginPath();
          context.arc(centerX, centerY, 12 + shockwaveProgress * Math.max(width, height) * 0.58, 0, TAU);
          context.stroke();
          context.restore();
        }

        if (timestamp >= nextMeteorAt) {
          nextMeteorAt = timestamp + (spawnMeteor(timestamp) ? randomMeteorDelay() : 1_000);
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
          context.save();
          context.globalCompositeOperation = "lighter";
          context.globalAlpha = (1 - progress * 0.35) * 0.9;
          context.translate(tailX, tailY);
          context.rotate(Math.atan2(meteor.directionY, meteor.directionX));
          if (cometCanvas.width > 0) {
            context.drawImage(cometCanvas, 0, -8, meteor.tailLength, 16);
          }
          context.shadowColor = "#ffe6b3";
          context.shadowBlur = 16;
          context.fillStyle = "#fff8e8";
          context.beginPath();
          context.arc(meteor.tailLength, 0, 2.4, 0, TAU);
          context.fill();
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
      if (grainPattern) {
        if (motionEnabled) {
          const grainFrame = Math.floor(timestamp / 120);
          if (grainFrame !== lastGrainFrame) {
            lastGrainFrame = grainFrame;
            grainTransform.e = (grainFrame % 8) * 16;
            grainTransform.f = (grainFrame % 5) * 16;
            grainPattern.setTransform(grainTransform);
          }
        }
        context.globalAlpha = 0.02;
        context.globalCompositeOperation = "soft-light";
        context.fillStyle = grainPattern;
        context.fillRect(0, 0, width, height);
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
      }
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
      radiusLimit = Math.min(Math.min(height, window.innerHeight) * 0.58, width * 0.38);
      pixelRatio = nextPixelRatio;
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      backgroundGlow = context.createLinearGradient(0, 0, 0, height);
      backgroundGlow.addColorStop(0, "#0a0e1f");
      backgroundGlow.addColorStop(0.56, "#070a16");
      backgroundGlow.addColorStop(1, "#03040a");
      const coreCenterY = Math.min(height * 0.5, Math.min(height, window.innerHeight) * 0.5);
      coolCoreGlow = context.createRadialGradient(width * 0.7, coreCenterY, 0, width * 0.7, coreCenterY, Math.max(width, height) * 0.38);
      coolCoreGlow.addColorStop(0, "rgba(132, 164, 255, 0.14)");
      coolCoreGlow.addColorStop(0.36, "rgba(97, 120, 219, 0.08)");
      coolCoreGlow.addColorStop(1, "rgba(97, 120, 219, 0)");
      coreGlow = context.createRadialGradient(width * 0.7, coreCenterY, 0, width * 0.7, coreCenterY, Math.max(width, height) * 0.18);
      coreGlow.addColorStop(0, "rgba(255, 231, 171, 0.8)");
      coreGlow.addColorStop(0.2, "rgba(231, 174, 72, 0.28)");
      coreGlow.addColorStop(1, "rgba(231, 174, 72, 0)");
      ignitionGlow = context.createRadialGradient(width * 0.7, coreCenterY, 0, width * 0.7, coreCenterY, Math.max(width, height) * 0.3);
      ignitionGlow.addColorStop(0, "rgba(255, 248, 221, 0.95)");
      ignitionGlow.addColorStop(0.12, "rgba(255, 211, 123, 0.7)");
      ignitionGlow.addColorStop(1, "rgba(255, 180, 60, 0)");
      formationFlashGlow = context.createRadialGradient(width * 0.7, coreCenterY, 0, width * 0.7, coreCenterY, Math.max(width, height) * 0.24);
      formationFlashGlow.addColorStop(0, "rgba(255, 240, 190, 0.9)");
      formationFlashGlow.addColorStop(0.16, "rgba(255, 203, 104, 0.52)");
      formationFlashGlow.addColorStop(1, "rgba(255, 180, 60, 0)");
      coreTexture = document.createElement("canvas");
      coreTexture.width = 256;
      coreTexture.height = 256;
      const coreTextureContext = coreTexture.getContext("2d");
      if (coreTextureContext) {
        const coreTextureGlow = coreTextureContext.createRadialGradient(128, 128, 0, 128, 128, 128);
        coreTextureGlow.addColorStop(0, "rgba(255, 244, 205, 0.8)");
        coreTextureGlow.addColorStop(0.12, "rgba(255, 206, 118, 0.3)");
        coreTextureGlow.addColorStop(0.52, "rgba(98, 132, 232, 0.08)");
        coreTextureGlow.addColorStop(1, "rgba(98, 132, 232, 0)");
        coreTextureContext.fillStyle = coreTextureGlow;
        coreTextureContext.fillRect(0, 0, 256, 256);
        coreTextureContext.lineWidth = 1;
        for (let arm = 0; arm < 2; arm += 1) {
          coreTextureContext.beginPath();
          for (let step = 0; step <= 48; step += 1) {
            const progress = step / 48;
            const radius = progress * 104;
            const angle = arm * Math.PI + Math.log(Math.max(progress, 0.02)) * 1.65;
            const x = 128 + Math.cos(angle) * radius;
            const y = 128 + Math.sin(angle) * radius * 0.78;
            if (step === 0) coreTextureContext.moveTo(x, y);
            else coreTextureContext.lineTo(x, y);
          }
          coreTextureContext.strokeStyle = arm === 0 ? "rgba(255, 220, 151, 0.12)" : "rgba(144, 174, 255, 0.1)";
          coreTextureContext.stroke();
        }
      }
      vignette = context.createLinearGradient(0, 0, 0, height);
      vignette.addColorStop(0, "rgba(0, 0, 0, 0.22)");
      vignette.addColorStop(0.16, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(0.84, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.24)");
      stars = createStars(width, height);
      backgroundStars = createBackgroundStars(width, height);
      accretionParticles = createAccretionParticles();
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
        nextMeteorAt = Math.max(performance.now(), startTime + INTRO_DURATION) + randomMeteorDelay();
        nextFlareAt = Math.max(performance.now(), startTime + INTRO_DURATION) + 2_000 + Math.random() * 2_000;
      }
      lastRotationTimestamp = performance.now();
      if (!document.hidden) draw(performance.now());
      if (motionQuery.matches) animationLoop.pause();
      else animationLoop.wake();
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
    if (!motionQuery.matches) animationLoop.start();

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

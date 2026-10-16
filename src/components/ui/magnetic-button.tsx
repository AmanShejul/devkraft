"use client";

import type { PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

export function MagneticButton({ children, className = "", strength = 0.3 }: { children: ReactNode; className?: string; strength?: number }) {
  const reduceMotion = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 320, damping: 24, mass: 0.35 });
  const y = useSpring(useMotionValue(0), { stiffness: 320, damping: 24, mass: 0.35 });

  function handleMove(event: PointerEvent<HTMLSpanElement>) {
    if (reduceMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - (bounds.left + bounds.width / 2)) * strength);
    y.set((event.clientY - (bounds.top + bounds.height / 2)) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return <motion.span className={`inline-flex ${className}`} style={{ x, y }} onPointerMove={handleMove} onPointerLeave={reset}>{children}</motion.span>;
}

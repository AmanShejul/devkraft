"use client";

import { Children, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

export type RevealVariant = "fade-up" | "fade" | "scale" | "blur-in";

const transitions = {
  spring: { type: "spring" as const, stiffness: 120, damping: 20, mass: 0.8 },
};

const variants: Record<RevealVariant, Variants> = {
  "fade-up": {
    hidden: { opacity: 0, y: 22 },
    visible: { opacity: 1, y: 0, transition: transitions.spring },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: transitions.spring },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: transitions.spring },
  },
  "blur-in": {
    hidden: { opacity: 0, y: 8, filter: "blur(12px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: transitions.spring },
  },
};

const childVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: transitions.spring },
};

export function Reveal({
  children,
  delay = 0,
  className = "",
  variant = "fade-up",
  stagger = 0,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  variant?: RevealVariant;
  /** Stagger interval in seconds. 0.06–0.09 is the intended range. */
  stagger?: number;
}) {
  const reduceMotion = useReducedMotion();
  const items = stagger > 0 ? Children.toArray(children) : [];

  return (
    <motion.div
      className={className}
      variants={{
        hidden: variants[variant].hidden,
        visible: {
          ...variants[variant].visible,
          transition: {
            ...transitions.spring,
            delayChildren: reduceMotion ? 0 : delay,
            staggerChildren: reduceMotion ? 0 : Math.min(0.09, Math.max(0.06, stagger)),
          },
        },
      }}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "visible"}
      animate={reduceMotion ? "visible" : undefined}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -15% 0px" }}
      transition={reduceMotion ? { duration: 0 } : { ...transitions.spring, delay }}
    >
      {stagger > 0
        ? items.map((child, index) => <motion.div key={index} variants={childVariants}>{child}</motion.div>)
        : children}
    </motion.div>
  );
}

export function RevealItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={childVariants}>{children}</motion.div>;
}

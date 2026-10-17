"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type HeadingTag = "h1" | "h2" | "h3" | "p" | "span";

export function SplitReveal({
  children,
  as: Tag = "h1",
  className = "",
  delay = 0,
}: {
  children: string;
  as?: HeadingTag;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const words = children.trim().split(/\s+/);

  return (
    <Tag className={className} aria-label={children}>
      <motion.span
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { delayChildren: reduceMotion ? 0 : delay, staggerChildren: reduceMotion ? 0 : 0.075 } },
        }}
        aria-hidden="true"
      >
        {words.map((word, index) => (
          <Fragment key={`${word}-${index}`}>
            <motion.span
              className="inline-block"
              variants={{
                hidden: { opacity: 0, y: 16, filter: "blur(8px)" },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  transition: { type: "spring", stiffness: 120, damping: 20 },
                },
              }}
            >
              {word}
            </motion.span>
            {index < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </motion.span>
    </Tag>
  );
}

export function AnimatedNumber({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
  format,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  format?: (value: number) => string;
}) {
  const reduceMotion = useReducedMotion();
  const [current, setCurrent] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, reduceMotion, value]);

  const displayedValue = reduceMotion ? value : current;
  const rendered = format ? format(displayedValue) : displayedValue.toFixed(decimals);
  return <span className={className} aria-label={`${prefix}${format ? format(value) : value.toFixed(decimals)}${suffix}`}>{prefix}{rendered}{suffix}</span>;
}

export function GradientText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`bg-gradient-to-r from-[#e8b96a] via-[#f6e4bc] to-[#fffaf0] bg-clip-text text-transparent ${className}`}>{children}</span>;
}

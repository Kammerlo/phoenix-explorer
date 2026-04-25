import { Easing } from "framer-motion";

export const DURATION = {
  instant: 0.1,
  fast: 0.18,
  base: 0.24,
  slow: 0.36,
  pageReveal: 0.4,
  pulse: 2.4
} as const;

export const EASE: Record<"out" | "outExpo" | "inOut" | "linear", Easing> = {
  out: [0.16, 1, 0.3, 1],
  outExpo: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  linear: [0, 0, 1, 1]
};

export const STAGGER = {
  tight: 0.04,
  base: 0.06,
  loose: 0.1
} as const;

export const TRANSLATE = {
  short: 6,
  base: 10,
  long: 18
} as const;

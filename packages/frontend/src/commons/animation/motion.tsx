import { motion, MotionProps, useReducedMotion, Variants } from "framer-motion";
import { CSSProperties, forwardRef, ReactNode } from "react";

import { DURATION, EASE, STAGGER, TRANSLATE } from "./tokens";

type Direction = "up" | "down" | "left" | "right" | "none";

const offsetFor = (direction: Direction, distance: number) => {
  switch (direction) {
    case "up": return { y: distance };
    case "down": return { y: -distance };
    case "left": return { x: distance };
    case "right": return { x: -distance };
    default: return {};
  }
};

interface FadeProps {
  children: ReactNode;
  direction?: Direction;
  distance?: number;
  duration?: number;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "article" | "header" | "main" | "li";
  whileInView?: boolean;
  once?: boolean;
}

export const Fade = forwardRef<HTMLDivElement, FadeProps>(function Fade(
  {
    children,
    direction = "up",
    distance = TRANSLATE.base,
    duration = DURATION.base,
    delay = 0,
    className,
    style,
    as = "div",
    whileInView = false,
    once = true
  },
  ref
) {
  const reduce = useReducedMotion();
  const offset = reduce ? {} : offsetFor(direction, distance);
  const initial = { opacity: 0, ...offset };
  const target = { opacity: 1, x: 0, y: 0 };
  const transition = { duration, ease: EASE.out, delay };
  const Tag = motion[as] as typeof motion.div;

  if (whileInView) {
    return (
      <Tag
        ref={ref}
        initial={initial}
        whileInView={target}
        viewport={{ once, amount: 0.2 }}
        transition={transition}
        className={className}
        style={style}
      >
        {children}
      </Tag>
    );
  }
  return (
    <Tag
      ref={ref}
      initial={initial}
      animate={target}
      transition={transition}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
});

interface StaggerProps {
  children: ReactNode;
  gap?: number;
  initialDelay?: number;
  className?: string;
  style?: CSSProperties;
  whileInView?: boolean;
  once?: boolean;
}

export const Stagger = ({
  children,
  gap = STAGGER.base,
  initialDelay = 0,
  className,
  style,
  whileInView = false,
  once = true
}: StaggerProps) => {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: reduce ? 1 : 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: reduce ? 0 : gap,
        delayChildren: reduce ? 0 : initialDelay
      }
    }
  };
  const animateProps = whileInView
    ? { whileInView: "show", viewport: { once, amount: 0.15 } }
    : { animate: "show" };
  return (
    <motion.div
      initial="hidden"
      variants={variants}
      className={className}
      style={style}
      {...animateProps}
    >
      {children}
    </motion.div>
  );
};

interface StaggerItemProps {
  children: ReactNode;
  direction?: Direction;
  distance?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(function StaggerItem(
  {
    children,
    direction = "up",
    distance = TRANSLATE.short,
    duration = DURATION.base,
    className,
    style
  },
  ref
) {
  const reduce = useReducedMotion();
  const offset = reduce ? {} : offsetFor(direction, distance);
  const variants: Variants = {
    hidden: { opacity: 0, ...offset },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration, ease: EASE.out }
    }
  };
  return (
    <motion.div ref={ref} variants={variants} className={className} style={style}>
      {children}
    </motion.div>
  );
});

interface PageTransitionProps {
  children: ReactNode;
  /**
   * Key the transition off pathname so each route remounts the wrapper.
   */
  routeKey: string;
}

export const PageTransition = ({ children, routeKey }: PageTransitionProps) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={routeKey}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.pageReveal, ease: EASE.out }}
    >
      {children}
    </motion.div>
  );
};

export const motionProps = {
  cardHover: {
    whileHover: { y: -2 },
    transition: { duration: DURATION.fast, ease: EASE.out }
  } satisfies MotionProps,
  rowHover: {
    whileHover: { x: 2 },
    transition: { duration: DURATION.fast, ease: EASE.out }
  } satisfies MotionProps
};

export { DURATION, EASE, STAGGER, TRANSLATE } from "./tokens";

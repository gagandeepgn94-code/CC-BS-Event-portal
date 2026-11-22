"use client";

import React, { ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  HTMLMotionProps,
  Variants,
} from "framer-motion";

export { motion, AnimatePresence, useReducedMotion };

// Smooth editorial spring and cubic-bezier curves (Wispr Flow / Apple style)
export const editorialEase = [0.16, 1, 0.3, 1] as const;

export interface FadeInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
  scale?: number;
  inView?: boolean;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.65,
  yOffset = 36,
  scale = 0.96,
  inView = true,
  className = "",
  ...props
}: FadeInProps) {
  const shouldReduceMotion = useReducedMotion();

  const motionProps = inView
    ? {
        initial: {
          opacity: 0,
          y: shouldReduceMotion ? 0 : yOffset,
          scale: shouldReduceMotion ? 1 : scale,
        },
        whileInView: {
          opacity: 1,
          y: 0,
          scale: 1,
        },
        viewport: { once: true, amount: 0.15 },
      }
    : {
        initial: {
          opacity: 0,
          y: shouldReduceMotion ? 0 : yOffset,
          scale: shouldReduceMotion ? 1 : scale,
        },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
        },
      };

  return (
    <motion.div
      {...motionProps}
      transition={{
        duration: shouldReduceMotion ? 0.2 : duration,
        delay,
        ease: editorialEase,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  staggerDelay?: number;
  delayChildren?: number;
  inView?: boolean;
  className?: string;
}

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  delayChildren = 0,
  inView = true,
  className = "",
  ...props
}: StaggerContainerProps) {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : staggerDelay,
        delayChildren,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      {...(inView ? { whileInView: "show", viewport: { once: true, amount: 0.15 } } : { animate: "show" })}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  yOffset?: number;
}

export function StaggerItem({
  children,
  className = "",
  yOffset = 28,
  ...props
}: StaggerItemProps) {
  const shouldReduceMotion = useReducedMotion();

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : yOffset,
      scale: shouldReduceMotion ? 1 : 0.98,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0.2 : 0.55,
        ease: editorialEase,
      },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 12,
      scale: shouldReduceMotion ? 1 : 0.98,
      transition: { duration: 0.2 },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}

export interface HoverCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  lift?: number;
  scale?: number;
}

export function HoverCard({
  children,
  className = "",
  lift = -8,
  scale = 1.015,
  ...props
}: HoverCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={
        shouldReduceMotion
          ? {}
          : {
              y: lift,
              scale,
              boxShadow: "0 20px 40px -15px rgba(84, 26, 26, 0.12), 0 0 0 1px rgba(212, 168, 67, 0.35)",
            }
      }
      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 20,
      }}
      className={`transition-colors duration-200 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

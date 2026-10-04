"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface BookLoaderProps {
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function BookLoader({ label = "Loading library records...", size = "md" }: BookLoaderProps) {
  const shouldReduceMotion = useReducedMotion();

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }[size];

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className={`relative ${sizeClasses} perspective-500`}>
        {/* Book Spine & Cover Base */}
        <div className="absolute inset-0 rounded-md bg-indigo-700 shadow-md transform rotate-y-[-10deg]" />

        {/* Flipping Pages Animation */}
        {!shouldReduceMotion ? (
          <>
            <motion.div
              className="absolute inset-y-1 left-2 right-1 rounded-r bg-indigo-100 origin-left border-l border-indigo-300"
              animate={{
                rotateY: [0, -180, 0],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0,
              }}
            />
            <motion.div
              className="absolute inset-y-1 left-2 right-1 rounded-r bg-indigo-50 origin-left border-l border-indigo-200"
              animate={{
                rotateY: [0, -180, 0],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.25,
              }}
            />
            <motion.div
              className="absolute inset-y-1 left-2 right-1 rounded-r bg-white origin-left border-l border-indigo-100 shadow-xs"
              animate={{
                rotateY: [0, -180, 0],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
            />
          </>
        ) : (
          <div className="absolute inset-y-1 left-2 right-1 rounded-r bg-white shadow-xs" />
        )}
      </div>

      {label && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs font-semibold tracking-wide text-slate-500 animate-pulse"
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}

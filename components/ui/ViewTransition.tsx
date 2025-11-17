'use client';

import { AnimatePresence, motion } from 'framer-motion';

interface ViewTransitionProps {
  children: React.ReactNode;
  viewKey: string;
  className?: string;
}

const containerVariants = {
  hidden: { 
    opacity: 0,
    y: 12,
    scale: 0.97
  },
  visible: { 
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const, // Smooth cubic-bezier for natural motion
      staggerChildren: 0.04,
      delayChildren: 0.08
    }
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.97,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  }
};

const childVariants = {
  hidden: { 
    opacity: 0,
    y: 12,
    scale: 0.96
  },
  visible: { 
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  }
};

export default function ViewTransition({ children, viewKey, className = '' }: ViewTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={viewKey}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`w-full ${className}`}
      >
        <motion.div variants={childVariants} className="h-full flex flex-col">
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

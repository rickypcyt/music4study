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
    y: 8,
    scale: 0.98
  },
  visible: { 
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.15,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
      staggerChildren: 0.02,
      delayChildren: 0.02
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  }
};

const childVariants = {
  hidden: { 
    opacity: 0,
    y: 6,
    scale: 0.98
  },
  visible: { 
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
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

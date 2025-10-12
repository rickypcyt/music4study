'use client';

import { motion } from 'framer-motion';

interface CombinationCardProps {
  id: number;
  name: string;
  links: number;
  isExpanded: boolean;
  onClick: () => void;
}

export default function CombinationCard({ id, name, links, isExpanded, onClick }: CombinationCardProps) {
  return (
    <motion.div
      layout
      initial={{ borderRadius: 10 }}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer ${
        isExpanded ? 'fixed inset-0 m-4 z-50' : 'h-48'
      }`}
      onClick={onClick}
      style={{
        gridColumn: isExpanded ? '1 / -1' : 'auto',
        gridRow: isExpanded ? '1 / -1' : 'auto',
        position: isExpanded ? 'fixed' : 'relative',
        zIndex: isExpanded ? 50 : 'auto',
        top: isExpanded ? 0 : 'auto',
        left: isExpanded ? 0 : 'auto',
        right: isExpanded ? 0 : 'auto',
        bottom: isExpanded ? 0 : 'auto',
        margin: isExpanded ? '2rem' : '0',
      }}
    >
      <motion.div
        layout
        className={`h-full p-6 flex flex-col items-center justify-center ${
          isExpanded 
            ? 'bg-indigo-600 text-white' 
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <motion.h2 
          className="text-xl font-semibold mb-2 text-center"
          layout="position"
        >
          {name}
        </motion.h2>
        
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-4 text-center"
          >
            <p className="text-2xl font-bold">{links} enlaces</p>
            <button 
              className="mt-4 px-4 py-2 bg-white text-indigo-600 rounded-md font-medium hover:bg-gray-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                // Navegación o acción al hacer clic
              }}
            >
              Ver combinación
            </button>
          </motion.div>
        )}
        
        {!isExpanded && (
          <motion.div
            className="absolute bottom-4 right-4 text-gray-500 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

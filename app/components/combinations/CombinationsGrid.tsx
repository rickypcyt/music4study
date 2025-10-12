'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CombinationCard from './CombinationCard';
import { Link } from '@/app/types';

interface CombinationsGridProps {
  combinations: Array<{
    id: number;
    name: string;
    links: Link[];
  }>;
}

export default function CombinationsGrid({ combinations }: CombinationsGridProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Cerrar el modal al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Tus Combinaciones</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <AnimatePresence>
          {combinations.map((item) => (
            <CombinationCard
              key={item.id}
              id={item.id}
              name={item.name}
              links={item.links.length}
              isExpanded={expandedId === item.id}
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            />
          ))}
        </AnimatePresence>
      </div>
      
      {expandedId !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setExpandedId(null)}
        />
      )}
    </div>
  );
}

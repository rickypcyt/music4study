'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

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

  const closeModal = useCallback(() => {
    setExpandedId(null);
  }, []);

  const toggleCard = useCallback((id: number) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  // Cerrar el modal al presionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedId !== null) {
        closeModal();
      }
    };

    if (expandedId !== null) {
      window.addEventListener('keydown', handleKeyDown);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [expandedId, closeModal]);

  return (
    <>
      <div className="min-h-[calc(100vh-4rem)] p-6 w-full max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            Tus Combinaciones
          </h1>
          {combinations.length > 0 && (
            <p className="text-center text-gray-600 dark:text-gray-400">
              {combinations.length} {combinations.length === 1 ? 'combinación' : 'combinaciones'}
            </p>
          )}
        </div>

        {combinations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-semibold mb-2">No hay combinaciones aún</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Crea tu primera combinación para empezar
            </p>
          </div>
        ) : (
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full"
            role="list"
            aria-label="Lista de combinaciones"
          >
            <AnimatePresence mode="popLayout">
              {combinations.map((item) => (
                <CombinationCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  links={item.links.length}
                  isExpanded={expandedId === item.id}
                  onClick={() => toggleCard(item.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Overlay del modal */}
      <AnimatePresence>
        {expandedId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={closeModal}
            aria-label="Cerrar modal"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                closeModal();
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
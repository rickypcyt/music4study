'use client';

import { ChevronDown, ExternalLink } from 'lucide-react';

import { motion } from 'framer-motion';

interface CombinationCardProps {
  id: number;
  name: string;
  links: number;
  isExpanded: boolean;
  onClick: () => void;
}

export default function CombinationCard({ 
  id,
  name, 
  links, 
  isExpanded, 
  onClick 
}: CombinationCardProps) {
  return (
    <motion.article
      layout
      layoutId={`card-${id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ 
        layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: 0.2 }
      }}
      className={`
        bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden cursor-pointer
        transition-shadow hover:shadow-xl
        ${isExpanded 
          ? 'fixed inset-4 md:inset-8 lg:inset-16 z-50' 
          : 'h-48 relative'
        }
      `}
      onClick={onClick}
      role="button"
      aria-expanded={isExpanded}
      aria-label={`${name}, ${links} ${links === 1 ? 'enlace' : 'enlaces'}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Contenido de la tarjeta */}
      <motion.div
        layout
        className={`
          h-full flex flex-col items-center justify-center p-6
          transition-colors duration-300
          ${isExpanded 
            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white' 
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
          }
        `}
      >
        {/* Título */}
        <motion.h2 
          layout="position"
          className={`
            font-semibold text-center mb-2
            ${isExpanded ? 'text-3xl md:text-4xl' : 'text-xl'}
          `}
        >
          {name}
        </motion.h2>

        {/* Badge de enlaces cuando no está expandido */}
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            <ExternalLink size={16} />
            <span>{links} {links === 1 ? 'enlace' : 'enlaces'}</span>
          </motion.div>
        )}

        {/* Contenido expandido */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="mt-6 text-center w-full max-w-md"
          >
            {/* Contador de enlaces */}
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 mb-6">
              <div className="flex items-center justify-center gap-3">
                <ExternalLink size={32} />
                <div className="text-left">
                  <p className="text-5xl font-bold">{links}</p>
                  <p className="text-lg opacity-90">
                    {links === 1 ? 'enlace' : 'enlaces'}
                  </p>
                </div>
              </div>
            </div>

            {/* Botón de acción */}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="
                w-full px-6 py-3 bg-white text-indigo-600 rounded-lg 
                font-semibold shadow-lg
                hover:bg-gray-50 active:bg-gray-100
                transition-colors duration-200
                flex items-center justify-center gap-2
              "
              onClick={(e) => {
                e.stopPropagation();
                // Navegación o acción al hacer clic
                console.log('Ver combinación:', id);
              }}
              aria-label={`Ver detalles de ${name}`}
            >
              <span>Ver combinación</span>
              <ExternalLink size={18} />
            </motion.button>

            {/* Instrucción de cierre */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 text-sm opacity-75"
            >
              Presiona ESC o haz clic fuera para cerrar
            </motion.p>
          </motion.div>
        )}

        {/* Icono de expansión cuando no está expandido */}
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-4 right-4"
          >
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.5,
                ease: "easeInOut"
              }}
            >
              <ChevronDown 
                size={24} 
                className="text-gray-400 dark:text-gray-500" 
              />
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.article>
  );
}
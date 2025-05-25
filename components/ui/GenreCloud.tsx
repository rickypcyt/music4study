'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';

interface Tag {
  value: string;
  count: number;
}

interface Node {
  id: string;
  value: number;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isHovered?: boolean;
}

interface GenreCloudProps {
  tags: Tag[];
  onGenreClick: (genre: string) => void;
}

export default function GenreCloud({ tags, onGenreClick }: GenreCloudProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeNodes = useCallback(() => {
    if (!containerRef.current) return;

    const width = window.innerWidth * 0.9;
    const height = window.innerWidth < 640 ? 800 : 700;
    const padding = window.innerWidth < 640 ? 10 : 20;

    const min = Math.min(...tags.map(t => t.count));
    const max = Math.max(...tags.map(t => t.count));
    
    const maxTextLength = Math.max(...tags.map(t => t.value.length));
    const minSize = window.innerWidth < 640 
      ? Math.max(40, maxTextLength * 3)
      : Math.max(60, maxTextLength * 4);
    
    const sizeScale = d3.scaleSqrt()
      .domain([min, max])
      .range([minSize, Math.max(minSize * 1.2, window.innerWidth < 640 ? 80 : 100)]);

    const isValidPosition = (x: number, y: number, size: number, existingNodes: Node[]): boolean => {
      if (x - size < 0 || x + size > width || y - size < 0 || y + size > height) {
        return false;
      }

      return !existingNodes.some(node => {
        const dx = x - node.x;
        const dy = y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (size + node.size + padding);
      });
    };

    const findValidPosition = (size: number, existingNodes: Node[]): { x: number; y: number } | null => {
      const maxAttempts = 100;
      for (let i = 0; i < maxAttempts; i++) {
        const x = size + Math.random() * (width - 2 * size);
        const y = size + Math.random() * (height - 2 * size);
        if (isValidPosition(x, y, size, existingNodes)) {
          return { x, y };
        }
      }
      return null;
    };

    const nodes: Node[] = [];
    tags.forEach(tag => {
      const size = sizeScale(tag.count);
      const position = findValidPosition(size, nodes);
      if (position) {
        nodes.push({
          id: tag.value,
          value: tag.count,
          size,
          x: position.x,
          y: position.y,
          vx: (Math.random() - 0.5) * 0.3, // Velocidad inicial reducida
          vy: (Math.random() - 0.5) * 0.3,
        });
      }
    });

    setNodes(nodes);
    setIsInitialized(true);
  }, [tags]);

  useEffect(() => {
    initializeNodes();
  }, [initializeNodes]);

  useEffect(() => {
    if (!isInitialized) return;

    let lastFrameTime = 0;
    const targetFPS = 30; // Reducir a 30 FPS para mejor rendimiento
    const frameInterval = 1000 / targetFPS;

    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
      
      // Limitar la frecuencia de actualización
      if (timestamp - lastFrameTime < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastFrameTime = timestamp;
      const deltaTime = Math.min(timestamp - lastUpdateRef.current, 32);
      lastUpdateRef.current = timestamp;

      setNodes(prevNodes => {
        return prevNodes.map(node => {
          if (node.isHovered) return node;

          // Reducir la complejidad de los cálculos
          let newX = node.x + node.vx * (deltaTime / 16);
          let newY = node.y + node.vy * (deltaTime / 16);
          let newVx = node.vx;
          let newVy = node.vy;

          // Simplificar las colisiones
          if (newX - node.size < 0 || newX + node.size > window.innerWidth * 0.9) {
            newVx = -newVx * 0.8;
            newX = Math.max(node.size, Math.min(window.innerWidth * 0.9 - node.size, newX));
          }
          if (newY - node.size < 0 || newY + node.size > (window.innerWidth < 640 ? 800 : 700)) {
            newVy = -newVy * 0.8;
            newY = Math.max(node.size, Math.min((window.innerWidth < 640 ? 800 : 700) - node.size, newY));
          }

          // Optimizar las colisiones entre burbujas
          const nearbyNodes = prevNodes.filter(otherNode => {
            if (otherNode.id === node.id) return false;
            const dx = newX - otherNode.x;
            const dy = newY - otherNode.y;
            return Math.abs(dx) < node.size + otherNode.size + 50 && 
                   Math.abs(dy) < node.size + otherNode.size + 50;
          });

          for (const otherNode of nearbyNodes) {
            const dx = newX - otherNode.x;
            const dy = newY - otherNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = node.size + otherNode.size + (window.innerWidth < 640 ? 10 : 20);

            if (distance < minDistance) {
              const nx = dx / distance;
              const ny = dy / distance;
              const overlap = (minDistance - distance) * 0.5;

              newX += nx * overlap * 0.5;
              newY += ny * overlap * 0.5;

              const dvx = node.vx - otherNode.vx;
              const dvy = node.vy - otherNode.vy;
              const speed = dvx * nx + dvy * ny;

              if (speed < 0) {
                const bounce = speed * 0.8;
                newVx -= bounce * nx;
                newVy -= bounce * ny;
              }
            }
          }

          // Aumentar la fricción para reducir el movimiento
          newVx *= 0.99;
          newVy *= 0.99;

          return {
            ...node,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy
          };
        });
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitialized]);

  const getFontSize = (count: number) => {
    const min = Math.min(...tags.map(t => t.count));
    const max = Math.max(...tags.map(t => t.count));
    const range = max - min;
    const percentage = (count - min) / range;
    return 0.8 + percentage * 0.8;
  };

  return (
    <div className="flex justify-center items-center w-full overflow-hidden">
      <div 
        ref={containerRef}
        className="w-[90vw] h-[800px] sm:h-[700px] relative overflow-y-auto"
      >
        <div className="min-h-full w-full">
          <AnimatePresence>
            {nodes.map((node) => (
              <motion.button
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 0.9 + (node.value / Math.max(...tags.map(t => t.count))) * 0.1,
                  x: node.x - node.size,
                  y: node.y - node.size
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  mass: 0.5
                }}
                className="
                  absolute rounded-full bg-[#e6e2d9]/20 
                  hover:bg-[#e6e2d9]/30 text-[#e6e2d9]
                  transition-all duration-300 ease-in-out
                  hover:scale-110 flex flex-col items-center justify-center
                  cursor-pointer text-center p-2
                  border border-[#e6e2d9]/10 shadow-lg
                  backdrop-blur-sm
                "
                style={{ 
                  width: `${node.size * 2}px`,
                  height: `${node.size * 2}px`,
                  fontSize: `${getFontSize(node.value)}rem`,
                }}
                onMouseEnter={() => {
                  setNodes(prevNodes => 
                    prevNodes.map(n => 
                      n.id === node.id ? { ...n, isHovered: true } : n
                    )
                  );
                }}
                onMouseLeave={() => {
                  setNodes(prevNodes => 
                    prevNodes.map(n => 
                      n.id === node.id ? { ...n, isHovered: false } : n
                    )
                  );
                }}
                onClick={() => onGenreClick(node.id)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="px-2 sm:px-4 text-sm sm:text-base font-bold">{node.id}</span>
                <span className="text-xs opacity-70 mt-1">{node.value}</span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

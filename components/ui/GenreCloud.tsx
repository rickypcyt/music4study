'use client';

import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';

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

  useEffect(() => {
    if (!containerRef.current) return;

    const width = window.innerWidth * 0.9;
    const height = 700;
    const padding = 20;

    // Convertir tags a nodos
    const min = Math.min(...tags.map(t => t.count));
    const max = Math.max(...tags.map(t => t.count));
    
    // Calcular el tamaño mínimo basado en el texto más largo
    const maxTextLength = Math.max(...tags.map(t => t.value.length));
    const minSize = Math.max(60, maxTextLength * 4);
    
    const sizeScale = d3.scaleSqrt()
      .domain([min, max])
      .range([minSize, Math.max(minSize * 1.2, 100)]);

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
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
        });
      }
    });

    setNodes(nodes);

    // Función de animación
    const animate = (timestamp: number) => {
      if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
      const deltaTime = timestamp - lastUpdateRef.current;
      lastUpdateRef.current = timestamp;

      // Solo actualizar si ha pasado suficiente tiempo (control de FPS)
      if (deltaTime >= 16) { // Aproximadamente 60 FPS
        setNodes(prevNodes => {
          return prevNodes.map(node => {
            // Si la burbuja está en hover, no moverla
            if (node.isHovered) {
              return node;
            }

            // Actualizar posición con suavizado
            let newX = node.x + node.vx;
            let newY = node.y + node.vy;
            let newVx = node.vx;
            let newVy = node.vy;

            // Colisión con bordes (con suavizado)
            if (newX - node.size < 0 || newX + node.size > width) {
              newVx = -newVx * 0.95;
            }
            if (newY - node.size < 0 || newY + node.size > height) {
              newVy = -newVy * 0.95;
            }

            // Colisión con otras burbujas (optimizado)
            for (const otherNode of prevNodes) {
              if (otherNode.id !== node.id) {
                const dx = newX - otherNode.x;
                const dy = newY - otherNode.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = node.size + otherNode.size + padding;

                if (distance < minDistance) {
                  // Vector normal
                  const nx = dx / distance;
                  const ny = dy / distance;

                  // Velocidad relativa
                  const dvx = node.vx - otherNode.vx;
                  const dvy = node.vy - otherNode.vy;
                  const speed = dvx * nx + dvy * ny;

                  // Rebote con pérdida de energía
                  if (speed < 0) {
                    const bounce = speed * 0.95;
                    newVx -= bounce * nx;
                    newVy -= bounce * ny;
                  }

                  // Separación suave
                  const overlap = (minDistance - distance) * 0.5;
                  newX += nx * overlap;
                  newY += ny * overlap;
                }
              }
            }

            // Asegurar que la burbuja no se salga de los límites
            newX = Math.max(node.size, Math.min(width - node.size, newX));
            newY = Math.max(node.size, Math.min(height - node.size, newY));

            // Aplicar fricción
            newVx *= 0.999;
            newVy *= 0.999;

            return {
              ...node,
              x: newX,
              y: newY,
              vx: newVx,
              vy: newVy
            };
          });
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Iniciar animación
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [tags]);

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
        className="w-[90vw] h-[700px] relative"
      >
        {nodes.map((node) => (
          <button
            key={node.id}
            className="
              absolute rounded-full bg-[#e6e2d9]/20 
              hover:bg-[#e6e2d9]/30 text-[#e6e2d9]
              transition-all duration-300 ease-in-out
              hover:scale-110 flex flex-col items-center justify-center
              cursor-pointer text-center p-2
              border border-[#e6e2d9]/10 shadow-lg
            "
            style={{ 
              width: `${node.size * 2}px`,
              height: `${node.size * 2}px`,
              fontSize: `${getFontSize(node.value)}rem`,
              opacity: 0.9 + (node.value / Math.max(...tags.map(t => t.count))) * 0.1,
              transform: `translate(${node.x - node.size}px, ${node.y - node.size}px)`,
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
          >
            <span className="px-4 text-base font-bold">{node.id}</span>
            <span className="text-xs opacity-70 mt-1">{node.value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import * as d3 from 'd3';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  const nodesRef = useRef<Node[]>([]);

  // Memoizar dimensiones y configuración
  const config = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const width = typeof window !== 'undefined' ? window.innerWidth * 0.9 : 800;
    const height = isMobile ? 800 : 700;
    const padding = isMobile ? 10 : 20;
    
    return { width, height, padding, isMobile };
  }, []);

  // Memoizar escala de tamaños
  const sizeScale = useMemo(() => {
    if (tags.length === 0) return null;

    const counts = tags.map(t => t.count);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const maxTextLength = Math.max(...tags.map(t => t.value.length));
    const minSize = config.isMobile 
      ? Math.max(40, maxTextLength * 3)
      : Math.max(60, maxTextLength * 4);
    
    return d3.scaleSqrt()
      .domain([min, max])
      .range([minSize, Math.max(minSize * 1.2, config.isMobile ? 80 : 100)]);
  }, [tags, config.isMobile]);

  // Función optimizada para validar posiciones
  const isValidPosition = useCallback((
    x: number, 
    y: number, 
    size: number, 
    existingNodes: Node[]
  ): boolean => {
    const { width, height, padding } = config;
    
    // Verificar límites
    if (x - size < 0 || x + size > width || y - size < 0 || y + size > height) {
      return false;
    }

    // Verificar colisiones con nodos existentes
    for (const node of existingNodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      const distanceSquared = dx * dx + dy * dy;
      const requiredDistanceSquared = (size + node.size + padding) ** 2;
      
      if (distanceSquared < requiredDistanceSquared) {
        return false;
      }
    }
    
    return true;
  }, [config]);

  // Función para encontrar posición válida
  const findValidPosition = useCallback((
    size: number, 
    existingNodes: Node[]
  ): { x: number; y: number } => {
    const { width, height } = config;
    const maxAttempts = 500; // Aumentar intentos
    
    for (let i = 0; i < maxAttempts; i++) {
      const x = size + Math.random() * (width - 2 * size);
      const y = size + Math.random() * (height - 2 * size);
      
      if (isValidPosition(x, y, size, existingNodes)) {
        return { x, y };
      }
    }
    
    // Si no encuentra posición válida, colocar en una posición forzada
    // Esto asegura que todos los géneros se muestren
    const fallbackX = size + Math.random() * (width - 2 * size);
    const fallbackY = size + Math.random() * (height - 2 * size);
    return { x: fallbackX, y: fallbackY };
  }, [config, isValidPosition]);

  // Inicializar nodos
  useEffect(() => {
    if (!sizeScale || tags.length === 0) return;

    const initialNodes: Node[] = [];
    
    tags.forEach(tag => {
      const size = sizeScale(tag.count);
      const position = findValidPosition(size, initialNodes);
      
      // findValidPosition ahora siempre devuelve una posición
      initialNodes.push({
        id: tag.value,
        value: tag.count,
        size,
        x: position.x,
        y: position.y,
        vx: (Math.random() - 0.5) * 0.8, // Velocidad inicial lenta para movimiento seamless
        vy: (Math.random() - 0.5) * 0.8,
        isHovered: false,
      });
    });

    nodesRef.current = initialNodes;
    setNodes(initialNodes);
  }, [tags, sizeScale, findValidPosition]);

  // Animación optimizada con useCallback
  const animate = useCallback(() => {
    const { width, height, padding } = config;
    const updatedNodes = nodesRef.current.map(node => {
      // No mover burbujas en hover
      if (node.isHovered) return node;

      let newX = node.x + node.vx;
      let newY = node.y + node.vy;
      let newVx = node.vx;
      let newVy = node.vy;

          // Colisión con bordes con rebote muy suave
          if (newX - node.size < 0 || newX + node.size > width) {
            newVx = -newVx * 0.8; // Rebote más suave
            newX = Math.max(node.size, Math.min(width - node.size, newX));
          }
          if (newY - node.size < 0 || newY + node.size > height) {
            newVy = -newVy * 0.8; // Rebote más suave
            newY = Math.max(node.size, Math.min(height - node.size, newY));
          }

      // Colisión entre burbujas (optimizado)
      for (const otherNode of nodesRef.current) {
        if (otherNode.id === node.id) continue;

        const dx = newX - otherNode.x;
        const dy = newY - otherNode.y;
        const distanceSquared = dx * dx + dy * dy;
        const minDistance = node.size + otherNode.size + padding;
        const minDistanceSquared = minDistance * minDistance;

        if (distanceSquared < minDistanceSquared && distanceSquared > 0) {
          const distance = Math.sqrt(distanceSquared);
          const nx = dx / distance;
          const ny = dy / distance;

          // Velocidad relativa
          const dvx = newVx - otherNode.vx;
          const dvy = newVy - otherNode.vy;
          const speed = dvx * nx + dvy * ny;

          // Rebote muy suave entre burbujas
          if (speed < 0) {
            const bounce = speed * 0.7; // Más suave
            newVx -= bounce * nx;
            newVy -= bounce * ny;
          }

          // Separación muy suave
          const overlap = (minDistance - distance) * 0.2; // Más suave
          newX += nx * overlap;
          newY += ny * overlap;
        }
      }

      // Aplicar límites finales
      newX = Math.max(node.size, Math.min(width - node.size, newX));
      newY = Math.max(node.size, Math.min(height - node.size, newY));

      // Fricción mínima para movimiento seamless y continuo
      newVx *= 0.999;
      newVy *= 0.999;

      // Mantener velocidad mínima muy baja para movimiento lento y constante
      const speed = Math.sqrt(newVx * newVx + newVy * newVy);
      if (speed < 0.05) {
        const angle = Math.random() * Math.PI * 2;
        newVx = Math.cos(angle) * 0.1;
        newVy = Math.sin(angle) * 0.1;
      }

      return {
        ...node,
        x: newX,
        y: newY,
        vx: newVx,
        vy: newVy,
      };
    });

    nodesRef.current = updatedNodes;
    setNodes(updatedNodes);
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [config]);

  // Iniciar/detener animación
  useEffect(() => {
    if (nodes.length === 0) return;

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes.length, animate]);

  // Handlers de hover optimizados
  const handleMouseEnter = useCallback((nodeId: string) => {
    nodesRef.current = nodesRef.current.map(n => 
      n.id === nodeId ? { ...n, isHovered: true } : n
    );
    setNodes([...nodesRef.current]);
  }, []);

  const handleMouseLeave = useCallback((nodeId: string) => {
    nodesRef.current = nodesRef.current.map(n => 
      n.id === nodeId ? { ...n, isHovered: false } : n
    );
    setNodes([...nodesRef.current]);
  }, []);

  // Calcular tamaño de fuente
  const getFontSize = useCallback((count: number) => {
    if (tags.length === 0) return 1;
    
    const counts = tags.map(t => t.count);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const range = max - min || 1;
    const percentage = (count - min) / range;
    
    return 0.8 + percentage * 0.8;
  }, [tags]);

  // Calcular opacidad
  const getOpacity = useCallback((count: number) => {
    if (tags.length === 0) return 0.9;
    
    const max = Math.max(...tags.map(t => t.count));
    return 0.9 + (count / max) * 0.1;
  }, [tags]);

  return (
    <div className="flex justify-center items-center w-full overflow-hidden">
      <div 
        ref={containerRef}
        className="w-[90vw] h-[800px] sm:h-[700px] relative overflow-y-auto"
      >
        <div className="min-h-full w-full">
          {nodes.map((node) => (
            <button
              key={node.id}
              className="
                absolute rounded-full bg-[#e6e2d9]/15 
                text-[#e6e2d9]
                flex flex-col items-center justify-center
                cursor-pointer text-center p-2
                border border-[#e6e2d9]/20
                shadow-lg
                backdrop-blur-sm
                transition-all duration-300 ease-out
                hover:bg-[#e6e2d9]/25
              "
              style={{ 
                width: `${node.size * 2}px`,
                height: `${node.size * 2}px`,
                fontSize: `${getFontSize(node.value)}rem`,
                opacity: getOpacity(node.value),
                transform: `translate(${node.x - node.size}px, ${node.y - node.size}px)`,
                willChange: 'transform',
              }}
              onMouseEnter={() => handleMouseEnter(node.id)}
              onMouseLeave={() => handleMouseLeave(node.id)}
              onClick={() => onGenreClick(node.id)}
            >
              <span className="px-2 sm:px-4 text-sm sm:text-base font-bold leading-tight">
                {node.id}
              </span>
              <span className="text-xs opacity-70 mt-1">
                {node.value}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
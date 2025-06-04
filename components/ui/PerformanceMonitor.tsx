'use client';

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  cpu?: {
    userTime: number;
    systemTime: number;
  };
  fps: number;
  domNodes: number;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    domNodes: 0
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const updateMetrics = () => {
      // Calcular FPS
      const currentTime = performance.now();
      const elapsed = currentTime - lastTime;
      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        frameCount = 0;
        lastTime = currentTime;

        // Obtener métricas de memoria (solo en Chrome)
        const memory = (performance as any).memory;
        
        // Contar nodos DOM
        const domNodes = document.getElementsByTagName('*').length;

        // Obtener métricas de CPU usando performance.now()
        const cpuMetrics = {
          userTime: performance.now(),
          systemTime: performance.now()
        };

        setMetrics({
          memory: memory ? {
            usedJSHeapSize: Math.round(memory.usedJSHeapSize / (1024 * 1024)),
            totalJSHeapSize: Math.round(memory.totalJSHeapSize / (1024 * 1024)),
            jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / (1024 * 1024))
          } : undefined,
          cpu: cpuMetrics,
          fps,
          domNodes
        });
      }
      frameCount++;
      animationFrameId = requestAnimationFrame(updateMetrics);
    };

    animationFrameId = requestAnimationFrame(updateMetrics);

    // Agregar atajo de teclado para mostrar/ocultar el monitor
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg font-mono text-sm z-50 backdrop-blur-sm border border-white/10">
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span>FPS:</span>
          <span className={metrics.fps < 30 ? 'text-red-400' : metrics.fps < 50 ? 'text-yellow-400' : 'text-green-400'}>
            {metrics.fps}
          </span>
        </div>
        {metrics.memory && (
          <>
            <div className="flex justify-between items-center">
              <span>RAM (MB):</span>
              <span>{metrics.memory.usedJSHeapSize} / {metrics.memory.totalJSHeapSize}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>RAM Limit (MB):</span>
              <span>{metrics.memory.jsHeapSizeLimit}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-center">
          <span>DOM Nodes:</span>
          <span>{metrics.domNodes}</span>
        </div>
        <div className="text-xs text-gray-400 mt-2">
          Press Ctrl+Shift+P to toggle
        </div>
      </div>
    </div>
  );
} 
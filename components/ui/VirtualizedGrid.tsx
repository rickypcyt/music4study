'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  columns?: number;
}

export default function VirtualizedGrid<T>({
  items,
  renderItem,
  estimateSize = 400,
  overscan = 5,
  className = '',
  columns = 4,
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calcular el número de filas basado en el número de columnas
  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className={`relative w-full overflow-auto ${className}`}
      style={{
        height: '100%',
        minHeight: '400px',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowItems = items.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
              }}
            >
              {rowItems.map((item, index) => (
                <div
                  key={startIndex + index}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                >
                  {renderItem(item, startIndex + index)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
} 
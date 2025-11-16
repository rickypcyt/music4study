'use client';

import { useRef, useState, useEffect } from 'react';
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
  columns: propColumns,
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(propColumns || 4);

  // Responsive columns based on screen size
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      const baseColumns = propColumns || 4;
      
      if (width < 640) {
        setColumns(1);
      } else if (width < 768) {
        setColumns(2);
      } else if (width < 1024) {
        setColumns(2); // md breakpoint: 2 columns
      } else if (width < 1280) {
        setColumns(3);
      } else {
        setColumns(baseColumns);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [propColumns]);

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
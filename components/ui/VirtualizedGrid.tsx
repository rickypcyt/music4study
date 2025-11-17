'use client';

import React, { useRef, useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  columns?: number;
}

// Memoize the row component to prevent unnecessary re-renders
const Row = <T,>({ 
  rowItems, 
  startIndex, 
  columns, 
  rowSize, 
  rowStart, 
  renderItem 
}: { 
  rowItems: T[];
  startIndex: number;
  columns: number;
  rowSize: number;
  rowStart: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: `${rowSize}px`,
      transform: `translateY(${rowStart}px)`,
      display: 'grid',
      gap: '1rem',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
    }}
  >
    {rowItems.map((item, index) => (
      <div
        key={`${startIndex}-${index}`}
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

Row.displayName = 'Row';

const MemoizedRow = memo(Row) as typeof Row;

function VirtualizedGridComponent<T>({
  items,
  renderItem,
  estimateSize = 300,
  overscan = 3, // Balanced for performance and memory
  className = '',
  columns: propColumns = 4,
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(propColumns);
  // No necesitamos windowSize, lo eliminamos para optimizar

  // Memoize the items array to prevent unnecessary recalculations
  const memoizedItems = useMemo(() => items, [items]);

  // Throttled window resize handler
  const handleResize = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const width = window.innerWidth;
    let newColumns = propColumns;
    
    if (width < 640) newColumns = 1;
    else if (width < 768) newColumns = 2;
    else if (width < 1024) newColumns = 2;
    else if (width < 1280) newColumns = 3;
    
    setColumns(newColumns);
  }, [propColumns]);

  // Debounce resize handler
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let timeoutId: NodeJS.Timeout;
    const handleResizeDebounced = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };
    
    window.addEventListener('resize', handleResizeDebounced);
    // Initial call
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResizeDebounced);
      clearTimeout(timeoutId);
    };
  }, [handleResize]);

  // Calculate row count based on columns
  const rowCount = Math.ceil(memoizedItems.length / columns);

  // Virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => estimateSize, [estimateSize]),
    overscan,
  });

  // Get virtual items once to avoid multiple calls
  const virtualItems = rowVirtualizer.getVirtualItems();
  
  // Calculate visible items
  const visibleItems = useMemo(() => {
    return virtualItems.map(virtualRow => {
      const startIndex = virtualRow.index * columns;
      const rowItems = memoizedItems.slice(startIndex, startIndex + columns);
      
      return {
        ...virtualRow,
        rowItems,
        startIndex,
      };
    });
  }, [virtualItems, memoizedItems, columns]);

  return (
    <div
      ref={parentRef}
      className={`relative w-full overflow-auto ${className}`}
      style={{
        height: '100%',
        minHeight: '600px',
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {visibleItems.map(({ key, rowItems, startIndex, size, start }) => (
          <MemoizedRow
            key={key}
            rowItems={rowItems}
            startIndex={startIndex}
            columns={columns}
            rowSize={size}
            rowStart={start}
            renderItem={renderItem}
          />
        ))}
      </div>
    </div>
  );
}

// Memoize the main component
const VirtualizedGrid = memo(VirtualizedGridComponent) as <T>(
  props: VirtualizedGridProps<T>
) => React.JSX.Element;

export default VirtualizedGrid;
'use client';

import React, { memo } from 'react';

// ============================================
// TYPES & INTERFACES
// ============================================
interface SimpleGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  columns?: number;
  estimateSize?: number;
  overscan?: number;
}

// ============================================
// MAIN COMPONENT
// ============================================
function SimpleGridComponent<T>({
  items,
  renderItem,
  className = '',
  columns = 4,
}: SimpleGridProps<T>) {
  
  // Empty state
  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <p className="text-foreground/70 text-lg">No items to display</p>
      </div>
    );
  }

  // Determine responsive grid classes based on columns prop
  const getGridClasses = (columns: number) => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      default:
        return `grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(columns, 6)}`;
    }
  };

  return (
    <div
      className={`grid gap-6 w-full ${getGridClasses(columns)} ${className}`}
    >
      {items.map((item, index) => (
        <div key={index} className="w-full">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
const SimpleGrid = memo(SimpleGridComponent) as <T>(
  props: SimpleGridProps<T>
) => React.JSX.Element;

export default SimpleGrid;
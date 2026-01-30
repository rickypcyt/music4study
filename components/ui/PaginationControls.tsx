'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  onPreviousPage,
  onNextPage
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: number[] = [];
    
    // Show all pages
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className="flex flex-col items-center space-y-2 py-2">
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          className="bg-[#e6e2d9]/10 border-[#e6e2d9]/20 text-[#e6e2d9] hover:bg-[#e6e2d9]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center space-x-1">
          {getVisiblePages().map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={
                page === currentPage
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-[#e6e2d9]/10 border-[#e6e2d9]/20 text-[#e6e2d9] hover:bg-[#e6e2d9]/20"
              }
            >
              {page}
            </Button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          className="bg-[#e6e2d9]/10 border-[#e6e2d9]/20 text-[#e6e2d9] hover:bg-[#e6e2d9]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

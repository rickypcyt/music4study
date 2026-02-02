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

/** Max page buttons shown (mobile-friendly; ellipsis for rest) */
const MAX_VISIBLE_PAGES = 5;

function getVisiblePages(
  currentPage: number,
  totalPages: number,
  maxVisible: number
): (number | 'ellipsis')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  const pages: (number | 'ellipsis')[] = [];
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('ellipsis');
  }
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }
  return pages;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  onPreviousPage,
  onNextPage,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const pages = getVisiblePages(currentPage, totalPages, MAX_VISIBLE_PAGES);

  return (
    <div className="flex flex-col items-center w-full py-2 sm:py-3">
      <div className="flex items-center justify-center w-full max-w-4xl gap-1 sm:gap-2 px-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          className="shrink-0 h-9 px-2 sm:px-3 bg-[#e6e2d9]/10 border-[#e6e2d9]/20 text-[#e6e2d9] hover:bg-[#e6e2d9]/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <div className="flex items-center justify-center gap-0.5 sm:gap-1 min-w-0 flex-1 overflow-x-auto justify-center">
          {pages.map((page, i) =>
            page === 'ellipsis' ? (
              <span
                key={`ellipsis-${i}`}
                className="px-1 sm:px-1.5 text-[#e6e2d9]/50 text-xs sm:text-sm shrink-0"
                aria-hidden
              >
                …
              </span>
            ) : (
              <Button
                key={page}
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page)}
                className={`min-w-[2rem] sm:min-w-[2.25rem] h-9 px-1.5 sm:px-2 text-xs sm:text-sm shrink-0 ${
                  page === currentPage
                    ? '!bg-primary !hover:bg-primary/90 !text-primary-foreground !border-primary/50'
                    : 'bg-[#e6e2d9]/10 border-[#e6e2d9]/20 text-[#e6e2d9] hover:bg-[#e6e2d9]/20'
                }`}
                aria-label={page === currentPage ? `Page ${page}, current` : `Go to page ${page}`}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </Button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          className="shrink-0 h-9 px-2 sm:px-3 bg-[#e6e2d9]/10 border-[#e6e2d9]/20 text-[#e6e2d9] hover:bg-[#e6e2d9]/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4 sm:ml-1" />
        </Button>
      </div>
    </div>
  );
}

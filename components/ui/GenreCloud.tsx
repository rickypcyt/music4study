'use client';

import { useEffect, useState, useRef, useCallback, memo } from 'react';

interface Tag {
  value: string;
  count: number;
}

interface GenreCloudProps {
  genres: Tag[];
  onGenreClick: (genre: string) => void;
}

const GenreCloud = memo(function GenreCloud({ genres, onGenreClick }: GenreCloudProps) {
  return (
    <div className="w-full">
      <ul className="grid grid-cols-3 gap-4 p-4">
        {genres.map((genre) => (
          <li key={genre.value}>
            <button
              onClick={() => onGenreClick(genre.value)}
              className="
                w-full text-center p-4 rounded-lg border border-border bg-card text-card-foreground shadow-sm
                hover:bg-accent hover:text-accent-foreground
                transition-colors duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
              "
            >
              <span className="font-semibold">{genre.value}</span>
              <span className="block text-sm text-muted-foreground">{genre.count} tracks</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
});

export default GenreCloud;

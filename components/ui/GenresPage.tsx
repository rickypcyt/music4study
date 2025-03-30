'use client';

import GenreCloud from './GenreCloud';

interface Tag {
  value: string;
  count: number;
}

export default function GenresPage({ genres }: { genres: Tag[] }) {
  return (
    <div className="min-h-screen bg-[#1a1814]">
      <main className="w-full px-2 sm:px-4 lg:px-6 py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <GenreCloud tags={genres} />
        </div>
      </main>

      <style jsx global>{`
        .simple-cloud {
          color: #e6e2d9;
          font-family: serif;
        }
        .simple-cloud span {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .simple-cloud span:hover {
          color: #e6e2d9;
          opacity: 0.8;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
} 
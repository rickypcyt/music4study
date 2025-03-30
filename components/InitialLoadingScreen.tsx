import { useEffect, useState } from 'react';

export default function InitialLoadingScreen({ onLoadingComplete }: { onLoadingComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Loading music embeds...');

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onLoadingComplete();
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onLoadingComplete]);

  return (
    <div className="fixed inset-0 bg-[#1a1814] flex flex-col items-center justify-center z-50">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-serif text-[#e6e2d9] mb-4">Music4Study</h1>
        <p className="text-[#e6e2d9]/70 text-lg">{message}</p>
      </div>
      
      <div className="w-64 h-2 bg-[#e6e2d9]/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#e6e2d9] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="mt-4 text-[#e6e2d9]/50">
        {progress}%
      </div>
    </div>
  );
} 
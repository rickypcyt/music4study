export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-[600px] p-8">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-4 border-t-[#e6e2d9] border-r-[#e6e2d9]/30 border-b-[#e6e2d9]/30 border-l-[#e6e2d9]/30 animate-[spin_1s_linear_infinite]" />
        <div className="absolute inset-2 rounded-full border-4 border-t-[#e6e2d9] border-r-[#e6e2d9]/30 border-b-[#e6e2d9]/30 border-l-[#e6e2d9]/30 animate-[spin_0.8s_linear_infinite_reverse]" />
        <div className="absolute inset-4 rounded-full border-4 border-t-[#e6e2d9] border-r-[#e6e2d9]/30 border-b-[#e6e2d9]/30 border-l-[#e6e2d9]/30 animate-[spin_1.2s_linear_infinite]" />
      </div>
    </div>
  );
} 
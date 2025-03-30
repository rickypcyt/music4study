export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-[600px] p-8">
      <div className="relative w-[1780px] h-full mx-auto" style={{
        paddingLeft: 'calc(50% - 425.361px)',
        paddingRight: 'calc(50% - 425.361px)'
      }}>
        {/* Simulación de burbujas cargando en forma circular */}
        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const radius = 200;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <div
              key={i}
              className="absolute h-24 w-24 rounded-full bg-[#e6e2d9]/10 animate-pulse"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
                animationDelay: `${i * 0.1}s`
              }}
            />
          );
        })}
      </div>
    </div>
  );
} 
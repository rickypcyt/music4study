import { ImageResponse } from 'next/og';

export const alt = 'Music4Study — Study music for students';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Imagen para compartir en redes (Open Graph / Twitter), generada en 1200x630 reales
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #1a1814 0%, #2a2118 55%, #3b2a1a 100%)',
          color: '#e6e2d9',
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 36, letterSpacing: 6, opacity: 0.7 }}>MUSIC4STUDY</div>
        <div style={{ display: 'flex', fontSize: 92, fontWeight: 700, lineHeight: 1.05, marginTop: 28 }}>
          Study music that helps you focus.
        </div>
        <div style={{ display: 'flex', fontSize: 38, marginTop: 36, opacity: 0.75 }}>
          Lo-fi · Ambient · Classical · Jazz — curated by students
        </div>
      </div>
    ),
    size,
  );
}

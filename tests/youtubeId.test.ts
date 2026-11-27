import { describe, expect, it } from 'vitest';
import { extractYouTubeId } from '@/lib/youtubeId';

describe('extractYouTubeId', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/v/dQw4w9WgXcQ',
  ])('extrae el id de %s', (url) => {
    expect(extractYouTubeId(url)).toBe('dQw4w9WgXcQ');
  });

  it.each(['https://open.spotify.com/track/abc', 'https://www.youtube.com/', ''])('devuelve null para "%s"', (url) => {
    expect(extractYouTubeId(url)).toBeNull();
  });
});

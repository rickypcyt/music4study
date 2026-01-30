export default function SpotifyScript() {
  // Spotify embeds work without the global iframe API
  // Only add preconnect for performance
  return <link rel="preconnect" href="https://open.spotify.com" />;
}
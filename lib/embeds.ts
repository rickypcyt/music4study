export type EmbedType = 'youtube' | 'soundcloud' | 'spotify' | 'generic';

export interface MusicLink {
  url: string;
  type: string;
  genre: string;
  username: string;
}

export const getEmbedType = (url: string): EmbedType => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  } else if (url.includes('soundcloud.com')) {
    return 'soundcloud';
  } else if (url.includes('spotify.com')) {
    return 'spotify';
  }
  return 'generic';
};

export const getYouTubeEmbedUrl = (url: string): string => {
  const videoId = url.includes('youtu.be') 
    ? url.split('/').pop() 
    : new URL(url).searchParams.get('v');
  return `https://www.youtube.com/embed/${videoId}`;
};

export const getSpotifyEmbedUrl = (url: string): string => {
  const parts = url.split('/');
  const type = parts[parts.length - 2];
  const id = parts[parts.length - 1].split('?')[0];
  return `https://open.spotify.com/embed/${type}/${id}`;
};

export const renderEmbed = (link: MusicLink) => {
  const embedType = getEmbedType(link.url);

  switch (embedType) {
    case 'youtube':
      return (
        <iframe
          src={getYouTubeEmbedUrl(link.url)}
          className="w-full h-full rounded-lg"
          allowFullScreen
          title="YouTube Embed"
        />
      );
    case 'soundcloud':
      return (
        <iframe
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(link.url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}
          className="w-full h-full rounded-lg"
          allow="autoplay"
          title="SoundCloud Embed"
        />
      );
    case 'spotify':
      return (
        <iframe
          src={getSpotifyEmbedUrl(link.url)}
          className="w-full h-full rounded-lg"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify Embed"
        />
      );
    default:
      return <p className="text-gray-300">Unsupported Embed Type</p>;
  }
}; 
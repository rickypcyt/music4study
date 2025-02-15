'use client';

import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card';

interface MusicCardProps {
  link: {
    url: string;
    type: string;
    genre: string;
    username: string;
  };
}

export default function MusicCard({ link }: MusicCardProps) {
  const getEmbedType = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    } else if (url.includes('soundcloud.com')) {
      return 'soundcloud';
    } else if (url.includes('spotify.com')) {
      return 'spotify';
    } else {
      return 'generic';
    }
  };

  const embedType = getEmbedType(link.url);

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.includes('youtu.be') 
      ? url.split('/').pop() 
      : new URL(url).searchParams.get('v');
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const getSpotifyEmbedUrl = (url: string) => {
    const parts = url.split('/');
    const type = parts[parts.length - 2];
    const id = parts[parts.length - 1].split('?')[0];
    return `https://open.spotify.com/embed/${type}/${id}`;
  };

  const renderEmbed = () => {
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
            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(link.url)}&color=%23333333&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}
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

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent>
      <CardHeader/>
        <div className="aspect-video mb-4">
          {renderEmbed()}
        </div>
      
        <CardDescription className="text-gray-400 mb-2">
          Genre: {link.genre} · Type: {link.type}
        </CardDescription>
        <p className="text-gray-300">Uploaded by: {link.username}</p>

      </CardContent>
    </Card>
  );
}
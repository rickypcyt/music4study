'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

// Define a type for the link prop
interface MusicCardProps {
  link: {
    title: string;
    type: string;
    genre: string;
    url: string;
    username: string;
    created_at: string;
  };
}

export default function MusicCard({ link }: MusicCardProps) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">{link.title || 'Untitled'}</CardTitle>
        <CardDescription className="text-gray-400">
          {link.type} · {link.genre}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-video mb-4">
          <iframe
            src={link.url}
            className="w-full h-full rounded-lg"
            allowFullScreen
            title={link.title || 'Embedded content'}
          />
        </div>
        <p className="text-gray-300">Uploaded by: {link.username}</p>
        <p className="text-gray-400 text-sm">{new Date(link.created_at).toLocaleDateString()}</p>
      </CardContent>
    </Card>
  );
}

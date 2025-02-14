import { Card } from '@shadcn/ui';

export const MusicCard = ({ title, url, type }: { title: string; url: string; type: string }) => {
  return (
    <Card className="p-4 shadow-lg">
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-gray-600">{type}</p>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <CustomButton>Escuchar</CustomButton>
      </a>
    </Card>
  );
};
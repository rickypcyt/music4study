declare module 'react-tagcloud' {
  interface TagCloudProps {
    tags: Array<{
      value: string;
      count: number;
    }>;
    minSize?: number;
    maxSize?: number;
    shuffle?: boolean;
    className?: string;
    onClick?: (tag: { value: string; count: number }) => void;
    colorOptions?: {
      hue?: string;
      luminosity?: 'light' | 'dark' | 'bright' | 'random';
    };
  }

  const TagCloud: React.FC<TagCloudProps>;
  export default TagCloud;
} 
export interface Link {
  id: string;
  title: string;
  url: string;
  genre: string;
  date_added: string;
  type: string;
  username: string;
  titleConfirmedAt?: string; // Timestamp when title was last confirmed
}

export interface Combination {
  id: string;
  name: string;
  created_at: string;
  links?: Link[];
}

export interface LinksCache {
  links: Link[];
  lastUpdated: string;
}

export interface UsernameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved: () => void;
}

export interface HomeContentProps {
  initialLinks: Link[];
  initialGenres: string[];
  userId: string | null;
  username: string | null;
}

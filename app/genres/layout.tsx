import { Metadata } from 'next';
import Navbar from '@/components/ui/Navbar';

export const metadata: Metadata = {
  title: 'Genres - Music4Study',
  description: 'Explore music by genre for your study sessions',
};

export default function GenresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-container">
      <Navbar 
        currentView="genres"
        onGenresClick={() => {}}
        onHomeClick={() => {}}
        onSubmitClick={() => {}}
        onCombinationsClick={() => {}}
        onSortChange={() => {}}
        currentSort="date"
        onThemeChange={() => {}}
        currentTheme="coffee"
      />
      {children}
    </div>
  );
} 
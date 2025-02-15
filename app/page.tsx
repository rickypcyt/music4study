// app/page.tsx
import { createClient } from '@/app/utils/supabase/server';
import MusicCard from '@/components/ui/MusicCard';
import Navbar from '@/components/ui/Navbar';

export default async function Home() {
  const supabase = createClient();
  const { data: links } = await (await supabase).from('links').select('*');

  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar />
      <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {links?.map((link) => (
          <MusicCard key={link.id} link={link} />
        ))}
      </div>
    </div>
  );
}
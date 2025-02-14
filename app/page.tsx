import { CustomButton } from './components/ui/button';
import { CustomInput } from './components/ui/input';

import { createClient } from './utils/supabase/server';
import { cookies } from 'next/headers';

export default function SubmitPage() {
  const handleSubmit = async (formData: FormData) => {
    'use server';
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase
      .from('links')
      .insert([{ url: formData.get('url'), type: formData.get('type') }]);
    if (error) console.error(error);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Subir Enlace de Música</h1>
      <form action={handleSubmit} className="space-y-4">
        <CustomInput placeholder="URL del enlace" name="url" />
        <select name="type" className="border-2 border-study-purple rounded-lg p-2">
          <option value="youtube">YouTube</option>
          <option value="spotify">Spotify</option>
          <option value="soundcloud">SoundCloud</option>
        </select>
        <CustomButton type="submit">Subir</CustomButton>
      </form>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

export default function SubmitPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-center">Subir Enlace de Música</h1>
      <Card className="p-6 shadow-lg w-full max-w-md">
        <SubmitForm />
      </Card>
      <Toaster />
    </div>
  );
}

function SubmitForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!url || !type) {
      toast({
        title: 'Error',
        description: 'Todos los campos son obligatorios.',
        variant: 'destructive',
      });
      return;
    }

    if (!validateUrl(url)) {
      toast({
        title: 'Error',
        description: 'La URL no es válida.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from('links').insert([{ url, type }]);

    setLoading(false);
    if (error) {
      toast({
        title: 'Error',
        description: 'Hubo un problema al subir el enlace.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Éxito',
        description: 'El enlace se ha subido correctamente.',
      });
      setUrl('');
      setType('');
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <AlertTitle>¡Atención!</AlertTitle>
        <AlertDescription>Asegúrate de que el enlace sea válido.</AlertDescription>
      </Alert>

      <Input 
        placeholder="URL del enlace" 
        name="url" 
        value={url} 
        onChange={(e) => setUrl(e.target.value)} 
      />

      <Select value={type} onValueChange={setType}>
        <SelectTrigger>
          <SelectValue placeholder="Tipo de enlace" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="youtube">YouTube</SelectItem>
          <SelectItem value="spotify">Spotify</SelectItem>
          <SelectItem value="soundcloud">SoundCloud</SelectItem>
        </SelectContent>
      </Select>

      <Button type="submit" disabled={loading}>
        {loading ? 'Subiendo...' : 'Subir'}
      </Button>
    </form>
  );
}

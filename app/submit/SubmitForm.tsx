'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/app/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Music, AlertTriangle } from 'lucide-react';

type FieldError = string | null;
interface FormErrors {
  url: FieldError;
  type: FieldError;
  genre: FieldError;
  username: FieldError;
}

const MUSIC_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'mix', label: 'Mix' },
  { value: 'song', label: 'Song' },
] as const;

const SUGGESTED_GENRES = [
  'Classical', 'Jazz', 'Lo-fi', 'Ambient', 'Electronic', 
  'Study Music', 'Piano', 'Nature Sounds'
];

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-black text-slate-200">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 mb-8 group">
            <Music className="h-8 w-8 text-indigo-500 group-hover:text-indigo-400 transition-colors" />
            <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              Upload Music
            </h1>
          </div>
          <Card className="w-full max-w-md bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-200">Share Your Music</CardTitle>
            </CardHeader>
            <CardContent>
              <SubmitForm />
            </CardContent>
          </Card>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

function SubmitForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [formData, setFormData] = useState({
    url: '',
    type: '',
    genre: '',
    username: ''
  });
  const [errors, setErrors] = useState<FormErrors>({
    url: null,
    type: null,
    genre: null,
    username: null
  });
  const [loading, setLoading] = useState(false);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {
      url: !formData.url 
        ? 'URL is required' 
        : !isValidUrl(formData.url) 
        ? 'Please enter a valid URL'
        : null,
      type: !formData.type ? 'Please select a type' : null,
      genre: !formData.genre ? 'Genre is required' : null,
      username: !formData.username ? 'Name is required' : null
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please check all fields and try again.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('links')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'Your music has been uploaded successfully.',
      });
      
      router.push('/');
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'There was an error uploading your music. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: keyof typeof formData,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Alert variant="warning" className="bg-yellow-950/20 border-yellow-600/20 text-yellow-200">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription className="text-yellow-200/80">
          Please ensure your link is accessible and contains appropriate study music.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <Input
            placeholder="Music URL (e.g., YouTube, Spotify)"
            value={formData.url}
            onChange={e => handleChange('url', e.target.value)}
            className={`bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-400 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.url ? 'border-red-500' : ''
            }`}
            aria-invalid={errors.url ? 'true' : 'false'}
          />
          {errors.url && (
            <p className="mt-1 text-sm text-red-400">{errors.url}</p>
          )}
        </div>

        <div>
          <Select
            value={formData.type}
            onValueChange={value => handleChange('type', value)}
          >
            <SelectTrigger className={`bg-slate-800/50 border-slate-700 text-slate-200 ${
              errors.type ? 'border-red-500' : ''
            }`}>
              <SelectValue placeholder="Select content type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {MUSIC_TYPES.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-slate-200 focus:bg-slate-700">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="mt-1 text-sm text-red-400">{errors.type}</p>
          )}
        </div>

        <div>
          <Input
            placeholder="Genre"
            value={formData.genre}
            onChange={e => handleChange('genre', e.target.value)}
            className={`bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-400 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.genre ? 'border-red-500' : ''
            }`}
            list="genre-suggestions"
          />
          <datalist id="genre-suggestions">
            {SUGGESTED_GENRES.map(genre => (
              <option key={genre} value={genre} />
            ))}
          </datalist>
          {errors.genre && (
            <p className="mt-1 text-sm text-red-400">{errors.genre}</p>
          )}
        </div>

        <div>
          <Input
            placeholder="Your name"
            value={formData.username}
            onChange={e => handleChange('username', e.target.value)}
            className={`bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-400 focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.username ? 'border-red-500' : ''
            }`}
            maxLength={50}
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-400">{errors.username}</p>
          )}
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25"
      >
        {loading ? 'Uploading...' : 'Share Music'}
      </Button>
    </form>
  );
}
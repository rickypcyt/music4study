'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FieldError = string | null;

interface FormErrors {
    url: FieldError;
    type: FieldError;
    genre: FieldError;
    username: FieldError;
}

interface SubmitFormProps {
    onClose: () => void;
    genres: { value: string; count: number }[];
}

function SubmitForm({ onClose, genres }: SubmitFormProps) {
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
            type: !formData.type ? 'Type is required' : null,
            genre: !formData.genre ? 'Genre is required' : null,
            username: !formData.username ? 'Name is required' : null
        };

        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error !== null);
    };

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('links')
                .insert([{
                    url: formData.url,
                    type: formData.type,
                    genre: formData.genre,
                    username: formData.username,
                    date_added: new Date().toISOString()
                }]);

            if (error) throw error;

            toast({
                title: "Success!",
                description: "Your track has been submitted successfully.",
            });

            onClose();
            router.refresh();
        } catch (error) {
            console.error('Error submitting:', error);
            toast({
                title: "Error",
                description: "There was an error submitting your track. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-8">
                <div>
                    <Input
                        placeholder="URL"
                        value={formData.url}
                        onChange={e => handleChange('url', e.target.value)}
                        className={`bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary ${errors.url ? 'border-destructive' : ''}`}
                    />
                    {errors.url && (
                        <p className="mt-1 text-destructive">{errors.url}</p>
                    )}
                </div>

                <div>
                    <Input
                        placeholder="Type (e.g., Video, Mix, Song)"
                        value={formData.type}
                        onChange={e => handleChange('type', e.target.value)}
                        className={`bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary ${errors.type ? 'border-destructive' : ''}`}
                    />
                    {errors.type && (
                        <p className="mt-1 text-destructive">{errors.type}</p>
                    )}
                </div>

                <div>
                    <Select
                        value={formData.genre}
                        onValueChange={(value) => handleChange('genre', value)}
                    >
                        <SelectTrigger className={`bg-background/50 border-border text-foreground ${errors.genre ? 'border-destructive' : ''}`}>
                            <SelectValue placeholder="Select a genre" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                            {genres.map((genre) => (
                                <SelectItem key={genre.value} value={genre.value}>
                                    {genre.value}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.genre && (
                        <p className="mt-1 text-destructive">{errors.genre}</p>
                    )}
                </div>

                <div>
                    <Input
                        placeholder="Your name"
                        value={formData.username}
                        onChange={e => handleChange('username', e.target.value)}
                        className={`bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary ${errors.username ? 'border-destructive' : ''}`}
                        maxLength={50}
                    />
                    {errors.username && (
                        <p className="mt-1 text-destructive">{errors.username}</p>
                    )}
                </div>
            </div>

            <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
            >
                {loading ? 'Uploading...' : 'Share Music'}
            </Button>
        </form>
    );
}

export default SubmitForm;

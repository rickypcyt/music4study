'use client';

import { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';

type FieldError = string | null;

interface FormErrors {
    url: FieldError;
    type: FieldError;
    genre: FieldError;
}

interface SubmitFormProps {
    onClose: () => void;
    genres: { value: string; count: number }[];
}

// Memoized form components
const MemoizedInput = memo(Input);
const MemoizedSelect = memo(Select);
const MemoizedSelectTrigger = memo(SelectTrigger);
const MemoizedSelectContent = memo(SelectContent);
const MemoizedSelectItem = memo(SelectItem);
const MemoizedSelectValue = memo(SelectValue);

function SubmitForm({ onClose, genres }: SubmitFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        url: '',
        type: '',
        genre: ''
    });
    const [errors, setErrors] = useState<FormErrors>({
        url: null,
        type: null,
        genre: null
    });
    const [loading, setLoading] = useState(false);

    const isValidUrl = useCallback((url: string) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }, []);

    const validateForm = useCallback(() => {
        const newErrors: FormErrors = {
            url: !formData.url
                ? 'URL is required'
                : !isValidUrl(formData.url)
                    ? 'Please enter a valid URL'
                    : null,
            type: !formData.type ? 'Type is required' : null,
            genre: !formData.genre ? 'Genre is required' : null
        };

        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error !== null);
    }, [formData, isValidUrl]);

    const handleChange = useCallback((field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    }, [errors]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (!user) {
            toast({
                title: "Error",
                description: "You must be signed in to submit a track.",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('links')
                .insert([{
                    url: formData.url,
                    type: formData.type,
                    genre: formData.genre,
                    user_id: user.id,
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
    }, [formData, user, validateForm, toast, onClose, router]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-8">
                <div>
                    <MemoizedInput
                        placeholder="URL"
                        value={formData.url}
                        onChange={e => handleChange('url', e.target.value)}
                        className={`bg-background text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary ${errors.url ? 'border-destructive' : ''}`}
                    />
                    {errors.url && (
                        <p className="mt-1 text-destructive">{errors.url}</p>
                    )}
                </div>

                <div>
                    <MemoizedSelect
                        value={formData.type}
                        onValueChange={(value) => handleChange('type', value)}
                    >
                        <MemoizedSelectTrigger className={`bg-background text-foreground ${errors.type ? 'border-destructive' : ''}`}>
                            <MemoizedSelectValue placeholder="Select a type" />
                        </MemoizedSelectTrigger>
                        <MemoizedSelectContent className="bg-background border-border">
                            <MemoizedSelectItem value="video">Video</MemoizedSelectItem>
                            <MemoizedSelectItem value="mix">Mix</MemoizedSelectItem>
                            <MemoizedSelectItem value="song">Song</MemoizedSelectItem>
                        </MemoizedSelectContent>
                    </MemoizedSelect>
                    {errors.type && (
                        <p className="mt-1 text-destructive">{errors.type}</p>
                    )}
                </div>

                <div>
                    <MemoizedSelect
                        value={formData.genre}
                        onValueChange={(value) => handleChange('genre', value)}
                    >
                        <MemoizedSelectTrigger className={`bg-background text-foreground ${errors.genre ? 'border-destructive' : ''}`}>
                            <MemoizedSelectValue placeholder="Select a genre" />
                        </MemoizedSelectTrigger>
                        <MemoizedSelectContent className="bg-background border-border">
                            {genres.map((genre) => (
                                <MemoizedSelectItem key={genre.value} value={genre.value}>
                                    {genre.value}
                                </MemoizedSelectItem>
                            ))}
                        </MemoizedSelectContent>
                    </MemoizedSelect>
                    {errors.genre && (
                        <p className="mt-1 text-destructive">{errors.genre}</p>
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

export default memo(SubmitForm);

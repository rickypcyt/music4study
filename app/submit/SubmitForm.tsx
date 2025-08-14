'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useToast } from '@/components/hooks/use-toast';
import { Pencil, Plus, Check, X } from 'lucide-react';

type FieldError = string | null;

// Type guard to safely check for an error code without using `any`
const hasStringCode = (e: unknown): e is { code: string } => {
    if (typeof e !== 'object' || e === null) return false;
    const rec = e as Record<string, unknown>;
    return typeof rec.code === 'string';
};

interface FormErrors {
    url: FieldError;
    type: FieldError;
    genre: FieldError;
}

interface SubmitFormProps {
    onClose: () => void;
    genres: { value: string; count: number; }[];
    onNewLinkAdded?: (newLink: Link) => void;
    username: string;
    onEditUsername?: () => void;
}

interface Link {
    id: string;
    title: string;
    url: string;
    genre: string;
    date_added: string;
    type: string;
    username: string;
}

function SubmitForm({ onClose, genres, onNewLinkAdded, username, onEditUsername }: SubmitFormProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        url: '',
        type: '',
        genre: ''
    });
    const [customTypeMode, setCustomTypeMode] = useState(false);
    const [customTypeValue, setCustomTypeValue] = useState('');
    const [customGenreMode, setCustomGenreMode] = useState(false);
    const [customGenreValue, setCustomGenreValue] = useState('');
    const [errors, setErrors] = useState<FormErrors>({ url: null, type: null, genre: null });
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
            genre: !formData.genre ? 'Genre is required' : null
        };

        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error !== null);
    };

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field as keyof FormErrors]) setErrors(prev => ({ ...prev, [field]: null } as FormErrors));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            // Normalize URL and check for duplicates (case-insensitive)
            const cleanUrl = formData.url.trim();
            const { data: existing, error: checkError } = await supabase
                .from('links')
                .select('id')
                .ilike('url', cleanUrl)
                .limit(1);
            if (checkError) throw checkError;
            if (existing && existing.length > 0) {
                setErrors(prev => ({ ...prev, url: 'This link already exists' }));
                toast({
                    title: 'Duplicate link',
                    description: 'That URL is already in the list.',
                    variant: 'destructive',
                });
                return;
            }

            const { data, error } = await supabase
                .from('links')
                .insert([
                    {
                        ...formData,
                        url: cleanUrl,
                        date_added: new Date().toISOString(),
                        username: username,
                    },
                ])
                .select()
                .single();

            if (error) throw error;

            toast({
                title: "Success!",
                description: "Your music has been shared.",
            });

            // Notificar al componente padre sobre el nuevo link
            if (data && onNewLinkAdded) {
                onNewLinkAdded(data);
            }

            onClose();
        } catch (error) {
            console.error('Error submitting form:', error);
            // Unique constraint violation (e.g., if a DB unique index exists on url)
            if (hasStringCode(error) && error.code === '23505') {
                setErrors(prev => ({ ...prev, url: 'This link already exists' }));
                toast({
                    title: 'Duplicate link',
                    description: 'That URL is already in the list.',
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: "Error",
                    description: "Failed to share music. Please try again.",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div className="text-base text-foreground/90">
                    Posting as <span className="font-medium text-foreground">{username}</span>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onEditUsername}
                    className="h-9 w-9 p-0 text-foreground/80 hover:text-foreground hover:bg-accent/40"
                >
                    <Pencil className="h-5 w-5" />
                </Button>
            </div>
            <div className="space-y-6">
                <div>
                    <Input
                        placeholder="URL"
                        value={formData.url}
                        onChange={e => handleChange('url', e.target.value)}
                        className={`bg-background/70 border-border/40 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary ${errors.url ? 'border-destructive' : ''}`}
                    />
                    {errors.url && (
                        <p className="mt-1 text-destructive">{errors.url}</p>
                    )}
                </div>

                <div>
                    {!customTypeMode ? (
                        <div className="flex items-center gap-2">
                            <Select
                                value={formData.type}
                                onValueChange={(value) => handleChange('type', value)}
                            >
                                <SelectTrigger className={`bg-background/70 border-border/40 text-foreground focus:outline-none focus:ring-0 focus:ring-offset-0 ${errors.type ? 'border-destructive' : ''} flex-1 min-w-0`}>
                                    <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border-border/40">
                                    {['Mix', 'Video', 'Song'].map((t) => (
                                        <SelectItem key={t} value={t}>
                                            {t}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => { setCustomTypeMode(true); setCustomTypeValue(''); }}
                                className="h-11 w-11 p-0 rounded-md border-border/40 text-foreground/80 hover:text-foreground hover:bg-accent/40"
                                title="Add custom type"
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                list="types-list"
                                placeholder="Type or search a type"
                                value={customTypeValue}
                                onChange={(e) => setCustomTypeValue(e.target.value)}
                                className="flex-1 min-w-0 h-11 rounded-md bg-background/70 border border-border/40 px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary"
                            />
                            <datalist id="types-list">
                                {['Mix', 'Video', 'Song'].map((t) => (
                                    <option key={t} value={t} />
                                ))}
                            </datalist>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    const val = customTypeValue.trim();
                                    if (!val) return;
                                    handleChange('type', val);
                                    setCustomTypeMode(false);
                                    setCustomTypeValue('');
                                }}
                                className="h-11 w-11 p-0 rounded-md border-border/40 text-foreground/80 hover:text-foreground hover:bg-accent/40"
                                title="Use this type"
                            >
                                <Check className="h-5 w-5" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => { setCustomTypeMode(false); setCustomTypeValue(''); }}
                                className="h-11 w-11 p-0 rounded-md border-border/40 text-foreground/80 hover:text-foreground hover:bg-accent/40"
                                title="Cancel"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    )}
                    {errors.type && (
                        <p className="mt-1 text-destructive">{errors.type}</p>
                    )}
                </div>

                <div>
                    {!customGenreMode ? (
                        <div className="flex items-center gap-2">
                            <Select
                                value={formData.genre}
                                onValueChange={(value) => handleChange('genre', value)}
                            >
                                <SelectTrigger className={`bg-background/70 border-border/40 text-foreground focus:outline-none focus:ring-0 focus:ring-offset-0 ${errors.genre ? 'border-destructive' : ''} flex-1 min-w-0`}>
                                    <SelectValue placeholder="Select a genre" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border-border/40">
                                    {genres.map((genre) => (
                                        <SelectItem key={genre.value} value={genre.value}>
                                            {genre.value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => { setCustomGenreMode(true); setCustomGenreValue(''); }}
                                className="h-11 w-11 p-0 rounded-md border-border/40 text-foreground/80 hover:text-foreground hover:bg-accent/40"
                                title="Add custom genre"
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                list="genres-list"
                                placeholder="Type or search a genre"
                                value={customGenreValue}
                                onChange={(e) => setCustomGenreValue(e.target.value)}
                                className="flex-1 min-w-0 h-11 rounded-md bg-background/70 border border-border/40 px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary"
                            />
                            <datalist id="genres-list">
                                {genres.map((g) => (
                                    <option key={g.value} value={g.value} />
                                ))}
                            </datalist>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    const val = customGenreValue.trim();
                                    if (!val) return;
                                    handleChange('genre', val);
                                    setCustomGenreMode(false);
                                    setCustomGenreValue('');
                                }}
                                className="h-11 w-11 p-0 rounded-md border-border/40 text-foreground/80 hover:text-foreground hover:bg-accent/40"
                                title="Use this genre"
                            >
                                <Check className="h-5 w-5" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => { setCustomGenreMode(false); setCustomGenreValue(''); }}
                                className="h-11 w-11 p-0 rounded-md border-border/40 text-foreground/80 hover:text-foreground hover:bg-accent/40"
                                title="Cancel"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    )}
                    {errors.genre && (
                        <p className="mt-1 text-destructive">{errors.genre}</p>
                    )}
                </div>
            </div>

            <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
            >
                {loading ? 'Uploading...' : 'Share Music'}
            </Button>
        </form>
    );
}

export default SubmitForm;

'use client';

import { ClipboardPaste, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import GenreCards from '@/components/ui/GenreCards';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { createLink } from '@/lib/dataApi';
import { extractYouTubeId } from '@/lib/youtubeId';
import { useToast } from '@/components/hooks/use-toast';

interface Link {
    id: string;
    title: string;
    url: string;
    genre: string;
    date_added: string;
    type: string;
    username: string;
    titleConfirmedAt?: string;
}

interface SubmitFormProps {
    onClose: () => void;
    genres: { value: string; count: number }[];
    onNewLinkAdded?: (newLink: Link) => void;
    onSuccess: () => void;
}

type Platform = 'youtube' | 'spotify' | 'soundcloud';

const PLATFORM_LABEL: Record<Platform, string> = { youtube: 'YouTube', spotify: 'Spotify', soundcloud: 'SoundCloud' };
const TYPE_OPTIONS = ['Mix', 'Video', 'Song', 'Set', 'Album'];

function detectPlatform(raw: string): Platform | null {
    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return null;
    }
    if (!/^https?:$/.test(url.protocol)) return null;
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (host === 'youtu.be' || host.endsWith('youtube.com')) return extractYouTubeId(url.href) ? 'youtube' : null;
    if (host === 'open.spotify.com') return /^\/(intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\//.test(url.pathname) ? 'spotify' : null;
    if (host === 'soundcloud.com' || host === 'on.soundcloud.com') return 'soundcloud';
    return null;
}

interface Preview {
    status: 'idle' | 'loading' | 'ok' | 'missing';
    title?: string;
    channel?: string;
}

const SubmitForm: React.FC<SubmitFormProps> = ({ onClose, genres: initialGenres, onNewLinkAdded, onSuccess }) => {
    const { toast } = useToast();
    const [url, setUrl] = useState('');
    const [type, setType] = useState('');
    const [customType, setCustomType] = useState(false);
    const [genre, setGenre] = useState('');
    const [genres, setGenres] = useState(initialGenres);
    const [touched, setTouched] = useState(false);
    const [serverUrlError, setServerUrlError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<Preview>({ status: 'idle' });
    const urlRef = useRef<HTMLInputElement>(null);

    const platform = useMemo(() => detectPlatform(url), [url]);
    const videoId = platform === 'youtube' ? extractYouTubeId(url.trim()) : null;

    // Vista previa de YouTube (título + canal) y comprobación de que el video existe
    useEffect(() => {
        setServerUrlError(null);
        if (!videoId) {
            setPreview({ status: 'idle' });
            return;
        }
        setPreview({ status: 'loading' });
        const ctrl = new AbortController();
        const t = setTimeout(() => {
            fetch(`/api/youtube-info?videoId=${encodeURIComponent(videoId)}`, { signal: ctrl.signal })
                .then(async (r) => {
                    if (r.status === 404) return setPreview({ status: 'missing' });
                    if (!r.ok) return setPreview({ status: 'idle' }); // sin clave de API, etc.: no bloquear el envío
                    const d = await r.json();
                    setPreview({ status: 'ok', title: d.title, channel: d.channelTitle });
                })
                .catch(() => {});
        }, 400);
        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [videoId]);

    const urlError = !url.trim()
        ? 'Paste a YouTube, Spotify or SoundCloud link'
        : !platform
            ? 'That doesn’t look like a YouTube, Spotify or SoundCloud track link'
            : preview.status === 'missing'
                ? 'That video doesn’t exist or is private'
                : serverUrlError;
    const typeError = !type.trim() ? 'Choose a type' : null;
    const genreError = !genre.trim() ? 'Choose or create a genre' : null;
    const isValid = !urlError && !typeError && !genreError && preview.status !== 'loading';

    const paste = async () => {
        try {
            const text = (await navigator.clipboard.readText()).trim();
            if (text) {
                setUrl(text);
                setTouched(true);
            }
        } catch {
            urlRef.current?.focus(); // sin permiso de portapapeles: que lo pegue a mano
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!isValid || loading) return;

        setLoading(true);
        try {
            // El servidor normaliza, comprueba duplicados (409) e inserta; el autor sale de tu sesión
            const { data, error } = await createLink({ url: url.trim(), type: type.trim(), genre: genre.trim() });
            if (error?.status === 409) {
                setServerUrlError('This link already exists');
                toast({ title: 'Duplicate link', description: 'That URL is already in the list.', variant: 'destructive' });
                return;
            }
            if (error) throw new Error(error.message);

            toast({ title: '¡Éxito!', description: 'El enlace se ha añadido correctamente.' });
            if (data && onNewLinkAdded) onNewLinkAdded(data);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error submitting form:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to share music. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const showUrlError = touched && urlError;

    return (
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4" noValidate>
            {/* Los campos hacen scroll dentro del modal; el botón queda siempre visible abajo */}
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-1 -mx-1 pb-1">
            {/* LINK */}
            <div className="space-y-2">
                <label htmlFor="submit-url" className="text-base font-medium text-foreground">Link</label>
                <div className="flex items-center gap-2">
                    <Input
                        id="submit-url"
                        ref={urlRef}
                        autoFocus
                        inputMode="url"
                        placeholder="https://…"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onBlur={() => url && setTouched(true)}
                        aria-invalid={Boolean(showUrlError)}
                        className={cn(
                            'bg-background/70 border-border/40 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary',
                            showUrlError && 'border-destructive',
                        )}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={paste}
                        title="Paste from clipboard"
                        aria-label="Paste from clipboard"
                        className="h-11 w-11 shrink-0 p-0 rounded-md border-border/40 text-foreground/80 hover:text-foreground hover:bg-accent/40"
                    >
                        <ClipboardPaste className="h-5 w-5" />
                    </Button>
                </div>

                {showUrlError ? (
                    <p className="text-destructive">{urlError}</p>
                ) : platform ? (
                    <div className="flex items-center gap-3 rounded-md border border-border/40 bg-background/50 p-2">
                        {videoId && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
                                alt=""
                                className="h-14 w-24 shrink-0 rounded object-cover bg-muted"
                                onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-primary font-medium">{PLATFORM_LABEL[platform]}</p>
                            {preview.status === 'loading' ? (
                                <p className="flex items-center gap-2 text-foreground/60"><Loader2 className="h-4 w-4 animate-spin" /> Checking…</p>
                            ) : preview.status === 'ok' ? (
                                <>
                                    <p className="truncate text-foreground">{preview.title}</p>
                                    {preview.channel && <p className="truncate text-foreground/60">{preview.channel}</p>}
                                </>
                            ) : (
                                <p className="text-foreground/60">Link detected</p>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>

            {/* TYPE */}
            <div className="space-y-2">
                <span className="text-base font-medium text-foreground">Type</span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type">
                    {TYPE_OPTIONS.map((t) => (
                        <button
                            key={t}
                            type="button"
                            role="radio"
                            aria-checked={!customType && type === t}
                            onClick={() => {
                                setCustomType(false);
                                setType(t);
                            }}
                            className={cn(
                                'rounded-full border px-3 py-1.5 sm:px-4 sm:py-2 text-base transition-colors',
                                !customType && type === t
                                    ? 'border-primary bg-primary/20 text-foreground'
                                    : 'border-border/40 text-foreground/80 hover:bg-accent/40 hover:text-foreground',
                            )}
                        >
                            {t}
                        </button>
                    ))}
                    <button
                        type="button"
                        role="radio"
                        aria-checked={customType}
                        onClick={() => {
                            setCustomType(true);
                            setType('');
                        }}
                        className={cn(
                            'rounded-full border px-3 py-1.5 sm:px-4 sm:py-2 text-base transition-colors',
                            customType ? 'border-primary bg-primary/20 text-foreground' : 'border-dashed border-border/60 text-foreground/70 hover:bg-accent/40 hover:text-foreground',
                        )}
                    >
                        Other…
                    </button>
                </div>
                {customType && (
                    <div className="flex items-center gap-2">
                        <Input
                            autoFocus
                            placeholder="e.g. Podcast"
                            maxLength={30}
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="bg-background/70 border-border/40 text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setCustomType(false);
                                setType('');
                            }}
                            aria-label="Cancel custom type"
                            className="h-11 w-11 shrink-0 p-0 rounded-md border-border/40"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                )}
                {touched && typeError && <p className="text-destructive">{typeError}</p>}
            </div>

            {/* GENRE */}
            <div className="space-y-2">
                <span className="text-base font-medium text-foreground">Genre</span>
                <GenreCards
                    genres={genres}
                    value={genre}
                    hasError={Boolean(touched && genreError)}
                    onChange={(g) => {
                        // Género nuevo: se añade a la lista local para poder reutilizarlo
                        if (g && !genres.some((x) => x.value.toLowerCase() === g.toLowerCase())) {
                            setGenres((prev) => [...prev, { value: g, count: 1 }]);
                        }
                        setGenre(g);
                    }}
                />
                {touched && genreError && <p className="text-destructive">{genreError}</p>}
            </div>
            </div>

            <Button
                type="submit"
                disabled={loading || (touched && !isValid)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Sharing…</span>
                ) : (
                    'Share Music'
                )}
            </Button>
        </form>
    );
};

export default SubmitForm;

'use client';

import YouTubeThumb from '@/components/YouTubeThumb';
import { Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import GenreCards from '@/components/ui/GenreCards';
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

            toast({ title: 'Added', description: 'The track is in your library.' });
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
    const label = 'block text-sm font-medium text-foreground/60';
    const choice = (active: boolean) =>
        cn(
            'rounded-md border px-3 py-1.5 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            active
                ? 'border-foreground bg-foreground text-background'
                : 'border-foreground/15 text-foreground/75 hover:border-foreground/40 hover:text-foreground',
        );

    return (
        <form
            onSubmit={handleSubmit}
            // Ctrl/Cmd + Enter envía desde cualquier campo
            onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e);
            }}
            className="flex min-h-0 flex-col"
            noValidate
        >
            {/* Los campos hacen scroll dentro del modal; el pie queda siempre visible abajo */}
            <div className="-mx-1 min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-1 pb-2">
                {/* LINK */}
                <div className="space-y-3">
                    <label htmlFor="submit-url" className={label}>Link</label>
                    <div
                        className={cn(
                            'flex items-center gap-2 border-b-2 transition-colors focus-within:border-primary',
                            showUrlError ? 'border-destructive' : 'border-foreground/15',
                        )}
                    >
                        <input
                            id="submit-url"
                            ref={urlRef}
                            autoFocus
                            inputMode="url"
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="youtube.com/watch?v=…"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onBlur={() => url && setTouched(true)}
                            aria-invalid={Boolean(showUrlError)}
                            aria-describedby="submit-url-help"
                            className="min-w-0 flex-1 !border-0 !bg-transparent py-2 text-lg text-foreground !shadow-none outline-none placeholder:text-foreground/30"
                        />
                        {url ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setUrl('');
                                    setTouched(false);
                                    urlRef.current?.focus();
                                }}
                                aria-label="Clear link"
                                className="p-1 text-foreground/40 hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        ) : (
                            <button type="button" onClick={paste} className="text-sm font-medium text-foreground/50 hover:text-foreground">
                                Paste
                            </button>
                        )}
                    </div>

                    <div id="submit-url-help" aria-live="polite">
                        {showUrlError ? (
                            <p className="text-sm text-destructive">{urlError}</p>
                        ) : platform ? (
                            <div className="flex items-center gap-3">
                                {videoId && (
                                    <YouTubeThumb videoId={videoId} className="aspect-video w-28 shrink-0 rounded bg-muted object-cover" />
                                )}
                                <div className="min-w-0 flex-1">
                                    {preview.status === 'loading' ? (
                                        <>
                                            <div className="m4s-shimmer mb-2 h-4 w-3/4 rounded" />
                                            <div className="m4s-shimmer h-3 w-1/3 rounded" />
                                        </>
                                    ) : preview.status === 'ok' ? (
                                        <>
                                            <p className="line-clamp-2 font-medium leading-snug text-foreground">{preview.title}</p>
                                            <p className="truncate text-sm text-foreground/50">
                                                {preview.channel ? `${preview.channel} · ` : ''}
                                                {PLATFORM_LABEL[platform]}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-sm text-foreground/50">{PLATFORM_LABEL[platform]} link</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-foreground/40">YouTube, Spotify or SoundCloud</p>
                        )}
                    </div>
                </div>

                {/* TYPE */}
                <div className="space-y-3">
                    <span id="submit-type" className={label}>Type</span>
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="submit-type">
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
                                className={choice(!customType && type === t)}
                            >
                                {t}
                            </button>
                        ))}
                        {customType ? (
                            <div className="flex items-center rounded-md border border-foreground pl-3">
                                <input
                                    autoFocus
                                    placeholder="Podcast"
                                    maxLength={30}
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    aria-label="Custom type"
                                    className="w-28 !border-0 !bg-transparent py-1.5 text-base text-foreground !shadow-none outline-none placeholder:text-foreground/30"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCustomType(false);
                                        setType('');
                                    }}
                                    aria-label="Cancel custom type"
                                    className="px-2 text-foreground/50 hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                role="radio"
                                aria-checked={false}
                                onClick={() => {
                                    setCustomType(true);
                                    setType('');
                                }}
                                className="rounded-md px-3 py-1.5 text-base text-foreground/50 hover:text-foreground"
                            >
                                Other
                            </button>
                        )}
                    </div>
                    {touched && typeError && <p className="text-sm text-destructive">{typeError}</p>}
                </div>

                {/* GENRE */}
                <div className="space-y-3">
                    <span className={label}>Genre</span>
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
                    {touched && genreError && <p className="text-sm text-destructive">{genreError}</p>}
                </div>
            </div>

            <div className="mt-2 flex items-center justify-end gap-3 border-t border-foreground/10 pt-4">
                <span className="mr-auto hidden text-sm text-foreground/40 sm:inline">Ctrl + Enter</span>
                <Button type="button" variant="ghost" onClick={onClose} className="text-foreground/70">
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={loading || (touched && !isValid)}
                    className="min-w-[7.5rem] bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Adding" /> : 'Add track'}
                </Button>
            </div>
        </form>
    );
};

export default SubmitForm;

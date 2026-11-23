'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { useEffect, useState } from 'react';

import { Button } from './button';
import { Input } from './input';

const USERNAME = /^[a-z0-9_]{3,24}$/;

interface UsernameModalProps {
  open: boolean;
  /** Se llama con el username guardado */
  onSaved: (username: string) => void;
  onSignOut: () => void;
}

/** Modal obligatorio tras el primer login: no se puede cerrar hasta elegir un username. */
export default function UsernameModal({ open, onSaved, onSignOut }: UsernameModalProps) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const username = value.trim().toLowerCase();

  // Comprueba disponibilidad mientras se escribe (con debounce)
  useEffect(() => {
    setError(null);
    if (!username) return setStatus('idle');
    if (!USERNAME.test(username)) return setStatus('invalid');
    setStatus('checking');
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/me/username?u=${encodeURIComponent(username)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setStatus(d.available ? 'available' : 'taken'))
        .catch(() => {});
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [username]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'available' || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/me/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? 'No se pudo guardar el username');
        if (res.status === 409) setStatus('taken');
        return;
      }
      onSaved(body.username);
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const hint =
    status === 'invalid'
      ? '3 a 24 caracteres: letras minúsculas, números o _'
      : status === 'checking'
        ? 'Comprobando…'
        : status === 'available'
          ? '✓ Disponible'
          : status === 'taken'
            ? 'Ese nombre no está disponible'
            : '3 a 24 caracteres: letras minúsculas, números o _';

  return (
    // onOpenChange vacío y sin botón de cierre: es un paso obligatorio
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="bg-[#1a1814] border-[#e6e2d9]/10 sm:max-w-[420px] [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Choose your username</DialogTitle>
          <DialogDescription>
            This is your public name in Music4Study. You can&apos;t change it later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-foreground/60 text-lg">@</span>
              <Input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="yourname"
                maxLength={24}
                autoComplete="off"
                aria-invalid={status === 'invalid' || status === 'taken'}
              />
            </div>
            <p
              className={`text-base ${
                status === 'available' ? 'text-green-500' : status === 'taken' || status === 'invalid' ? 'text-red-400' : 'text-foreground/60'
              }`}
            >
              {error ?? hint}
            </p>
          </div>

          <Button type="submit" disabled={status !== 'available' || saving} className="w-full">
            {saving ? 'Saving…' : 'Continue'}
          </Button>
          <button type="button" onClick={onSignOut} className="w-full text-base text-foreground/50 hover:text-foreground/80">
            Sign out
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";

import { Button } from './button';
import { Input } from './input';
import { useState } from 'react';

interface PasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PasswordDialog({ isOpen, onClose, onSuccess }: PasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/verify-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess();
        onClose();
        setPassword('');
      } else {
        setError(data.error || 'Incorrect password. Please try again.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    
    setLoading(false);
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-background border-border/10 sm:max-w-[500px]">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-2xl font-semibold">Access Verification</DialogTitle>
          <DialogDescription className="text-base">
            Enter the password to upload music to the platform. This step ensures only authorized users can add content.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="password" className="text-sm font-medium text-foreground/90">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background/70 border-border/40 text-foreground placeholder:text-muted-foreground h-12 text-lg"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>
            )}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 text-base"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !password.trim()}
              className="px-6 py-3 text-base"
            >
              {loading ? 'Verifying...' : 'Access Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

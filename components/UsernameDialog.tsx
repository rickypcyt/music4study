'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface UsernameDialogProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export default function UsernameDialog({ isOpen, onClose, userId }: UsernameDialogProps) {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) return;

        setLoading(true);
        try {
            // Actualizar el perfil del usuario en Supabase
            const { error } = await supabase
                .from('profiles_m4s')
                .upsert({
                    id: userId,
                    username: username.trim(),
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            toast({
                title: "Success!",
                description: "Your username has been set successfully.",
            });

            onClose();
        } catch (error) {
            console.error('Error setting username:', error);
            toast({
                title: "Error",
                description: "Failed to set username. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-background/95 backdrop-blur-sm border-border/10">
                <DialogHeader>
                    <DialogTitle>Choose Your Username</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Input
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
                            maxLength={30}
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={loading || !username.trim()}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        {loading ? 'Setting username...' : 'Set Username'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
} 
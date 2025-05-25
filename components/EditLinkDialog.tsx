import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface EditLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  link: {
    id: string;
    title: string;
    url: string;
    genre: string;
    type: string;
  };
  genres: { value: string; count: number }[];
  onUpdate: () => void;
}

export default function EditLinkDialog({ isOpen, onClose, link, genres, onUpdate }: EditLinkDialogProps) {
  const [formData, setFormData] = useState({
    title: link.title,
    genre: link.genre,
    type: link.type,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('links')
        .update({
          title: formData.title,
          genre: formData.genre,
          type: formData.type,
        })
        .eq('id', link.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Link updated successfully.",
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating link:', error);
      toast({
        title: "Error",
        description: "Failed to update link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1814] border-[#e6e2d9]/10">
        <DialogHeader>
          <DialogTitle>Edit Link</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="bg-[#e6e2d9]/10 text-[#e6e2d9] border-[#e6e2d9]/20"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Genre</label>
            <Select
              value={formData.genre}
              onValueChange={(value) => setFormData(prev => ({ ...prev, genre: value }))}
            >
              <SelectTrigger className="bg-[#e6e2d9]/10 text-[#e6e2d9] border-[#e6e2d9]/20">
                <SelectValue placeholder="Select a genre" />
              </SelectTrigger>
              <SelectContent>
                {genres.map((genre) => (
                  <SelectItem key={genre.value} value={genre.value}>
                    {genre.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="bg-[#e6e2d9]/10 text-[#e6e2d9] border-[#e6e2d9]/20">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="spotify">Spotify</SelectItem>
                <SelectItem value="soundcloud">SoundCloud</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {loading ? 'Updating...' : 'Update Link'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
} 
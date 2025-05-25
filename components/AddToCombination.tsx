'use client';

import { useState, useCallback, memo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Popup } from '@/components/ui/Popup';

interface Combination {
  id: string;
  name: string;
}

interface AddToCombinationProps {
  isOpen: boolean;
  onClose: () => void;
  linkId: string;
  onSuccess?: () => void;
}

const AddToCombination = memo(function AddToCombination({ isOpen, onClose, linkId, onSuccess }: AddToCombinationProps) {
  const [combinations, setCombinations] = useState<Combination[]>([]);
  const [selectedCombination, setSelectedCombination] = useState<string | null>(null);
  const [newCombinationName, setNewCombinationName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchCombinations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('combinations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCombinations(data || []);
    } catch (error) {
      console.error('Error fetching combinations:', error);
      toast({
        title: "Error",
        description: "Failed to load combinations. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleAddToCombination = useCallback(async () => {
    if (!selectedCombination) return;

    setLoading(true);
    try {
      // First check if the link is already in the combination
      const { data: existingLink, error: checkError } = await supabase
        .from('combination_links')
        .select('id')
        .eq('combination_id', selectedCombination)
        .eq('link_id', linkId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingLink) {
        toast({
          title: "Already Added",
          description: "This track is already in the combination.",
          variant: "destructive",
        });
        return;
      }

      const { error: insertError } = await supabase
        .from('combination_links')
        .insert([{
          combination_id: selectedCombination,
          link_id: linkId
        }]);

      if (insertError) throw insertError;

      toast({
        title: "Success!",
        description: "Track added to combination successfully.",
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error adding to combination:', error);
      toast({
        title: "Error",
        description: "Failed to add track to combination. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedCombination, linkId, toast, onClose, onSuccess]);

  const handleCreateCombination = useCallback(async () => {
    if (!newCombinationName.trim()) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('combinations')
        .insert([{ name: newCombinationName.trim() }])
        .select('id')
        .single();

      if (error) throw error;

      setSelectedCombination(data.id);
      setNewCombinationName('');
      setIsCreating(false);
      fetchCombinations();
      toast({
        title: "Success!",
        description: "Combination created successfully.",
      });
    } catch (error) {
      console.error('Error creating combination:', error);
      toast({
        title: "Error",
        description: "Failed to create combination. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }, [newCombinationName, fetchCombinations, toast]);

  // Load combinations when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCombinations();
    }
  }, [isOpen, fetchCombinations]);

  return (
    <Popup isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Add to Combination</h2>
        </div>
        <div className="space-y-4">
          <select
            className="w-full p-2 border rounded-md bg-background text-foreground border-border"
            value={selectedCombination || ''}
            onChange={(e) => setSelectedCombination(e.target.value)}
          >
            <option value="">Select a combination</option>
            {combinations.map((combo) => (
              <option key={combo.id} value={combo.id}>
                {combo.name}
              </option>
            ))}
          </select>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setIsCreating(true)}
              disabled={isCreating}
            >
              Create New
            </Button>
            <Button
              onClick={handleAddToCombination}
              disabled={!selectedCombination || loading}
              className="bg-primary hover:bg-primary/90"
            >
              Add
            </Button>
          </div>
        </div>

        {isCreating && (
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="text-sm font-medium mb-2">Create New Combination</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateCombination(); }} className="space-y-4">
              <Input
                placeholder="Combination name"
                value={newCombinationName}
                onChange={(e) => setNewCombinationName(e.target.value)}
                className="bg-background border-border"
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!newCombinationName.trim() || loading}
                  className="bg-primary hover:bg-primary/90"
                >
                  Create
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Popup>
  );
});

export default AddToCombination; 
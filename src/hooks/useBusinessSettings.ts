import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OpeningHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export interface BusinessSettings {
  id: string;
  user_id: string;
  opening_hours: OpeningHours;
}

// Default opening hours structure
const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '14:00', closed: false },
  sunday: { open: '09:00', close: '18:00', closed: true }, // Default: Sunday closed
};

// Map day index (0-6, Sunday=0) to day key
export const DAY_INDEX_TO_KEY: { [key: number]: string } = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

export const useBusinessSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['business-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('voice_agent_config')
        .select('id, user_id, opening_hours')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If no config exists, return default
      if (!data) {
        return {
          id: '',
          user_id: user.id,
          opening_hours: DEFAULT_OPENING_HOURS,
        } as BusinessSettings;
      }

      // Merge with defaults for any missing days
      const openingHours = {
        ...DEFAULT_OPENING_HOURS,
        ...(data.opening_hours as OpeningHours || {}),
      };

      return {
        id: data.id,
        user_id: data.user_id,
        opening_hours: openingHours,
      } as BusinessSettings;
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (openingHours: OpeningHours) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if config exists
      const { data: existing } = await supabase
        .from('voice_agent_config')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('voice_agent_config')
          .update({ opening_hours: openingHours })
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('voice_agent_config')
          .insert({ user_id: user.id, opening_hours: openingHours });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
      toast.success('Ruhetage gespeichert');
    },
    onError: (error) => {
      toast.error('Fehler beim Speichern: ' + error.message);
    },
  });

  // Helper function to check if a specific day is a closed day
  const isDayClosed = (dayIndex: number): boolean => {
    const dayKey = DAY_INDEX_TO_KEY[dayIndex];
    if (!dayKey || !query.data?.opening_hours) return false;
    return query.data.opening_hours[dayKey]?.closed ?? false;
  };

  return {
    settings: query.data,
    isLoading: query.isLoading,
    openingHours: query.data?.opening_hours || DEFAULT_OPENING_HOURS,
    isDayClosed,
    updateOpeningHours: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};

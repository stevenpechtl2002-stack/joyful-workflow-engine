import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface StaffMember {
  id: string;
  user_id: string;
  name: string;
  color: string;
  avatar_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useStaffMembers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['staff-members', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as StaffMember[];
    },
    enabled: !!user?.id,
  });
};

export const useCreateStaffMember = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; color: string; avatar_url?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('staff_members')
        .insert({
          user_id: user.id,
          name: data.name,
          color: data.color,
          avatar_url: data.avatar_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast.success('Mitarbeiter hinzugefügt');
    },
    onError: (error) => {
      toast.error('Fehler beim Hinzufügen: ' + error.message);
    },
  });
};

export const useUpdateStaffMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<StaffMember> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('staff_members')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast.success('Mitarbeiter aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    },
  });
};

export const useDeleteStaffMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff_members')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] });
      toast.success('Mitarbeiter entfernt');
    },
    onError: (error) => {
      toast.error('Fehler beim Entfernen: ' + error.message);
    },
  });
};

export const useUpdateReservationStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reservationId, staffMemberId }: { reservationId: string; staffMemberId: string | null }) => {
      const { error } = await supabase
        .from('reservations')
        .update({ staff_member_id: staffMemberId })
        .eq('id', reservationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Termin verschoben');
    },
    onError: (error) => {
      toast.error('Fehler beim Verschieben: ' + error.message);
    },
  });
};

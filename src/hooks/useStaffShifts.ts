import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface StaffShift {
  id: string;
  user_id: string;
  staff_member_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftInput {
  staff_member_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

export const useStaffShifts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: shifts = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['staff-shifts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_shifts')
        .select('*')
        .eq('user_id', user!.id)
        .order('staff_member_id')
        .order('day_of_week');

      if (error) throw error;
      return data as StaffShift[];
    },
    enabled: !!user?.id
  });

  const upsertShift = useMutation({
    mutationFn: async (input: ShiftInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('staff_shifts')
        .upsert({
          user_id: user.id,
          staff_member_id: input.staff_member_id,
          day_of_week: input.day_of_week,
          start_time: input.start_time,
          end_time: input.end_time,
          is_working: input.is_working
        }, {
          onConflict: 'staff_member_id,day_of_week'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-shifts'] });
    },
    onError: (error) => {
      console.error('Error saving shift:', error);
      toast.error('Fehler beim Speichern des Dienstplans');
    }
  });

  const upsertBulkShifts = useMutation({
    mutationFn: async (inputs: ShiftInput[]) => {
      if (!user?.id) throw new Error('Not authenticated');

      const shiftsToUpsert = inputs.map(input => ({
        user_id: user.id,
        staff_member_id: input.staff_member_id,
        day_of_week: input.day_of_week,
        start_time: input.start_time,
        end_time: input.end_time,
        is_working: input.is_working
      }));

      const { error } = await supabase
        .from('staff_shifts')
        .upsert(shiftsToUpsert, {
          onConflict: 'staff_member_id,day_of_week'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-shifts'] });
      toast.success('Dienstpläne gespeichert');
    },
    onError: (error) => {
      console.error('Error saving shifts:', error);
      toast.error('Fehler beim Speichern der Dienstpläne');
    }
  });

  const deleteShift = useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase
        .from('staff_shifts')
        .delete()
        .eq('id', shiftId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-shifts'] });
    }
  });

  const getShiftForStaffAndDay = (staffId: string, dayOfWeek: number): StaffShift | undefined => {
    return shifts.find(s => s.staff_member_id === staffId && s.day_of_week === dayOfWeek);
  };

  return {
    shifts,
    isLoading,
    error,
    upsertShift,
    upsertBulkShifts,
    deleteShift,
    getShiftForStaffAndDay,
    isUpserting: upsertShift.isPending,
    isBulkUpserting: upsertBulkShifts.isPending
  };
};

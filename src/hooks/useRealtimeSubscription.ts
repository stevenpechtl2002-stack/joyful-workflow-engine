import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRealtimeSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up realtime subscriptions for user:', user.id);

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime reservation update:', payload);
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime call_logs update:', payload);
          queryClient.invalidateQueries({ queryKey: ['call-logs'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime notification update:', payload);
          queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_stats',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime daily_stats update:', payload);
          queryClient.invalidateQueries({ queryKey: ['daily-stats'] });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Dashboard Stats
export const useDashboardStats = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const today = new Date().toISOString().split('T')[0];
      
      // Get total reservations
      const { count: totalReservations } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      // Get today's reservations
      const { count: todayReservations } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('reservation_date', today);
      
      // Get answered calls
      const { count: answeredCalls } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('call_status', 'completed');
      
      // Get missed calls
      const { count: missedCalls } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('call_status', 'missed');
      
      // Get new customers (unique phone numbers this month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: newCustomerData } = await supabase
        .from('reservations')
        .select('customer_phone')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())
        .not('customer_phone', 'is', null);
      
      const uniqueCustomers = new Set(newCustomerData?.map(r => r.customer_phone)).size;
      
      // Calculate conversion rate
      const totalCalls = (answeredCalls || 0) + (missedCalls || 0);
      const { count: successfulReservations } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('call_outcome', 'reservation_made');
      
      const conversionRate = totalCalls > 0 
        ? Math.round(((successfulReservations || 0) / totalCalls) * 100) 
        : 0;
      
      return {
        totalReservations: totalReservations || 0,
        todayReservations: todayReservations || 0,
        answeredCalls: answeredCalls || 0,
        missedCalls: missedCalls || 0,
        newCustomers: uniqueCustomers,
        conversionRate
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });
};

// Reservations
export const useReservations = (filters?: { status?: string; date?: string }) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['reservations', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('reservations')
        .select('*')
        .eq('user_id', user.id)
        .order('reservation_date', { ascending: true })
        .order('reservation_time', { ascending: true });
      
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.date) {
        query = query.eq('reservation_date', filters.date);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
};

// Call Logs
export const useCallLogs = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['call-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('call_logs')
        .select('*, reservations(customer_name)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
};

// Voice Agent Config
export const useVoiceAgentConfig = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['voice-agent-config', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('voice_agent_config')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id
  });
};

// Support Tickets
export const useSupportTickets = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['support-tickets', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
};

// Daily Stats for Charts
export const useDailyStats = (days: number = 30) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['daily-stats', user?.id, days],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', user.id)
        .gte('stat_date', startDate.toISOString().split('T')[0])
        .order('stat_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
};

// Unread Notifications Count
export const useUnreadNotifications = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['unread-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      return count || 0;
    },
    enabled: !!user?.id
  });
};

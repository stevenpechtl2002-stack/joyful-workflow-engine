-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for daily_stats table
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_stats;
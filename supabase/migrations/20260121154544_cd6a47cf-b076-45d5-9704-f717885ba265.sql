-- Create table for staff shift schedules
CREATE TABLE public.staff_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  is_working BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_member_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own staff shifts"
ON public.staff_shifts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own staff shifts"
ON public.staff_shifts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own staff shifts"
ON public.staff_shifts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own staff shifts"
ON public.staff_shifts
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all staff shifts"
ON public.staff_shifts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_staff_shifts_updated_at
BEFORE UPDATE ON public.staff_shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
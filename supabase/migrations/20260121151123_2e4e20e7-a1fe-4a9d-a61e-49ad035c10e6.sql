-- Create staff_members table
CREATE TABLE public.staff_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own staff members"
ON public.staff_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own staff members"
ON public.staff_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own staff members"
ON public.staff_members
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own staff members"
ON public.staff_members
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all staff members"
ON public.staff_members
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add staff_member_id to reservations table
ALTER TABLE public.reservations
ADD COLUMN staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX idx_reservations_staff_member ON public.reservations(staff_member_id);
CREATE INDEX idx_staff_members_user ON public.staff_members(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_staff_members_updated_at
BEFORE UPDATE ON public.staff_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
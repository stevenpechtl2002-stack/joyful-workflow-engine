-- Create table for storing n8n workflow runs per customer
CREATE TABLE public.workflow_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workflow_id TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  trigger_type TEXT DEFAULT 'manual',
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

-- Users can view their own workflow runs
CREATE POLICY "Users can view their own workflow runs"
ON public.workflow_runs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own workflow runs
CREATE POLICY "Users can create their own workflow runs"
ON public.workflow_runs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all workflow runs
CREATE POLICY "Admins can manage all workflow runs"
ON public.workflow_runs
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Block anonymous access
CREATE POLICY "Block anonymous access to workflow_runs"
ON public.workflow_runs
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow service role to update workflow runs (for webhooks)
CREATE POLICY "Service can update workflow runs"
ON public.workflow_runs
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_workflow_runs_updated_at
BEFORE UPDATE ON public.workflow_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for workflow status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_runs;
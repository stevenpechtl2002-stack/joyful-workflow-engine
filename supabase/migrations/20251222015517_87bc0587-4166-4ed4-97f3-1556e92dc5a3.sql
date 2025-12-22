-- Workflow Templates (Admin-definiert)
CREATE TABLE public.workflow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  n8n_workflow_id TEXT,
  icon TEXT DEFAULT 'Workflow',
  is_active BOOLEAN DEFAULT true,
  required_credentials JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Format: [{"key": "api_key", "label": "API Schlüssel", "type": "api_key", "description": "Ihr API Key", "required": true}]
  configuration_schema JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customer Workflow Instances
CREATE TABLE public.customer_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_credentials',
  -- Status: pending_credentials, pending_approval, approved, active, paused, error
  credentials JSONB DEFAULT '{}'::jsonb,
  -- Encrypted/stored credentials from customer
  configuration JSONB DEFAULT '{}'::jsonb,
  -- Custom configuration per customer
  n8n_workflow_id TEXT,
  -- Actual n8n workflow ID once deployed
  admin_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  activated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_workflows ENABLE ROW LEVEL SECURITY;

-- Workflow Templates Policies (public read, admin write)
CREATE POLICY "Anyone can view active templates"
  ON public.workflow_templates
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.workflow_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Customer Workflows Policies
CREATE POLICY "Block anonymous access to customer_workflows"
  ON public.customer_workflows
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own workflows"
  ON public.customer_workflows
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows"
  ON public.customer_workflows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending workflows"
  ON public.customer_workflows
  FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending_credentials', 'pending_approval'));

CREATE POLICY "Admins can manage all customer workflows"
  ON public.customer_workflows
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_workflow_templates_updated_at
  BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_workflows_updated_at
  BEFORE UPDATE ON public.customer_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert example templates
INSERT INTO public.workflow_templates (name, description, category, icon, required_credentials) VALUES
('E-Mail Automation', 'Automatische E-Mail-Benachrichtigungen und Newsletter', 'communication', 'Mail', 
 '[{"key": "smtp_host", "label": "SMTP Server", "type": "text", "required": true}, 
   {"key": "smtp_user", "label": "SMTP Benutzername", "type": "text", "required": true},
   {"key": "smtp_password", "label": "SMTP Passwort", "type": "password", "required": true}]'::jsonb),

('CRM Integration', 'Synchronisierung mit Ihrem CRM System', 'integration', 'Users', 
 '[{"key": "crm_api_key", "label": "CRM API Key", "type": "api_key", "required": true},
   {"key": "crm_url", "label": "CRM URL", "type": "text", "required": true}]'::jsonb),

('Kalender Sync', 'Automatische Kalendersynchronisierung', 'productivity', 'Calendar', 
 '[{"key": "google_oauth", "label": "Google Konto verbinden", "type": "oauth", "provider": "google", "required": true}]'::jsonb),

('Dokumenten-Verarbeitung', 'Automatische Dokumentenverarbeitung und OCR', 'documents', 'FileText', 
 '[{"key": "storage_api_key", "label": "Storage API Key", "type": "api_key", "required": false}]'::jsonb);
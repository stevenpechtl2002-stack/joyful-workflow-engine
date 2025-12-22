import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Settings, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Eye, 
  EyeOff,
  Mail,
  Users,
  Calendar,
  FileText,
  Workflow,
  Loader2,
  Plus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CredentialField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
  provider?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  required_credentials: CredentialField[];
  is_active: boolean;
}

interface CustomerWorkflow {
  id: string;
  template_id: string;
  status: string;
  credentials: Record<string, string>;
  configuration: Record<string, unknown>;
  created_at: string;
  approved_at: string | null;
  activated_at: string | null;
  workflow_templates?: WorkflowTemplate;
}

// Helper to safely parse JSON credentials
const parseCredentials = (creds: unknown): Record<string, string> => {
  if (typeof creds === 'object' && creds !== null && !Array.isArray(creds)) {
    return creds as Record<string, string>;
  }
  if (typeof creds === 'string') {
    try {
      return JSON.parse(creds);
    } catch {
      return {};
    }
  }
  return {};
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  Users,
  Calendar,
  FileText,
  Workflow,
  Settings,
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending_credentials: { label: "Credentials ausstehend", color: "bg-yellow-500/10 text-yellow-500", icon: Clock },
  pending_approval: { label: "Wartet auf Freigabe", color: "bg-blue-500/10 text-blue-500", icon: Clock },
  approved: { label: "Freigegeben", color: "bg-green-500/10 text-green-500", icon: CheckCircle },
  active: { label: "Aktiv", color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle },
  paused: { label: "Pausiert", color: "bg-gray-500/10 text-gray-500", icon: AlertCircle },
  error: { label: "Fehler", color: "bg-red-500/10 text-red-500", icon: AlertCircle },
};

export default function WorkflowSetup() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [customerWorkflows, setCustomerWorkflows] = useState<CustomerWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [templatesRes, workflowsRes] = await Promise.all([
        supabase.from("workflow_templates").select("*").eq("is_active", true),
        supabase
          .from("customer_workflows")
          .select("*, workflow_templates(*)")
          .eq("user_id", user?.id)
          .order("created_at", { ascending: false }),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (workflowsRes.error) throw workflowsRes.error;

      // Parse required_credentials as CredentialField[]
      const parsedTemplates = (templatesRes.data || []).map((t) => ({
        ...t,
        required_credentials: (typeof t.required_credentials === 'string' 
          ? JSON.parse(t.required_credentials) 
          : t.required_credentials) as CredentialField[],
      }));

      // Parse customer workflows with proper credential handling
      const parsedWorkflows = (workflowsRes.data || []).map((w) => {
        const wfTemplate = w.workflow_templates as Record<string, unknown> | null;
        return {
          id: w.id,
          template_id: w.template_id,
          status: w.status,
          credentials: parseCredentials(w.credentials),
          configuration: typeof w.configuration === 'object' ? w.configuration as Record<string, unknown> : {},
          created_at: w.created_at,
          approved_at: w.approved_at,
          activated_at: w.activated_at,
          workflow_templates: wfTemplate ? {
            id: wfTemplate.id as string,
            name: wfTemplate.name as string,
            description: wfTemplate.description as string,
            category: wfTemplate.category as string,
            icon: wfTemplate.icon as string,
            is_active: wfTemplate.is_active as boolean,
            required_credentials: (typeof wfTemplate.required_credentials === 'string'
              ? JSON.parse(wfTemplate.required_credentials)
              : wfTemplate.required_credentials) as CredentialField[],
          } : undefined,
        };
      });

      setTemplates(parsedTemplates);
      setCustomerWorkflows(parsedWorkflows);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setCredentials({});
    setShowPasswords({});
    setDialogOpen(true);
  };

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !user) return;

    // Check required fields
    const missingFields = selectedTemplate.required_credentials
      .filter((field) => field.required && !credentials[field.key])
      .map((field) => field.label);

    if (missingFields.length > 0) {
      toast.error(`Bitte füllen Sie alle Pflichtfelder aus: ${missingFields.join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("customer_workflows").insert({
        user_id: user.id,
        template_id: selectedTemplate.id,
        credentials,
        status: "pending_approval",
      });

      if (error) throw error;

      toast.success("Workflow wurde eingereicht und wartet auf Admin-Freigabe");
      setDialogOpen(false);
      setSelectedTemplate(null);
      setCredentials({});
      fetchData();
    } catch (error) {
      console.error("Error submitting workflow:", error);
      toast.error("Fehler beim Einreichen des Workflows");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCredentials = async (workflow: CustomerWorkflow) => {
    // Find the template for this workflow
    const template = templates.find((t) => t.id === workflow.template_id) || 
      (workflow.workflow_templates ? {
        ...workflow.workflow_templates,
        required_credentials: (typeof workflow.workflow_templates.required_credentials === 'string'
          ? JSON.parse(workflow.workflow_templates.required_credentials)
          : workflow.workflow_templates.required_credentials) as CredentialField[]
      } : null);
    
    if (template) {
      setSelectedTemplate(template);
      setCredentials(workflow.credentials || {});
      setDialogOpen(true);
    }
  };

  const getTemplateIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Workflow;
    return <IconComponent className="h-6 w-6" />;
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending_credentials;
    const StatusIcon = config.icon;
    return (
      <Badge variant="secondary" className={config.color}>
        <StatusIcon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Get templates that user hasn't set up yet
  const availableTemplates = templates.filter(
    (template) => !customerWorkflows.some((cw) => cw.template_id === template.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Workflow Einrichtung</h1>
        <p className="text-muted-foreground mt-2">
          Richten Sie Ihre Automatisierungen ein und verwalten Sie Ihre Credentials
        </p>
      </div>

      {/* My Workflows */}
      {customerWorkflows.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Meine Workflows</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customerWorkflows.map((workflow) => {
              const template = workflow.workflow_templates as WorkflowTemplate | undefined;
              const parsedTemplate = template ? {
                ...template,
                required_credentials: (typeof template.required_credentials === 'string'
                  ? JSON.parse(template.required_credentials)
                  : template.required_credentials) as CredentialField[]
              } : null;
              
              return (
                <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {getTemplateIcon(parsedTemplate?.icon || "Workflow")}
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {parsedTemplate?.name || "Workflow"}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {parsedTemplate?.category || ""}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      {getStatusBadge(workflow.status)}
                      {workflow.activated_at && (
                        <span className="text-xs text-muted-foreground">
                          Aktiv seit {new Date(workflow.activated_at).toLocaleDateString("de-DE")}
                        </span>
                      )}
                    </div>
                    
                    {workflow.status === "pending_credentials" && (
                      <Button 
                        onClick={() => handleUpdateCredentials(workflow)}
                        className="w-full"
                        variant="outline"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Credentials eingeben
                      </Button>
                    )}
                    
                    {workflow.status === "pending_approval" && (
                      <p className="text-sm text-muted-foreground text-center">
                        Ihre Anfrage wird innerhalb von 24 Stunden bearbeitet
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Templates */}
      {availableTemplates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Verfügbare Vorlagen</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableTemplates.map((template) => (
              <Card 
                key={template.id} 
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleSelectTemplate(template)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {getTemplateIcon(template.icon)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.category}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {template.required_credentials.filter((c) => c.required).length} Pflichtfelder
                    </span>
                    <Button variant="ghost" size="sm" className="group-hover:bg-primary/10">
                      <Plus className="h-4 w-4 mr-1" />
                      Einrichten
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No templates message */}
      {templates.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Vorlagen verfügbar</h3>
            <p className="text-muted-foreground">
              Es sind derzeit keine Workflow-Vorlagen verfügbar. Kontaktieren Sie Ihren Administrator.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Credential Input Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedTemplate && (
                <>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {getTemplateIcon(selectedTemplate.icon)}
                  </div>
                  {selectedTemplate.name} einrichten
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Geben Sie Ihre Zugangsdaten ein. Nach dem Absenden wird Ihr Workflow innerhalb von 24 Stunden freigeschaltet.
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4 mt-4">
              {selectedTemplate.required_credentials.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                  <div className="relative">
                    <Input
                      id={field.key}
                      type={
                        field.type === "password" || field.type === "api_key"
                          ? showPasswords[field.key]
                            ? "text"
                            : "password"
                          : "text"
                      }
                      value={credentials[field.key] || ""}
                      onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                      placeholder={field.label}
                      className="pr-10"
                    />
                    {(field.type === "password" || field.type === "api_key") && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => togglePasswordVisibility(field.key)}
                      >
                        {showPasswords[field.key] ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    )}
                  </div>
                  {field.type === "oauth" && (
                    <Button variant="outline" className="w-full mt-2" disabled>
                      Mit {field.provider} verbinden (Coming Soon)
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Wird eingereicht...
                    </>
                  ) : (
                    "Zur Freigabe einreichen"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

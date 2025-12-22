import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  Workflow,
  Phone,
  Mic,
  Settings,
  ArrowRight,
  Key
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  required_credentials: unknown;
  configuration_schema: unknown;
  n8n_workflow_id: string | null;
  is_active: boolean | null;
}

interface CustomerWorkflow {
  id: string;
  template_id: string;
  status: string;
  credentials: unknown;
  configuration: unknown;
  n8n_workflow_id: string | null;
  created_at: string;
  workflow_templates?: WorkflowTemplate;
}

interface CredentialField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

interface WorkflowRun {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  trigger_type: string | null;
  input_data: unknown;
  output_data: unknown;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const getIconComponent = (iconName: string | null) => {
  switch (iconName) {
    case 'Phone':
      return Phone;
    case 'Mic':
      return Mic;
    default:
      return Workflow;
  }
};

const Workflows = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [customerWorkflows, setCustomerWorkflows] = useState<CustomerWorkflow[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCredentialDialog, setShowCredentialDialog] = useState(false);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    
    try {
      // Fetch active templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_active', true);
      
      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Fetch customer's workflows
      const { data: customerData, error: customerError } = await supabase
        .from('customer_workflows')
        .select('*, workflow_templates(*)')
        .order('created_at', { ascending: false });
      
      if (customerError) throw customerError;
      setCustomerWorkflows(customerData || []);

      // Fetch workflow runs
      const { data: runsData, error: runsError } = await supabase
        .from('workflow_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (runsError) throw runsError;
      setWorkflowRuns(runsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('workflows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_workflows'
        },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_runs'
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    // Check if user already has this workflow
    const existingWorkflow = customerWorkflows.find(cw => cw.template_id === template.id);
    
    if (existingWorkflow) {
      toast({
        title: 'Workflow bereits vorhanden',
        description: `Sie haben bereits "${template.name}" eingerichtet. Status: ${getStatusLabel(existingWorkflow.status)}`,
      });
      return;
    }

    const requiredCreds = template.required_credentials as CredentialField[] | null;
    
    if (requiredCreds && Array.isArray(requiredCreds) && requiredCreds.length > 0) {
      setSelectedTemplate(template);
      setCredentials({});
      setShowCredentialDialog(true);
    } else {
      // No credentials needed, create workflow directly
      createWorkflow(template, {});
    }
  };

  const createWorkflow = async (template: WorkflowTemplate, creds: Record<string, string>) => {
    if (!session?.user?.id) return;
    
    setIsSubmitting(true);
    try {
      // Create customer workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('customer_workflows')
        .insert({
          user_id: session.user.id,
          template_id: template.id,
          credentials: creds,
          status: Object.keys(creds).length > 0 ? 'pending_approval' : 'pending_credentials'
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Trigger n8n to set up the workflow
      const { error: triggerError } = await supabase.functions.invoke('trigger-workflow', {
        body: {
          workflow_id: template.n8n_workflow_id || template.id,
          workflow_name: template.name,
          input_data: {
            action: 'setup_workflow',
            template_id: template.id,
            customer_workflow_id: workflow.id,
            credentials: creds
          }
        }
      });

      if (triggerError) {
        console.warn('n8n trigger warning:', triggerError);
      }

      toast({
        title: 'Workflow erstellt',
        description: Object.keys(creds).length > 0 
          ? 'Ihr Workflow wartet auf Admin-Freigabe (innerhalb von 24 Std.).'
          : 'Bitte geben Sie die erforderlichen Zugangsdaten ein.',
      });

      setShowCredentialDialog(false);
      setSelectedTemplate(null);
      setCredentials({});
      fetchData();
    } catch (error: any) {
      console.error('Error creating workflow:', error);
      toast({
        title: 'Fehler',
        description: 'Workflow konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitCredentials = () => {
    if (!selectedTemplate) return;
    
    const requiredCreds = selectedTemplate.required_credentials as CredentialField[] | null;
    
    // Validate required fields
    if (requiredCreds && Array.isArray(requiredCreds)) {
      const missingFields = requiredCreds
        .filter(field => field.required && !credentials[field.name]?.trim())
        .map(field => field.label);
      
      if (missingFields.length > 0) {
        toast({
          title: 'Fehlende Felder',
          description: `Bitte füllen Sie aus: ${missingFields.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
    }

    createWorkflow(selectedTemplate, credentials);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_credentials': return 'Zugangsdaten erforderlich';
      case 'pending_approval': return 'Wartet auf Freigabe';
      case 'approved': return 'Freigegeben';
      case 'active': return 'Aktiv';
      case 'paused': return 'Pausiert';
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aktiv
          </Badge>
        );
      case 'pending_approval':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Wartet auf Freigabe
          </Badge>
        );
      case 'pending_credentials':
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            <Key className="w-3 h-3 mr-1" />
            Zugangsdaten erforderlich
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Freigegeben
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground border-border">
            {status}
          </Badge>
        );
    }
  };

  const getRunStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Abgeschlossen
          </Badge>
        );
      case 'running':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Läuft
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Fehlgeschlagen
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Ausstehend
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Automatisierungen
          </h1>
          <p className="text-muted-foreground">
            Wählen Sie einen Assistenten aus und richten Sie ihn ein
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Aktualisieren
        </Button>
      </motion.div>

      {/* Available Templates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="text-xl font-semibold text-foreground mb-4">Verfügbare Assistenten</h2>
        {templates.length === 0 ? (
          <Card className="glass border-border/50">
            <CardContent className="py-12 text-center">
              <Workflow className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Keine Vorlagen verfügbar. Bitte kontaktieren Sie den Administrator.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const Icon = getIconComponent(template.icon);
              const hasExisting = customerWorkflows.some(cw => cw.template_id === template.id);
              
              return (
                <Card 
                  key={template.id} 
                  className={`glass border-border/50 transition-all hover:border-primary/50 ${hasExisting ? 'opacity-60' : 'cursor-pointer'}`}
                  onClick={() => !hasExisting && handleSelectTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.category && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {template.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4 min-h-[40px]">
                      {template.description || 'Keine Beschreibung verfügbar'}
                    </CardDescription>
                    <Button 
                      className="w-full"
                      size="sm"
                      disabled={hasExisting}
                      variant={hasExisting ? "outline" : "default"}
                    >
                      {hasExisting ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Bereits eingerichtet
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Auswählen
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* My Workflows */}
      {customerWorkflows.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-foreground mb-4">Meine Workflows</h2>
          <div className="space-y-3">
            {customerWorkflows.map((workflow) => {
              const template = workflow.workflow_templates as WorkflowTemplate | undefined;
              const Icon = getIconComponent(template?.icon || null);
              
              return (
                <Card key={workflow.id} className="glass border-border/50">
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {template?.name || 'Unbekannter Workflow'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Erstellt: {formatDate(workflow.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(workflow.status)}
                        {workflow.status === 'pending_credentials' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (template) {
                                setSelectedTemplate(template);
                                setCredentials({});
                                setShowCredentialDialog(true);
                              }
                            }}
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Einrichten
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Recent Workflow Runs */}
      {workflowRuns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-semibold text-foreground mb-4">Letzte Ausführungen</h2>
          <div className="space-y-3">
            {workflowRuns.map((run) => (
              <Card key={run.id} className="glass border-border/50">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Workflow className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{run.workflow_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {run.started_at && formatDate(run.started_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getRunStatusBadge(run.status)}
                      {run.error_message && (
                        <span className="text-xs text-red-400 max-w-[200px] truncate">
                          {run.error_message}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Credential Dialog */}
      <Dialog open={showCredentialDialog} onOpenChange={setShowCredentialDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              {selectedTemplate?.name} einrichten
            </DialogTitle>
            <DialogDescription>
              Geben Sie Ihre Zugangsdaten ein. Diese werden sicher gespeichert und nach Admin-Freigabe aktiviert.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedTemplate && Array.isArray(selectedTemplate.required_credentials) && 
              (selectedTemplate.required_credentials as CredentialField[]).map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <Input
                    id={field.name}
                    type={field.type === 'password' || field.type === 'api_key' ? 'password' : 'text'}
                    placeholder={field.placeholder || `${field.label} eingeben...`}
                    value={credentials[field.name] || ''}
                    onChange={(e) => setCredentials(prev => ({
                      ...prev,
                      [field.name]: e.target.value
                    }))}
                  />
                </div>
              ))
            }
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCredentialDialog(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleSubmitCredentials}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Speichern & Freigabe anfordern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workflows;

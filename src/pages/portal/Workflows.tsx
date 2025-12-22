import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ArrowRight,
  Activity
} from 'lucide-react';

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

const AVAILABLE_WORKFLOWS = [
  {
    id: 'sync-appointments',
    name: 'Termine synchronisieren',
    description: 'Synchronisiert Ihre Termine mit dem Kalendersystem',
    icon: Clock
  },
  {
    id: 'process-documents',
    name: 'Dokumente verarbeiten',
    description: 'Verarbeitet hochgeladene Dokumente mit KI',
    icon: Activity
  },
  {
    id: 'send-notifications',
    name: 'Benachrichtigungen senden',
    description: 'Sendet ausstehende Benachrichtigungen',
    icon: ArrowRight
  }
];

const Workflows = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [triggeringWorkflow, setTriggeringWorkflow] = useState<string | null>(null);

  const fetchWorkflowRuns = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('workflow_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setWorkflowRuns(data || []);
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflowRuns();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('workflow-runs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_runs'
        },
        (payload) => {
          console.log('Workflow run update:', payload);
          fetchWorkflowRuns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const triggerWorkflow = async (workflowId: string, workflowName: string) => {
    if (!session?.user?.id) return;
    
    setTriggeringWorkflow(workflowId);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-workflow', {
        body: { 
          workflow_id: workflowId,
          workflow_name: workflowName
        }
      });

      if (error) throw error;

      toast({
        title: 'Workflow gestartet',
        description: `${workflowName} wurde erfolgreich gestartet.`,
      });

      fetchWorkflowRuns();
    } catch (error: any) {
      console.error('Error triggering workflow:', error);
      toast({
        title: 'Fehler',
        description: 'Workflow konnte nicht gestartet werden.',
        variant: 'destructive',
      });
    } finally {
      setTriggeringWorkflow(null);
    }
  };

  const getStatusBadge = (status: string) => {
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
            Starten und überwachen Sie Ihre Workflows
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchWorkflowRuns}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Aktualisieren
        </Button>
      </motion.div>

      {/* Available Workflows */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="text-xl font-semibold text-foreground mb-4">Verfügbare Workflows</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AVAILABLE_WORKFLOWS.map((workflow) => {
            const Icon = workflow.icon;
            const isTriggering = triggeringWorkflow === workflow.id;
            
            return (
              <Card key={workflow.id} className="glass border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">{workflow.description}</CardDescription>
                  <Button 
                    onClick={() => triggerWorkflow(workflow.id, workflow.name)}
                    disabled={isTriggering}
                    className="w-full"
                    size="sm"
                  >
                    {isTriggering ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Starten
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Workflow Runs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold text-foreground mb-4">Letzte Ausführungen</h2>
        
        {workflowRuns.length === 0 ? (
          <Card className="glass border-border/50">
            <CardContent className="py-12 text-center">
              <Workflow className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Noch keine Workflow-Ausführungen vorhanden
              </p>
            </CardContent>
          </Card>
        ) : (
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
                          {formatDate(run.started_at)}
                          {run.trigger_type === 'manual' && ' • Manuell'}
                          {run.trigger_type === 'webhook' && ' • Automatisch'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(run.status)}
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
        )}
      </motion.div>
    </div>
  );
};

export default Workflows;

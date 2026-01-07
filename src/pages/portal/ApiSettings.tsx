import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Key, 
  Copy, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Webhook,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

const ApiSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch customer data with API key
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer-api-key', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('customers')
        .select('api_key, status, plan')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Regenerate API key mutation
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('customers')
        .update({ api_key: crypto.randomUUID() })
        .eq('id', user.id)
        .select('api_key')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-api-key'] });
      toast.success('API-Key wurde erfolgreich neu generiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Generieren des API-Keys');
      console.error(error);
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} in die Zwischenablage kopiert`);
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-reservations`;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-foreground mb-2">API-Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihren API-Key für n8n-Integrationen und externe Webhooks.
        </p>
      </motion.div>

      {/* API Key Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Ihr API-Key</CardTitle>
                <CardDescription>
                  Verwenden Sie diesen Key zur Authentifizierung von n8n-Webhooks
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={customer?.api_key || ''}
                      readOnly
                      className="pr-20 font-mono text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(customer?.api_key || '', 'API-Key')}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Kopieren
                  </Button>
                </div>
                
                <div className="flex items-center gap-4">
                  <Button
                    variant="destructive"
                    onClick={() => regenerateMutation.mutate()}
                    disabled={regenerateMutation.isPending}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
                    Neuen Key generieren
                  </Button>
                  <Badge variant={customer?.status === 'active' ? 'default' : 'secondary'}>
                    {customer?.status === 'active' ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" /> Aktiv</>
                    ) : (
                      <><AlertCircle className="w-3 h-3 mr-1" /> Inaktiv</>
                    )}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Webhook Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Webhook className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle>n8n Webhook-Konfiguration</CardTitle>
                <CardDescription>
                  Verwenden Sie diese URL in Ihrem n8n-Workflow
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Webhook-URL für Reservierungen</Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(webhookUrl, 'Webhook-URL')}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Kopieren
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm">n8n HTTP Request Konfiguration</h4>
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-24">Method:</span>
                  <code className="bg-background px-2 py-0.5 rounded">POST</code>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-24">Header:</span>
                  <code className="bg-background px-2 py-0.5 rounded">x-api-key: {showApiKey ? customer?.api_key : '••••••••'}</code>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-24">Content-Type:</span>
                  <code className="bg-background px-2 py-0.5 rounded">application/json</code>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm">Beispiel JSON-Body</h4>
              <pre className="bg-background rounded-lg p-3 text-xs overflow-x-auto">
{`{
  "customer_name": "Max Mustermann",
  "customer_phone": "+49 123 456789",
  "customer_email": "max@example.com",
  "reservation_date": "2026-01-15",
  "reservation_time": "19:00",
  "party_size": 4,
  "notes": "Fensterplatz gewünscht"
}`}
              </pre>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a 
                href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                n8n HTTP Request Dokumentation
              </a>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ApiSettings;

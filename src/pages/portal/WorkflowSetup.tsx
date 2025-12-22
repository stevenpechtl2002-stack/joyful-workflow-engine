import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Phone, Loader2, CheckCircle } from "lucide-react";

export default function WorkflowSetup() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleTelefonAssistent = async () => {
    if (!user) {
      toast.error("Bitte melden Sie sich an");
      return;
    }

    setLoading(true);
    try {
      // Get user session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Keine aktive Session");
      }

      // Call the edge function to trigger n8n webhook
      const { data, error } = await supabase.functions.invoke('trigger-workflow', {
        body: {
          workflow_id: 'telefon-assistent',
          workflow_name: 'Telefon Assistent',
          action: 'setup_workflow',
          input_data: {
            customer_name: profile?.full_name || profile?.company_name || user.email?.split('@')[0] || 'Kunde'
          }
        }
      });

      if (error) throw error;

      console.log("Webhook response:", data);
      setSuccess(true);
      toast.success("Telefon Assistent wird eingerichtet!");
    } catch (error) {
      console.error("Error triggering workflow:", error);
      toast.error("Fehler beim Auslösen des Webhooks");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Workflow Einrichtung</h1>
        <p className="text-muted-foreground mt-2">
          Wählen Sie Ihren Assistenten aus
        </p>
      </div>

      {/* Telefon Assistent Card */}
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Phone className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-xl">Telefon Assistent</CardTitle>
              <CardDescription>KI-gestützter Telefonassistent</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Aktivieren Sie Ihren persönlichen Telefon-Assistenten. 
            Er wird automatisch mit Ihrem Namen konfiguriert.
          </p>
          
          {success ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Erfolgreich gesendet! Ihr Assistent wird eingerichtet.</span>
            </div>
          ) : (
            <Button 
              onClick={handleTelefonAssistent} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Wird gesendet...
                </>
              ) : (
                <>
                  <Phone className="h-5 w-5 mr-2" />
                  Telefon Assistent aktivieren
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

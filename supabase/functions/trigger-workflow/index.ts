import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRIGGER-WORKFLOW] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id });

    // Get request body
    const { workflow_id, workflow_name, input_data = {} } = await req.json();
    
    if (!workflow_id || !workflow_name) {
      throw new Error("workflow_id and workflow_name are required");
    }

    logStep("Workflow request", { workflow_id, workflow_name });

    // Create workflow run record
    const { data: workflowRun, error: insertError } = await supabaseClient
      .from('workflow_runs')
      .insert({
        user_id: user.id,
        workflow_id,
        workflow_name,
        status: 'running',
        trigger_type: 'manual',
        input_data,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;
    
    logStep("Workflow run created", { runId: workflowRun.id });

    // Trigger the n8n webhook
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
    
    if (n8nWebhookUrl) {
      try {
        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': Deno.env.get("N8N_WEBHOOK_SECRET") || ''
          },
          body: JSON.stringify({
            run_id: workflowRun.id,
            user_id: user.id,
            user_email: user.email,
            workflow_id,
            workflow_name,
            input_data,
            callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/n8n-webhook`
          })
        });

        logStep("n8n webhook triggered", { 
          status: n8nResponse.status,
          ok: n8nResponse.ok 
        });
      } catch (webhookError) {
        logStep("n8n webhook failed (continuing)", { error: String(webhookError) });
      }
    } else {
      logStep("No N8N_WEBHOOK_URL configured, simulating completion");
      
      // Simulate workflow completion after a short delay
      setTimeout(async () => {
        await supabaseClient
          .from('workflow_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            output_data: { message: 'Workflow completed successfully' }
          })
          .eq('id', workflowRun.id);
      }, 3000);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      run_id: workflowRun.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

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
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get request body
    const body = await req.json();
    const { 
      workflow_id, 
      workflow_name, 
      input_data = {},
      action = 'trigger', // 'trigger' or 'setup_workflow'
      template_id,
      customer_workflow_id,
      credentials
    } = body;
    
    if (!workflow_id || !workflow_name) {
      throw new Error("workflow_id and workflow_name are required");
    }

    logStep("Workflow request", { workflow_id, workflow_name, action });

    // Create workflow run record
    const { data: workflowRun, error: insertError } = await supabaseClient
      .from('workflow_runs')
      .insert({
        user_id: user.id,
        workflow_id,
        workflow_name,
        status: 'running',
        trigger_type: action === 'setup_workflow' ? 'setup' : 'manual',
        input_data: {
          ...input_data,
          action,
          template_id,
          customer_workflow_id
        },
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;
    
    logStep("Workflow run created", { runId: workflowRun.id });

    // Get user profile for additional context
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Prepare n8n payload
    const n8nPayload = {
      run_id: workflowRun.id,
      user_id: user.id,
      user_email: user.email,
      user_name: profile?.full_name || user.email,
      company_name: profile?.company_name || null,
      workflow_id,
      workflow_name,
      action,
      input_data,
      // For workflow setup
      template_id: template_id || null,
      customer_workflow_id: customer_workflow_id || null,
      credentials: credentials || null,
      // Callback URL for n8n to update status
      callback_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/n8n-webhook`,
      supabase_url: Deno.env.get("SUPABASE_URL"),
      timestamp: new Date().toISOString()
    };

    logStep("Prepared n8n payload", { 
      action, 
      hasCredentials: !!credentials,
      templateId: template_id 
    });

    // Trigger the n8n webhook for voice agent creation (TEST URL)
    const n8nWebhookUrl = "https://stevenpechtl.app.n8n.cloud/webhook-test/create-voice-agent";
    
    // Prepare simple payload with customer name
    const customerName = profile?.full_name || profile?.company_name || user.email?.split('@')[0] || 'Kunde';
    const voiceAgentPayload = {
      customer_name: customerName
    };

    logStep("Calling n8n voice agent webhook", { 
      url: n8nWebhookUrl,
      customerName 
    });

    try {
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(voiceAgentPayload)
      });

      const responseText = await n8nResponse.text();
      
      logStep("n8n webhook response", { 
        status: n8nResponse.status,
        ok: n8nResponse.ok,
        response: responseText.substring(0, 200)
      });

      if (!n8nResponse.ok) {
        logStep("n8n webhook returned error", { status: n8nResponse.status });
        
        // Update workflow run with error status
        await supabaseClient
          .from('workflow_runs')
          .update({
            status: 'failed',
            error_message: `n8n webhook error: ${n8nResponse.status}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', workflowRun.id);
      } else {
        logStep("n8n webhook successful - voice agent creation triggered");
      }
    } catch (webhookError) {
      logStep("n8n webhook failed", { error: String(webhookError) });
      
      // Update workflow run with error
      await supabaseClient
        .from('workflow_runs')
        .update({
          status: 'failed',
          error_message: `n8n connection failed: ${String(webhookError)}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', workflowRun.id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      run_id: workflowRun.id,
      message: action === 'setup_workflow' 
        ? 'Workflow-Setup wurde an n8n gesendet' 
        : 'Workflow wurde gestartet'
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

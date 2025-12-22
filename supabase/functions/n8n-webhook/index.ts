import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-n8n-signature",
};

interface WebhookPayload {
  event: string;
  user_id?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate n8n webhook requests
    const n8nSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
    const signature = req.headers.get("x-n8n-signature");
    
    if (!n8nSecret || !signature || signature !== n8nSecret) {
      console.error("Unauthorized request - invalid or missing n8n signature");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    console.log("n8n-webhook received event:", payload.event, JSON.stringify(payload));

    const { event, user_id, data } = payload;

    // Handle different event types from n8n
    switch (event) {
      case "workflow.complete": {
        // Handle workflow completion callback
        if (!data?.run_id) {
          return new Response(
            JSON.stringify({ error: "Missing run_id for workflow completion" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { error } = await supabase
          .from("workflow_runs")
          .update({
            status: data.status || 'completed',
            completed_at: new Date().toISOString(),
            output_data: data.output || {},
            error_message: data.error || null
          })
          .eq("id", data.run_id);

        if (error) throw error;
        console.log("Workflow run completed:", data.run_id);
        return new Response(
          JSON.stringify({ success: true, run_id: data.run_id }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "notification.create": {
        if (!user_id || !data?.title || !data?.message) {
          return new Response(
            JSON.stringify({ error: "Missing required fields for notification" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { data: notification, error } = await supabase
          .from("notifications")
          .insert({
            user_id,
            title: data.title as string,
            message: data.message as string,
            type: (data.type as string) || "info",
            link: data.link as string | undefined,
          })
          .select()
          .single();

        if (error) throw error;
        console.log("Notification created for user:", user_id);
        return new Response(
          JSON.stringify({ success: true, notification }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "appointment.status_update": {
        if (!data?.appointment_id || !data?.status) {
          return new Response(
            JSON.stringify({ error: "Missing appointment_id or status" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { data: appointment, error } = await supabase
          .from("appointments")
          .update({ status: data.status })
          .eq("id", data.appointment_id)
          .select()
          .single();

        if (error) throw error;
        console.log("Appointment status updated:", data.appointment_id, "->", data.status);
        return new Response(
          JSON.stringify({ success: true, appointment }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "user.profile_update": {
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: "Missing user_id" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const updateData: Record<string, unknown> = {};
        if (data?.full_name) updateData.full_name = data.full_name;
        if (data?.company_name) updateData.company_name = data.company_name;
        if (data?.phone) updateData.phone = data.phone;

        const { data: profile, error } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", user_id)
          .select()
          .single();

        if (error) throw error;
        console.log("Profile updated for user:", user_id);
        return new Response(
          JSON.stringify({ success: true, profile }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "bulk.notifications": {
        if (!Array.isArray(data?.notifications)) {
          return new Response(
            JSON.stringify({ error: "Expected notifications array" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { data: notifications, error } = await supabase
          .from("notifications")
          .insert(data.notifications as any[])
          .select();

        if (error) throw error;
        console.log("Bulk notifications created:", notifications.length);
        return new Response(
          JSON.stringify({ success: true, count: notifications.length }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "ping": {
        return new Response(
          JSON.stringify({ success: true, message: "pong", timestamp: new Date().toISOString() }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      default:
        console.log("Unknown event type:", event);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Event '${event}' received but no handler defined`,
            received_data: payload 
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }
  } catch (error: any) {
    console.error("Error in n8n-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

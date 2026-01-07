// Edge Function v2 - 2026-01-07
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-n8n-signature",
};

interface AppointmentPayload {
  action: "create" | "update" | "delete" | "sync" | "list";
  user_id?: string;
  appointment_id?: string;
  data?: {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  };
  filters?: {
    status?: string;
    from_date?: string;
    to_date?: string;
  };
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

    const payload: AppointmentPayload = await req.json();
    console.log("n8n-appointments received:", JSON.stringify(payload));

    const { action, user_id, appointment_id, data, filters } = payload;

    let result;

    switch (action) {
      case "create": {
        if (!user_id || !data?.title || !data?.start_time || !data?.end_time) {
          return new Response(
            JSON.stringify({ error: "Missing required fields: user_id, title, start_time, end_time" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { data: appointment, error } = await supabase
          .from("appointments")
          .insert({
            user_id,
            title: data.title,
            description: data.description,
            start_time: data.start_time,
            end_time: data.end_time,
            location: data.location,
            status: data.status || "pending",
            metadata: data.metadata || {},
          })
          .select()
          .single();

        if (error) throw error;
        result = { success: true, appointment };
        console.log("Appointment created:", appointment.id);
        break;
      }

      case "update": {
        if (!appointment_id) {
          return new Response(
            JSON.stringify({ error: "Missing appointment_id" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const updateData: Record<string, unknown> = {};
        if (data?.title) updateData.title = data.title;
        if (data?.description !== undefined) updateData.description = data.description;
        if (data?.start_time) updateData.start_time = data.start_time;
        if (data?.end_time) updateData.end_time = data.end_time;
        if (data?.location !== undefined) updateData.location = data.location;
        if (data?.status) updateData.status = data.status;
        if (data?.metadata) updateData.metadata = data.metadata;

        const { data: appointment, error } = await supabase
          .from("appointments")
          .update(updateData)
          .eq("id", appointment_id)
          .select()
          .single();

        if (error) throw error;
        result = { success: true, appointment };
        console.log("Appointment updated:", appointment_id);
        break;
      }

      case "delete": {
        if (!appointment_id) {
          return new Response(
            JSON.stringify({ error: "Missing appointment_id" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { error } = await supabase
          .from("appointments")
          .delete()
          .eq("id", appointment_id);

        if (error) throw error;
        result = { success: true, deleted: appointment_id };
        console.log("Appointment deleted:", appointment_id);
        break;
      }

      case "list": {
        let query = supabase.from("appointments").select("*");

        if (user_id) {
          query = query.eq("user_id", user_id);
        }
        if (filters?.status) {
          query = query.eq("status", filters.status);
        }
        if (filters?.from_date) {
          query = query.gte("start_time", filters.from_date);
        }
        if (filters?.to_date) {
          query = query.lte("start_time", filters.to_date);
        }

        const { data: appointments, error } = await query.order("start_time", { ascending: true });

        if (error) throw error;
        result = { success: true, appointments, count: appointments.length };
        console.log("Listed appointments:", appointments.length);
        break;
      }

      case "sync": {
        // Bulk sync from n8n - expects array of appointments
        if (!Array.isArray(data)) {
          return new Response(
            JSON.stringify({ error: "Sync action expects data to be an array of appointments" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { data: synced, error } = await supabase
          .from("appointments")
          .upsert(data as any[], { onConflict: "id" })
          .select();

        if (error) throw error;
        result = { success: true, synced: synced.length };
        console.log("Synced appointments:", synced.length);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in n8n-appointments:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

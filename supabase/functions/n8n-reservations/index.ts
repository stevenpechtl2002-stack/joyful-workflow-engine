// Edge Function v2 - 2026-01-07
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get("x-api-key");
    
    if (!apiKey) {
      console.error("Missing x-api-key header");
      return new Response(
        JSON.stringify({ error: "Missing API key", code: "MISSING_API_KEY" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, email, status, plan")
      .eq("api_key", apiKey)
      .single();

    if (customerError || !customer) {
      console.error("Invalid API key:", apiKey);
      return new Response(
        JSON.stringify({ error: "Invalid API key", code: "INVALID_API_KEY" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (customer.status !== 'active') {
      console.error("Customer account inactive:", customer.id);
      return new Response(
        JSON.stringify({ error: "Account is not active", code: "ACCOUNT_INACTIVE" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Valid API key for customer:", customer.id, customer.email);

    const payload = await req.json();
    console.log("Received reservation payload:", JSON.stringify(payload));

    if (!payload.customer_name || !payload.reservation_date || !payload.reservation_time) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: customer_name, reservation_date, reservation_time",
          code: "VALIDATION_ERROR"
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .insert({
        user_id: customer.id,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone || null,
        customer_email: payload.customer_email || null,
        reservation_date: payload.reservation_date,
        reservation_time: payload.reservation_time,
        end_time: payload.end_time || null,
        party_size: payload.party_size || 2,
        notes: payload.notes || null,
        source: payload.source || 'n8n',
        status: 'pending'
      })
      .select()
      .single();

    if (reservationError) {
      console.error("Error creating reservation:", reservationError);
      throw reservationError;
    }

    console.log("Reservation created successfully:", reservation.id);

    await supabase
      .from("notifications")
      .insert({
        user_id: customer.id,
        title: "Neue Reservierung",
        message: `${payload.customer_name} hat eine Reservierung für ${payload.party_size || 2} Personen am ${payload.reservation_date} um ${payload.reservation_time} Uhr angefragt.`,
        type: "info",
        link: "/portal/reservations"
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        reservation_id: reservation.id,
        message: "Reservation created successfully"
      }),
      { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in n8n-reservations:", error);
    return new Response(
      JSON.stringify({ error: error.message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

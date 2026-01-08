import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface AvailabilityRequest {
  date: string;        // Format: YYYY-MM-DD or DD.MM.YYYY
  time: string;        // Format: HH:MM
  duration?: number;   // Optional: Duration in minutes (default 90)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate via API key
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key required", availability: false, alternatives: [] }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get customer by API key
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, status")
      .eq("api_key", apiKey)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: "Invalid API key", availability: false, alternatives: [] }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (customer.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Customer account inactive", availability: false, alternatives: [] }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const payload: AvailabilityRequest = await req.json();
    console.log("Availability check request:", payload);

    // Validate required fields
    if (!payload.date || !payload.time) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: date and time", 
          availability: false, 
          alternatives: [] 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Convert date format if needed (DD.MM.YYYY -> YYYY-MM-DD)
    let checkDate = payload.date;
    if (payload.date.includes('.')) {
      const parts = payload.date.split('.');
      if (parts.length === 3) {
        checkDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    console.log("Check date:", checkDate);

    // Duration in minutes (default 90)
    const durationMinutes = payload.duration || 90;

    // Fetch existing reservations for this date
    const { data: existingReservations, error: fetchError } = await supabase
      .from("reservations")
      .select("id, reservation_time, end_time")
      .eq("user_id", customer.id)
      .eq("reservation_date", checkDate)
      .neq("status", "cancelled");

    if (fetchError) {
      console.error("Error fetching reservations:", fetchError);
      throw fetchError;
    }

    // Parse requested time
    const requestedTime = payload.time;
    const requestedStart = new Date(`${checkDate}T${requestedTime}:00`);
    const requestedEnd = new Date(requestedStart.getTime() + durationMinutes * 60000);

    // Check for conflicts
    const hasConflict = existingReservations?.some(res => {
      const resStart = new Date(`${checkDate}T${res.reservation_time}:00`);
      const resEnd = res.end_time 
        ? new Date(`${checkDate}T${res.end_time}:00`)
        : new Date(resStart.getTime() + durationMinutes * 60000);
      
      return (requestedStart < resEnd && requestedEnd > resStart);
    });

    // Find alternative slots
    const businessHours = { start: 11, end: 22 };
    const alternatives: string[] = [];

    if (hasConflict) {
      for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        for (const minute of [0, 30]) {
          const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const slotStart = new Date(`${checkDate}T${slotTime}:00`);
          const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
          
          const slotHasConflict = existingReservations?.some(res => {
            const resStart = new Date(`${checkDate}T${res.reservation_time}:00`);
            const resEnd = res.end_time 
              ? new Date(`${checkDate}T${res.end_time}:00`)
              : new Date(resStart.getTime() + durationMinutes * 60000);
            return (slotStart < resEnd && slotEnd > resStart);
          });
          
          if (!slotHasConflict && alternatives.length < 5) {
            alternatives.push(slotTime);
          }
        }
      }
    }

    console.log("Availability result:", { availability: !hasConflict, alternatives });

    return new Response(
      JSON.stringify({
        availability: !hasConflict,
        alternatives: hasConflict ? alternatives : [],
        requested_date: payload.date,
        requested_time: payload.time
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        availability: false, 
        alternatives: [] 
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

interface AvailabilityRequest {
  date: string;              // Format: YYYY-MM-DD or DD.MM.YYYY
  time?: string;             // Format: HH:MM (optional - if not provided, returns all slots)
  duration?: number;         // Optional: Duration in minutes (default 90)
  staff_member_name?: string; // Optional: Check availability for specific staff member
}

interface StaffMember {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
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

    // Get customer by API key from customer_api_keys table
    const { data: apiKeyRecord, error: apiKeyError } = await supabase
      .from("customer_api_keys")
      .select("customer_id")
      .eq("api_key", apiKey)
      .single();

    if (apiKeyError || !apiKeyRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid API key", availability: false, alternatives: [] }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get customer and verify status
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, status")
      .eq("id", apiKeyRecord.customer_id)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: "Customer not found", availability: false, alternatives: [] }),
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
    if (!payload.date) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: date", 
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

    // Look up staff member if name provided
    let staffMemberId: string | null = null;
    let staffMemberInfo: StaffMember | null = null;

    if (payload.staff_member_name) {
      const searchName = payload.staff_member_name.toLowerCase().trim();
      
      const { data: staffMembers, error: staffError } = await supabase
        .from("staff_members")
        .select("id, name, color, is_active")
        .eq("user_id", customer.id)
        .eq("is_active", true);

      if (!staffError && staffMembers) {
        // Find exact or partial match
        staffMemberInfo = staffMembers.find(s => 
          s.name.toLowerCase() === searchName ||
          s.name.toLowerCase().includes(searchName)
        ) || null;
        
        if (staffMemberInfo) {
          staffMemberId = staffMemberInfo.id;
          console.log("Found staff member:", staffMemberInfo.name);
        } else {
          // Return available staff members if name not found
          return new Response(
            JSON.stringify({ 
              error: `Mitarbeiter "${payload.staff_member_name}" nicht gefunden`,
              available_staff: staffMembers.map(s => s.name),
              availability: false,
              alternatives: []
            }),
            { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }
    }

    // Build reservation query
    let reservationQuery = supabase
      .from("reservations")
      .select("id, reservation_time, end_time, staff_member_id")
      .eq("user_id", customer.id)
      .eq("reservation_date", checkDate)
      .neq("status", "cancelled");

    // Filter by staff member if specified
    if (staffMemberId) {
      reservationQuery = reservationQuery.eq("staff_member_id", staffMemberId);
    }

    const { data: existingReservations, error: fetchError } = await reservationQuery;

    if (fetchError) {
      console.error("Error fetching reservations:", fetchError);
      throw fetchError;
    }

    const businessHours = { start: 11, end: 22 };

    // If no specific time requested, return all available slots
    if (!payload.time) {
      const availableSlots: string[] = [];
      
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
          
          if (!slotHasConflict) {
            availableSlots.push(slotTime);
          }
        }
      }

      return new Response(
        JSON.stringify({
          available_slots: availableSlots,
          total_slots: availableSlots.length,
          date: payload.date,
          formatted_date: formatDate(checkDate),
          staff_member: staffMemberInfo ? {
            id: staffMemberInfo.id,
            name: staffMemberInfo.name
          } : null,
          message: availableSlots.length > 0
            ? `${availableSlots.length} freie Termine${staffMemberInfo ? ` bei ${staffMemberInfo.name}` : ''}`
            : `Keine freien Termine${staffMemberInfo ? ` bei ${staffMemberInfo.name}` : ''}`
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check specific time availability
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

    // Find alternative slots if conflict
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
        requested_time: payload.time,
        staff_member: staffMemberInfo ? {
          id: staffMemberInfo.id,
          name: staffMemberInfo.name
        } : null,
        message: !hasConflict 
          ? `${payload.time} Uhr ist verfügbar${staffMemberInfo ? ` bei ${staffMemberInfo.name}` : ''}`
          : `${payload.time} Uhr ist belegt${staffMemberInfo ? ` bei ${staffMemberInfo.name}` : ''}`
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

// Helper: Format date to German format
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const day = days[date.getDay()];
  return `${day}, ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

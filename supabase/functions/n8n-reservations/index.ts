// Edge Function v3 - 2026-01-21 - Staff Member Assignment Support
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

    // Convert DD.MM.YYYY to YYYY-MM-DD if needed
    let reservationDate = payload.reservation_date;
    if (reservationDate.includes('.')) {
      const parts = reservationDate.split('.');
      if (parts.length === 3) {
        reservationDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    console.log("Converted date:", reservationDate);

    // Look up staff member by name if provided
    let staffMemberId: string | null = null;
    let staffMemberName: string | null = null;
    
    if (payload.staff_member_name) {
      const searchName = payload.staff_member_name.toLowerCase().trim();
      console.log("Looking up staff member:", searchName);
      
      const { data: staffMembers, error: staffError } = await supabase
        .from("staff_members")
        .select("id, name")
        .eq("user_id", customer.id)
        .eq("is_active", true);

      if (staffError) {
        console.error("Error looking up staff member:", staffError);
      } else if (staffMembers && staffMembers.length > 0) {
        // Find staff member by exact match or partial match (case-insensitive)
        const exactMatch = staffMembers.find(
          s => s.name.toLowerCase() === searchName
        );
        const partialMatch = staffMembers.find(
          s => s.name.toLowerCase().includes(searchName) || 
               searchName.includes(s.name.toLowerCase())
        );
        
        const matchedStaff = exactMatch || partialMatch;
        
        if (matchedStaff) {
          staffMemberId = matchedStaff.id;
          staffMemberName = matchedStaff.name;
          console.log("Staff member found:", staffMemberName, staffMemberId);
        } else {
          console.log("No matching staff member found for:", searchName);
          console.log("Available staff:", staffMembers.map(s => s.name).join(", "));
        }
      }
    }

    // Check for existing reservations at this time (optionally for specific staff member)
    let reservationQuery = supabase
      .from("reservations")
      .select("id, reservation_time, end_time, staff_member_id")
      .eq("user_id", customer.id)
      .eq("reservation_date", reservationDate)
      .neq("status", "cancelled");

    // If staff member is specified, only check conflicts for that staff member
    if (staffMemberId) {
      reservationQuery = reservationQuery.eq("staff_member_id", staffMemberId);
    }

    const { data: existingReservations, error: checkError } = await reservationQuery;

    if (checkError) {
      console.error("Error checking existing reservations:", checkError);
      throw checkError;
    }

    // Calculate end time (default 90 minutes if not provided)
    const requestedTime = payload.reservation_time;
    const requestedStart = new Date(`${reservationDate}T${requestedTime}:00`);
    const durationMinutes = 90;
    const requestedEnd = new Date(requestedStart.getTime() + durationMinutes * 60000);

    // Check for time conflicts
    const hasConflict = existingReservations?.some(res => {
      const resStart = new Date(`${reservationDate}T${res.reservation_time}:00`);
      const resEnd = res.end_time 
        ? new Date(`${reservationDate}T${res.end_time}:00`)
        : new Date(resStart.getTime() + durationMinutes * 60000);
      
      // Check if times overlap
      return (requestedStart < resEnd && requestedEnd > resStart);
    });

    if (hasConflict) {
      console.log("Time slot conflict detected for:", requestedTime, staffMemberName ? `(${staffMemberName})` : "");
      
      // Find available alternative slots
      const businessHours = { start: 11, end: 22 };
      const availableSlots: string[] = [];
      
      for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        for (const minute of [0, 30]) {
          const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const slotStart = new Date(`${reservationDate}T${slotTime}:00`);
          const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
          
          const slotHasConflict = existingReservations?.some(res => {
            const resStart = new Date(`${reservationDate}T${res.reservation_time}:00`);
            const resEnd = res.end_time 
              ? new Date(`${reservationDate}T${res.end_time}:00`)
              : new Date(resStart.getTime() + durationMinutes * 60000);
            return (slotStart < resEnd && slotEnd > resStart);
          });
          
          if (!slotHasConflict && availableSlots.length < 5) {
            availableSlots.push(slotTime);
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: "TIME_SLOT_OCCUPIED",
          message: staffMemberName 
            ? `${staffMemberName} hat um ${requestedTime} Uhr am ${payload.reservation_date} bereits einen Termin.`
            : `Der Termin um ${requestedTime} Uhr am ${payload.reservation_date} ist bereits belegt.`,
          staff_member: staffMemberName,
          alternative_slots: availableSlots,
          alternative_message: availableSlots.length > 0
            ? `Verfügbare Zeiten${staffMemberName ? ` für ${staffMemberName}` : ''}: ${availableSlots.map(s => s + ' Uhr').join(', ')}`
            : 'An diesem Tag sind leider keine Termine mehr frei.'
        }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const endTimeString = `${requestedEnd.getHours().toString().padStart(2, '0')}:${requestedEnd.getMinutes().toString().padStart(2, '0')}`;

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .insert({
        user_id: customer.id,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone || null,
        customer_email: payload.customer_email || null,
        reservation_date: reservationDate,
        reservation_time: payload.reservation_time,
        end_time: payload.end_time || endTimeString,
        party_size: payload.party_size || 2,
        notes: payload.notes || null,
        source: payload.source || 'n8n',
        status: 'pending',
        staff_member_id: staffMemberId // NEW: Assign to staff member
      })
      .select()
      .single();

    if (reservationError) {
      console.error("Error creating reservation:", reservationError);
      throw reservationError;
    }

    console.log("Reservation created successfully:", reservation.id, staffMemberName ? `assigned to ${staffMemberName}` : "unassigned");

    await supabase
      .from("notifications")
      .insert({
        user_id: customer.id,
        title: "Neue Reservierung",
        message: staffMemberName
          ? `${payload.customer_name} hat eine Reservierung für ${payload.party_size || 2} Personen am ${payload.reservation_date} um ${payload.reservation_time} Uhr bei ${staffMemberName} angefragt.`
          : `${payload.customer_name} hat eine Reservierung für ${payload.party_size || 2} Personen am ${payload.reservation_date} um ${payload.reservation_time} Uhr angefragt.`,
        type: "info",
        link: "/portal/reservations"
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        reservation_id: reservation.id,
        message: staffMemberName
          ? `Reservierung erfolgreich erstellt und ${staffMemberName} zugewiesen`
          : "Reservierung erfolgreich erstellt",
        reservation_date: payload.reservation_date,
        reservation_time: payload.reservation_time,
        end_time: endTimeString,
        staff_member_id: staffMemberId,
        staff_member_name: staffMemberName
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

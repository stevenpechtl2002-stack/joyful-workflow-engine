import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface CalendarRequest {
  action: 'check_availability' | 'get_available_slots' | 'book_appointment';
  user_id?: string;
  api_key?: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  duration_minutes?: number;
  customer_name?: string;
  customer_phone?: string;
  title?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: CalendarRequest = await req.json();
    const { action, date, time, duration_minutes = 60 } = payload;

    console.log('Voice Agent Calendar Request:', { action, date, time });

    // Authenticate via API key from customers table
    let userId = payload.user_id;
    
    if (payload.api_key && !userId) {
      const { data: customer, error: authError } = await supabase
        .from('customers')
        .select('id')
        .eq('api_key', payload.api_key)
        .eq('status', 'active')
        .single();

      if (authError || !customer) {
        console.error('Auth error:', authError);
        return new Response(
          JSON.stringify({ success: false, error: 'Ungültiger API-Schlüssel' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = customer.id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id oder api_key erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Define business hours (can be customized per user later)
    const businessHours = {
      start: 9, // 09:00
      end: 18,  // 18:00
      slotDuration: 60 // minutes
    };

    switch (action) {
      case 'check_availability': {
        if (!date || !time) {
          return new Response(
            JSON.stringify({ success: false, error: 'date und time erforderlich' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const requestedStart = new Date(`${date}T${time}:00`);
        const requestedEnd = new Date(requestedStart.getTime() + duration_minutes * 60000);

        // Check for conflicting appointments
        const { data: conflicts, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', userId)
          .neq('status', 'cancelled')
          .gte('start_time', `${date}T00:00:00`)
          .lte('start_time', `${date}T23:59:59`);

        if (error) {
          console.error('DB error:', error);
          throw error;
        }

        const isAvailable = !conflicts?.some(apt => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          return (requestedStart < aptEnd && requestedEnd > aptStart);
        });

        let alternativeSlots: string[] = [];
        
        if (!isAvailable) {
          // Find alternative slots for the same day
          alternativeSlots = findAvailableSlots(date, conflicts || [], businessHours);
        }

        return new Response(
          JSON.stringify({
            success: true,
            available: isAvailable,
            requested_date: date,
            requested_time: time,
            message: isAvailable 
              ? `Der Termin am ${formatDate(date)} um ${time} Uhr ist verfügbar.`
              : `Leider ist der Termin am ${formatDate(date)} um ${time} Uhr bereits vergeben.`,
            alternative_slots: alternativeSlots,
            alternative_message: !isAvailable && alternativeSlots.length > 0
              ? `Alternativ hätte ich folgende Zeiten frei: ${alternativeSlots.join(', ')} Uhr.`
              : !isAvailable ? 'An diesem Tag sind leider keine Termine mehr frei.' : null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_available_slots': {
        if (!date) {
          return new Response(
            JSON.stringify({ success: false, error: 'date erforderlich' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get all appointments for the day
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('user_id', userId)
          .neq('status', 'cancelled')
          .gte('start_time', `${date}T00:00:00`)
          .lte('start_time', `${date}T23:59:59`);

        if (error) {
          console.error('DB error:', error);
          throw error;
        }

        const availableSlots = findAvailableSlots(date, appointments || [], businessHours);

        return new Response(
          JSON.stringify({
            success: true,
            date: date,
            formatted_date: formatDate(date),
            available_slots: availableSlots,
            message: availableSlots.length > 0
              ? `Am ${formatDate(date)} sind folgende Termine verfügbar: ${availableSlots.join(', ')} Uhr.`
              : `Am ${formatDate(date)} sind leider keine Termine mehr frei.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'book_appointment': {
        if (!date || !time) {
          return new Response(
            JSON.stringify({ success: false, error: 'date und time erforderlich' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const startTime = `${date}T${time}:00`;
        const endTime = new Date(new Date(startTime).getTime() + duration_minutes * 60000).toISOString();

        const requestedStart = new Date(startTime);
        const requestedEnd = new Date(endTime);

        // Double-check availability with FULL appointment data
        const { data: existingAppointments, error: checkError } = await supabase
          .from('appointments')
          .select('id, start_time, end_time')
          .eq('user_id', userId)
          .neq('status', 'cancelled')
          .gte('start_time', `${date}T00:00:00`)
          .lte('start_time', `${date}T23:59:59`);

        if (checkError) {
          console.error('Availability check error:', checkError);
          throw checkError;
        }

        // Proper conflict check with time overlap detection
        const hasConflict = existingAppointments?.some(apt => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          // Check if times overlap
          return (requestedStart < aptEnd && requestedEnd > aptStart);
        });

        if (hasConflict) {
          // Find alternative slots
          const alternativeSlots = findAvailableSlots(date, existingAppointments || [], businessHours);
          
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Termin bereits belegt',
              message: `Der Termin am ${formatDate(date)} um ${time} Uhr ist leider schon vergeben.`,
              alternative_slots: alternativeSlots,
              alternative_message: alternativeSlots.length > 0
                ? `Alternativ hätte ich folgende Zeiten frei: ${alternativeSlots.join(', ')} Uhr.`
                : 'An diesem Tag sind leider keine Termine mehr frei.'
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Insert the appointment
        const { data: newAppointment, error } = await supabase
          .from('appointments')
          .insert({
            user_id: userId,
            title: payload.title || `Termin für ${payload.customer_name || 'Kunde'}`,
            start_time: startTime,
            end_time: endTime,
            status: 'confirmed',
            description: payload.customer_phone ? `Tel: ${payload.customer_phone}` : null,
            metadata: {
              customer_name: payload.customer_name,
              customer_phone: payload.customer_phone,
              booked_via: 'voice_agent'
            }
          })
          .select()
          .single();

        if (error) {
          console.error('Booking error:', error);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Termin konnte nicht gebucht werden',
              details: error.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            appointment: newAppointment,
            message: `Perfekt! Ich habe den Termin am ${formatDate(date)} um ${time} Uhr für Sie gebucht.`,
            confirmation: `Terminbestätigung: ${formatDate(date)}, ${time} Uhr`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Unbekannte Aktion' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error: unknown) {
    console.error('Voice Agent Calendar Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: Find available time slots
function findAvailableSlots(
  date: string, 
  appointments: any[], 
  businessHours: { start: number; end: number; slotDuration: number }
): string[] {
  const slots: string[] = [];
  
  for (let hour = businessHours.start; hour < businessHours.end; hour++) {
    const slotTime = `${hour.toString().padStart(2, '0')}:00`;
    const slotStart = new Date(`${date}T${slotTime}:00`);
    const slotEnd = new Date(slotStart.getTime() + businessHours.slotDuration * 60000);

    const isBooked = appointments.some(apt => {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);
      return (slotStart < aptEnd && slotEnd > aptStart);
    });

    if (!isBooked) {
      slots.push(slotTime);
    }
  }

  return slots;
}

// Helper: Format date to German format
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const day = days[date.getDay()];
  return `${day}, ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
}

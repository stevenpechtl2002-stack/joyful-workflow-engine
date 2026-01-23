// Edge Function v4 - 2026-01-21 - Dual Endpoint: Check + Book with Smart Alternatives
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

interface StaffMember {
  id: string;
  name: string;
  is_active: boolean;
}

interface Reservation {
  id: string;
  customer_name: string;
  reservation_date: string;
  reservation_time: string;
  end_time: string | null;
  staff_member_id: string | null;
  status: string;
}

// Helper: Parse duration string to minutes
function parseDuration(duration?: string | null): number {
  if (!duration) return 60;
  const match = duration.match(/(\d+)/);
  return match ? parseInt(match[1]) : 60;
}

// Helper: Convert DD.MM.YYYY to YYYY-MM-DD
function convertDateFormat(dateStr: string): string {
  if (dateStr.includes('.')) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return dateStr;
}

// Helper: Convert YYYY-MM-DD to DD.MM.YYYY
function formatDateGerman(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}

// Helper: Normalize time to HH:MM format
function normalizeTime(time: string): string {
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return time;
}

// Helper: Convert time string to minutes since midnight
function timeToMinutes(time: string): number {
  const normalized = normalizeTime(time);
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper: Convert minutes since midnight to HH:MM
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Helper: Check if two time ranges overlap
function hasTimeOverlap(
  start1: number, end1: number,
  start2: number, end2: number
): boolean {
  return start1 < end2 && end1 > start2;
}

// Helper: Add days to a date string (YYYY-MM-DD)
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// Find staff member by name (case-insensitive, partial match)
async function findStaffMember(
  supabase: any,
  customerId: string,
  employeeName: string
): Promise<StaffMember | null> {
  const searchName = employeeName.toLowerCase().trim();
  
  const { data: staffMembers, error } = await supabase
    .from("staff_members")
    .select("id, name, is_active")
    .eq("user_id", customerId)
    .eq("is_active", true);

  if (error || !staffMembers?.length) return null;

  // Exact match first, then partial
  const exactMatch = staffMembers.find(
    (s: StaffMember) => s.name.toLowerCase() === searchName
  );
  const partialMatch = staffMembers.find(
    (s: StaffMember) => 
      s.name.toLowerCase().includes(searchName) || 
      searchName.includes(s.name.toLowerCase())
  );

  return exactMatch || partialMatch || null;
}

// Get all active staff members
async function getAllStaffMembers(
  supabase: any,
  customerId: string
): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from("staff_members")
    .select("id, name, is_active")
    .eq("user_id", customerId)
    .eq("is_active", true)
    .order("sort_order");

  return error ? [] : (data || []);
}

// Get reservations for a specific date
async function getReservationsForDate(
  supabase: any,
  customerId: string,
  date: string,
  staffMemberId?: string
): Promise<Reservation[]> {
  let query = supabase
    .from("reservations")
    .select("id, customer_name, reservation_date, reservation_time, end_time, staff_member_id, status")
    .eq("user_id", customerId)
    .eq("reservation_date", date)
    .neq("status", "cancelled");

  if (staffMemberId) {
    query = query.eq("staff_member_id", staffMemberId);
  }

  const { data, error } = await query;
  return error ? [] : (data || []);
}

// Check if a specific time slot is available
function isSlotAvailable(
  reservations: Reservation[],
  startMinutes: number,
  durationMinutes: number,
  staffMemberId?: string
): boolean {
  const endMinutes = startMinutes + durationMinutes;

  return !reservations.some(res => {
    // If checking for specific staff, only check their reservations
    if (staffMemberId && res.staff_member_id !== staffMemberId) {
      return false;
    }

    const resStart = timeToMinutes(res.reservation_time);
    const resEnd = res.end_time 
      ? timeToMinutes(res.end_time) 
      : resStart + 60; // Default 60 min if no end_time

    return hasTimeOverlap(startMinutes, endMinutes, resStart, resEnd);
  });
}

// Find conflicting reservations
function findConflicts(
  reservations: Reservation[],
  startMinutes: number,
  durationMinutes: number,
  staffMemberId?: string,
  staffMembers?: StaffMember[]
): any[] {
  const endMinutes = startMinutes + durationMinutes;
  const staffMap = new Map(staffMembers?.map(s => [s.id, s.name]) || []);

  return reservations
    .filter(res => {
      if (staffMemberId && res.staff_member_id !== staffMemberId) {
        return false;
      }

      const resStart = timeToMinutes(res.reservation_time);
      const resEnd = res.end_time 
        ? timeToMinutes(res.end_time) 
        : resStart + 60;

      return hasTimeOverlap(startMinutes, endMinutes, resStart, resEnd);
    })
    .map(res => ({
      id: res.id,
      customer_name: res.customer_name.split(' ')[0] + ' ' + (res.customer_name.split(' ')[1]?.[0] || '') + '.',
      time: `${res.reservation_time}-${res.end_time || minutesToTime(timeToMinutes(res.reservation_time) + 60)}`,
      employee: res.staff_member_id ? (staffMap.get(res.staff_member_id) || 'Unbekannt') : null
    }));
}

// Find alternative times on the same day
function findAlternativeTimes(
  reservations: Reservation[],
  requestedMinutes: number,
  durationMinutes: number,
  staffMemberId: string | null,
  openingMinutes: number = 9 * 60,  // 09:00
  closingMinutes: number = 18 * 60, // 18:00
  maxAlternatives: number = 5
): { time: string; distance_minutes: number; available: true }[] {
  const alternatives: { time: string; distance_minutes: number; available: true }[] = [];
  const slotInterval = 30; // 30-minute intervals

  // Generate all possible slots
  for (let slot = openingMinutes; slot + durationMinutes <= closingMinutes; slot += slotInterval) {
    if (isSlotAvailable(reservations, slot, durationMinutes, staffMemberId || undefined)) {
      alternatives.push({
        time: minutesToTime(slot),
        distance_minutes: Math.abs(slot - requestedMinutes),
        available: true
      });
    }
  }

  // Sort by distance to requested time
  alternatives.sort((a, b) => a.distance_minutes - b.distance_minutes);

  return alternatives.slice(0, maxAlternatives);
}

// Find alternative employees at the same time
async function findAlternativeEmployees(
  supabase: any,
  customerId: string,
  date: string,
  startMinutes: number,
  durationMinutes: number,
  excludeStaffId: string | null
): Promise<{ employee: string; time: string; available: true }[]> {
  const allStaff = await getAllStaffMembers(supabase, customerId);
  const allReservations = await getReservationsForDate(supabase, customerId, date);
  const alternatives: { employee: string; time: string; available: true }[] = [];

  for (const staff of allStaff) {
    if (staff.id === excludeStaffId) continue;

    const staffReservations = allReservations.filter(r => r.staff_member_id === staff.id);
    if (isSlotAvailable(staffReservations, startMinutes, durationMinutes, staff.id)) {
      alternatives.push({
        employee: staff.name,
        time: minutesToTime(startMinutes),
        available: true
      });
    }
  }

  return alternatives.slice(0, 5);
}

// Find availability on next days
async function findNextDaysAvailability(
  supabase: any,
  customerId: string,
  startDate: string,
  requestedMinutes: number,
  durationMinutes: number,
  staffMemberId: string | null | undefined,
  maxDays: number = 7
): Promise<{ date: string; time: string; employee?: string; available: true }[]> {
  const alternatives: { date: string; time: string; employee?: string; available: true }[] = [];
  const staffId = staffMemberId ?? undefined;

  for (let i = 1; i <= maxDays && alternatives.length < 5; i++) {
    const checkDate = addDays(startDate, i);
    const reservations = await getReservationsForDate(supabase, customerId, checkDate, staffId);

    if (isSlotAvailable(reservations, requestedMinutes, durationMinutes, staffId)) {
      alternatives.push({
        date: formatDateGerman(checkDate),
        time: minutesToTime(requestedMinutes),
        available: true
      });
    }
  }

  return alternatives;
}

// ENDPOINT 1: Availability Check (GET /n8n-reservations/check)
async function handleAvailabilityCheck(
  supabase: any,
  customer: any,
  url: URL
): Promise<Response> {
  const dateParam = url.searchParams.get('date');
  const timeParam = url.searchParams.get('time');
  const employeeParam = url.searchParams.get('employee');
  const durationParam = url.searchParams.get('duration');

  if (!dateParam || !timeParam) {
    return new Response(
      JSON.stringify({ 
        error: "Missing required parameters: date, time",
        code: "VALIDATION_ERROR"
      }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const date = convertDateFormat(dateParam);
  const time = normalizeTime(timeParam);
  const durationMinutes = parseDuration(durationParam);
  const requestedMinutes = timeToMinutes(time);

  console.log(`Availability check: ${date} ${time} (${durationMinutes}min) employee: ${employeeParam}`);

  // Find staff member if specified
  let staffMember: StaffMember | null = null;
  if (employeeParam) {
    staffMember = await findStaffMember(supabase, customer.id, employeeParam);
    if (!staffMember) {
      const allStaff = await getAllStaffMembers(supabase, customer.id);
      return new Response(
        JSON.stringify({
          available: false,
          error: "EMPLOYEE_NOT_FOUND",
          message: `Mitarbeiter "${employeeParam}" nicht gefunden`,
          available_employees: allStaff.map(s => s.name)
        }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  }

  const staffId = staffMember?.id ?? null;

  // Get reservations
  const reservations = await getReservationsForDate(
    supabase, 
    customer.id, 
    date, 
    staffId ?? undefined
  );
  const allStaff = await getAllStaffMembers(supabase, customer.id);

  // Check availability
  const isAvailable = isSlotAvailable(
    reservations,
    requestedMinutes,
    durationMinutes,
    staffId ?? undefined
  );

  const requestedInfo = {
    date: dateParam,
    time: time,
    ...(employeeParam && { employee: staffMember?.name || employeeParam }),
    ...(durationParam && { duration: durationParam })
  };

  if (isAvailable) {
    return new Response(
      JSON.stringify({
        available: true,
        count: 0,
        message: "Termin ist verfügbar",
        requested: requestedInfo
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Not available - find alternatives
  const conflicts = findConflicts(
    reservations, 
    requestedMinutes, 
    durationMinutes,
    staffId ?? undefined,
    allStaff
  );

  // Get all reservations for the day (not just for the specific staff member)
  const allDayReservations = staffId 
    ? await getReservationsForDate(supabase, customer.id, date)
    : reservations;

  const sameDayTimes = findAlternativeTimes(
    staffId ? reservations : allDayReservations,
    requestedMinutes,
    durationMinutes,
    staffId
  ).map(alt => ({
    ...alt,
    employee: staffMember?.name || undefined
  }));

  const sameTimeEmployees = staffId 
    ? await findAlternativeEmployees(
        supabase, 
        customer.id, 
        date, 
        requestedMinutes, 
        durationMinutes,
        staffId
      )
    : [];

  const nextDays = await findNextDaysAvailability(
    supabase,
    customer.id,
    date,
    requestedMinutes,
    durationMinutes,
    staffId
  );

  return new Response(
    JSON.stringify({
      available: false,
      count: conflicts.length,
      message: "Termin ist bereits gebucht",
      requested: requestedInfo,
      conflicting_reservations: conflicts,
      alternatives: {
        same_day_times: sameDayTimes,
        same_time_employees: sameTimeEmployees,
        next_days: nextDays
      }
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

// ENDPOINT 2: Book Reservation (POST/PATCH /n8n-reservations)
async function handleBooking(
  supabase: any,
  customer: any,
  payload: any
): Promise<Response> {
  console.log("Booking request:", JSON.stringify(payload));

  // Validate required fields
  if (!payload.customer_name || !payload.reservation_date || !payload.reservation_time) {
    return new Response(
      JSON.stringify({ 
        success: false,
        booked: false,
        error: "Missing required fields: customer_name, reservation_date, reservation_time",
        code: "VALIDATION_ERROR"
      }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const date = convertDateFormat(payload.reservation_date);
  const time = normalizeTime(payload.reservation_time);
  const durationMinutes = parseDuration(payload.duration);
  const requestedMinutes = timeToMinutes(time);
  const endTime = minutesToTime(requestedMinutes + durationMinutes);

  // Find staff member if specified
  let staffMember: StaffMember | null = null;
  if (payload.employee || payload.staff_member_name) {
    const employeeName = payload.employee || payload.staff_member_name;
    staffMember = await findStaffMember(supabase, customer.id, employeeName);
    
    if (!staffMember) {
      const allStaff = await getAllStaffMembers(supabase, customer.id);
      return new Response(
        JSON.stringify({
          success: false,
          booked: false,
          error: "EMPLOYEE_NOT_FOUND",
          message: `Mitarbeiter "${employeeName}" nicht gefunden`,
          available_employees: allStaff.map(s => s.name)
        }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  }

  // Double-check availability (race condition protection)
  const staffId = staffMember?.id ?? undefined;
  const reservations = await getReservationsForDate(
    supabase, 
    customer.id, 
    date, 
    staffId
  );
  const allStaff = await getAllStaffMembers(supabase, customer.id);

  const isAvailable = isSlotAvailable(
    reservations,
    requestedMinutes,
    durationMinutes,
    staffId
  );

  if (!isAvailable) {
    console.log("Booking conflict detected");

    const conflicts = findConflicts(
      reservations, 
      requestedMinutes, 
      durationMinutes, 
      staffId,
      allStaff
    );

    const allDayReservations = staffId
      ? await getReservationsForDate(supabase, customer.id, date)
      : reservations;

    const sameDayTimes = findAlternativeTimes(
      staffId ? reservations : allDayReservations,
      requestedMinutes,
      durationMinutes,
      staffId ?? null
    );

    const sameTimeEmployees = staffId
      ? await findAlternativeEmployees(
          supabase, 
          customer.id, 
          date, 
          requestedMinutes, 
          durationMinutes, 
          staffId
        )
      : [];

    const nextDays = await findNextDaysAvailability(
      supabase,
      customer.id,
      date,
      requestedMinutes,
      durationMinutes,
      staffId
    );

    return new Response(
      JSON.stringify({
        success: false,
        booked: false,
        error: "TIME_SLOT_OCCUPIED",
        message: `Der gewünschte Termin am ${payload.reservation_date} um ${time} Uhr ist leider nicht verfügbar`,
        conflicting_reservation: conflicts[0] || null,
        alternatives: {
          same_day_times: sameDayTimes.map(s => s.time),
          same_time_employees: sameTimeEmployees.map(s => s.employee),
          next_days: nextDays.map(d => ({ date: d.date, time: d.time }))
        }
      }),
      { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Find product if specified (by name or ID)
  let productId: string | null = null;
  let pricePaid: number | null = payload.price_paid ?? null;
  
  if (payload.product_id) {
    productId = payload.product_id;
  } else if (payload.product_name || payload.service_type) {
    const productSearch = (payload.product_name || payload.service_type).toLowerCase().trim();
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, is_active")
      .eq("user_id", customer.id)
      .eq("is_active", true);
    
    if (products?.length) {
      // Exact match first, then partial
      const exactMatch = products.find((p: any) => p.name.toLowerCase() === productSearch);
      const partialMatch = products.find((p: any) => 
        p.name.toLowerCase().includes(productSearch) || 
        productSearch.includes(p.name.toLowerCase())
      );
      const foundProduct = exactMatch || partialMatch;
      
      if (foundProduct) {
        productId = foundProduct.id;
        // Auto-set price if not provided
        if (pricePaid === null) {
          pricePaid = foundProduct.price;
        }
      }
    }
  }

  // Create reservation
  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      user_id: customer.id,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone || payload.phone || payload.number || null,
      customer_email: payload.customer_email || null,
      reservation_date: date,
      reservation_time: time,
      end_time: endTime,
      party_size: payload.party_size || 1,
      notes: payload.notes || payload.service_type || null,
      source: payload.source || 'n8n',
      status: 'confirmed',
      staff_member_id: staffMember?.id || null,
      product_id: productId,
      price_paid: pricePaid
    })
    .select()
    .single();

  if (reservationError) {
    console.error("Error creating reservation:", reservationError);
    return new Response(
      JSON.stringify({ 
        success: false,
        booked: false,
        error: reservationError.message, 
        code: "DATABASE_ERROR" 
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  console.log("Reservation created:", reservation.id);

  // Create notification
  await supabase
    .from("notifications")
    .insert({
      user_id: customer.id,
      title: "Neue Reservierung",
      message: staffMember
        ? `${payload.customer_name} hat einen Termin am ${payload.reservation_date} um ${time} Uhr bei ${staffMember.name} gebucht.`
        : `${payload.customer_name} hat einen Termin am ${payload.reservation_date} um ${time} Uhr gebucht.`,
      type: "info",
      link: "/portal/reservations"
    });

  return new Response(
    JSON.stringify({
      success: true,
      booked: true,
      reservation_id: reservation.id,
      message: "Reservierung erfolgreich erstellt",
      reservation: {
        id: reservation.id,
        customer_name: payload.customer_name,
        reservation_date: payload.reservation_date,
        reservation_time: time,
        end_time: endTime,
        employee: staffMember?.name || null,
        service_type: payload.service_type || null,
        duration: payload.duration || "60 Minuten",
        product_id: productId,
        price_paid: pricePaid
      }
    }),
    { status: 201, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

// Main handler with URL routing
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get("x-api-key");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key", code: "MISSING_API_KEY" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, email, status, plan")
      .eq("api_key", apiKey)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: "Invalid API key", code: "INVALID_API_KEY" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (customer.status !== 'active') {
      return new Response(
        JSON.stringify({ error: "Account is not active", code: "ACCOUNT_INACTIVE" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Authenticated customer:", customer.id, customer.email);

    // URL-based routing
    const url = new URL(req.url);
    const path = url.pathname;

    // ENDPOINT 1: GET /n8n-reservations/check
    if (req.method === "GET" && path.endsWith("/check")) {
      return await handleAvailabilityCheck(supabase, customer, url);
    }

    // ENDPOINT 2: POST/PATCH /n8n-reservations (booking)
    if (req.method === "POST" || req.method === "PATCH") {
      const payload = await req.json();
      return await handleBooking(supabase, customer, payload);
    }

    return new Response(
      JSON.stringify({ 
        error: "Method not allowed",
        allowed_endpoints: [
          "GET /n8n-reservations/check?date=DD.MM.YYYY&time=HH:MM&employee=NAME&duration=60",
          "POST /n8n-reservations (body: customer_name, reservation_date, reservation_time, product_name, price_paid, ...)"
        ]
      }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in n8n-reservations:", error);
    return new Response(
      JSON.stringify({ error: error.message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

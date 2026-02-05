import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Building2,
  Plus,
  Loader2
} from 'lucide-react';
import { useStaffMembers } from '@/hooks/useStaffMembers';
import { useReservations } from '@/hooks/usePortalData';
import { useShiftExceptions } from '@/hooks/useShiftExceptions';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { format, addDays, subDays, isSameDay, getDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TimeSlot {
  time: string;
  available: boolean;
  blockedByException?: boolean;
  blockedByClosedDay?: boolean;
  conflictingReservation?: {
    customer_name: string;
    reservation_time: string;
    end_time?: string;
  };
}

export const AvailabilityView = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null); // "staffId-time" for loading state
  
  const { staffMembers, isLoading: staffLoading } = useStaffMembers();
  const { data: reservations, isLoading: reservationsLoading, refetch } = useReservations();
  const { hasExceptionAt, isLoading: exceptionsLoading } = useShiftExceptions();
  const { isDayClosed } = useBusinessSettings();
  const { user } = useAuth();

  const activeStaff = useMemo(() => 
    staffMembers?.filter(s => s.is_active) || [], 
    [staffMembers]
  );

  // Business hours: 11:00 - 22:00, 30-minute slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 11; hour < 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  // Check if selected date is a global closed day
  const isClosedDay = useMemo(() => {
    return isDayClosed(getDay(selectedDate));
  }, [selectedDate, isDayClosed]);

  // Calculate availability per staff member
  // A slot is blocked if: 1) Global closed day OR 2) Shift exception OR 3) Reservation overlap
  const availabilityMatrix = useMemo(() => {
    if (!reservations || !activeStaff.length) return {};

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const slotDurationMinutes = 30; // Each slot represents 30 minutes

    const matrix: Record<string, TimeSlot[]> = {};

    activeStaff.forEach(staff => {
      // If it's a closed day, all slots are blocked
      if (isClosedDay) {
        matrix[staff.id] = timeSlots.map(slotTime => ({
          time: slotTime,
          available: false,
          blockedByClosedDay: true
        }));
        return;
      }

      const staffReservations = reservations.filter(res => 
        res.reservation_date === dateStr && 
        res.staff_member_id === staff.id &&
        res.status !== 'cancelled'
      );

      matrix[staff.id] = timeSlots.map(slotTime => {
        const [slotHour, slotMinutes] = slotTime.split(':').map(Number);
        const slotStart = new Date(`${dateStr}T${slotTime}:00`);
        const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60000);

        // Check if there's a shift exception (Freistellung) blocking this slot
        const isExceptionBlocked = hasExceptionAt(staff.id, dateStr, slotHour, slotMinutes);
        
        if (isExceptionBlocked) {
          return {
            time: slotTime,
            available: false,
            blockedByException: true
          };
        }

        // Check if this 30-min slot overlaps with any existing reservation
        let conflictingRes: typeof staffReservations[0] | undefined;
        const hasConflict = staffReservations.some(res => {
          const resStart = new Date(`${dateStr}T${res.reservation_time}`);
          let resEnd: Date;
          if (res.end_time) {
            resEnd = new Date(`${dateStr}T${res.end_time}`);
          } else {
            resEnd = new Date(resStart.getTime() + 30 * 60000);
          }
          const overlaps = (slotStart < resEnd && slotEnd > resStart);
          if (overlaps) conflictingRes = res;
          return overlaps;
        });

        return {
          time: slotTime,
          available: !hasConflict,
          blockedByException: false,
          conflictingReservation: conflictingRes ? {
            customer_name: conflictingRes.customer_name,
            reservation_time: conflictingRes.reservation_time,
            end_time: conflictingRes.end_time
          } : undefined
        };
      });
    });

    return matrix;
  }, [reservations, activeStaff, selectedDate, timeSlots, hasExceptionAt, isClosedDay]);

  // Count free slots per staff
  const freeSlotCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(availabilityMatrix).forEach(([staffId, slots]) => {
      counts[staffId] = slots.filter(s => s.available).length;
    });
    return counts;
  }, [availabilityMatrix]);

  const isLoading = staffLoading || reservationsLoading || exceptionsLoading;

  const handleSlotClick = async (staffId: string, staffName: string, slotTime: string) => {
    if (!user?.id) {
      toast.error('Nicht angemeldet');
      return;
    }

    const slotKey = `${staffId}-${slotTime}`;
    setBookingSlot(slotKey);

    try {
      // Calculate end time (30 min after start)
      const [hours, minutes] = slotTime.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(hours, minutes + 30, 0, 0);
      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

      const { error } = await supabase
        .from('reservations')
        .insert({
          user_id: user.id,
          customer_name: 'Blockiert',
          reservation_date: format(selectedDate, 'yyyy-MM-dd'),
          reservation_time: slotTime,
          end_time: endTime,
          party_size: 1,
          status: 'confirmed',
          source: 'manual',
          staff_member_id: staffId,
          notes: 'Slot blockiert',
        });

      if (error) throw error;

      toast.success(`${slotTime} Uhr bei ${staffName} blockiert`);
      refetch();
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error('Fehler beim Blockieren: ' + error.message);
    } finally {
      setBookingSlot(null);
    }
  };

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Verfügbarkeit
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px]">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(selectedDate, 'EEEE, d. MMMM', { locale: de })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  locale={de}
                />
              </PopoverContent>
            </Popover>
            
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
            
            {!isSameDay(selectedDate, new Date()) && (
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                Heute
              </Button>
            )}
          </div>
        </div>
        
        {isClosedDay ? (
          <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-muted">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-medium">
              Ruhetag – Geschäft geschlossen
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">
            Nur freie Zeitfenster pro Mitarbeiter – ideal für schnelle Verfügbarkeitsprüfung.
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : activeStaff.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Keine aktiven Mitarbeiter vorhanden.</p>
            <p className="text-sm mt-1">Fügen Sie Mitarbeiter im Mitarbeiter-Kalender hinzu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Header with staff names */}
              <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `80px repeat(${activeStaff.length}, 1fr)` }}>
                <div className="text-sm font-medium text-muted-foreground flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Zeit
                </div>
                {activeStaff.map(staff => (
                  <div key={staff.id} className="text-center">
                    <div 
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: staff.color }}
                    >
                      {staff.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {freeSlotCounts[staff.id] || 0} frei
                    </div>
                  </div>
                ))}
              </div>

              {/* Time slots grid - only show available */}
              <div className="space-y-1">
                {timeSlots.map(slotTime => {
                  // Check if any staff has this slot available
                  const anyAvailable = activeStaff.some(staff => 
                    availabilityMatrix[staff.id]?.find(s => s.time === slotTime)?.available
                  );

                  if (!anyAvailable) return null;

                  return (
                    <motion.div 
                      key={slotTime}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="grid gap-2 items-center"
                      style={{ gridTemplateColumns: `80px repeat(${activeStaff.length}, 1fr)` }}
                    >
                      <div className="text-sm font-medium text-muted-foreground">
                        {slotTime}
                      </div>
                      {activeStaff.map(staff => {
                        const slot = availabilityMatrix[staff.id]?.find(s => s.time === slotTime);
                        const isAvailable = slot?.available || false;
                        const slotKey = `${staff.id}-${slotTime}`;
                        const isBooking = bookingSlot === slotKey;

                        const conflictInfo = slot?.conflictingReservation;
                        const isClosedDayBlocked = slot?.blockedByClosedDay;
                        const isExceptionBlocked = slot?.blockedByException;
                        
                        return (
                          <div key={`${staff.id}-${slotTime}`} className="flex justify-center">
                            {isBooking ? (
                              <Badge 
                                variant="outline" 
                                className="bg-primary/10 text-primary border-primary/30"
                              >
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ...
                              </Badge>
                            ) : isAvailable ? (
                              <Badge 
                                variant="outline" 
                                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer transition-colors"
                                onClick={() => handleSlotClick(staff.id, staff.name, slotTime)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Frei
                              </Badge>
                            ) : isClosedDayBlocked ? (
                              <Badge 
                                variant="outline" 
                                className="bg-muted text-muted-foreground border-border cursor-default"
                              >
                                <Building2 className="w-3 h-3 mr-1" />
                                Ruhetag
                              </Badge>
                            ) : isExceptionBlocked ? (
                              <Badge 
                                variant="outline" 
                                className="bg-amber-500/10 text-amber-600 border-amber-500/30 cursor-default"
                              >
                                <Ban className="w-3 h-3 mr-1" />
                                Frei
                              </Badge>
                            ) : conflictInfo ? (
                              <Badge 
                                variant="outline" 
                                className="bg-destructive/10 text-destructive border-destructive/30 cursor-default text-xs"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                {conflictInfo.reservation_time.slice(0, 5)}
                                {conflictInfo.end_time ? `-${conflictInfo.end_time.slice(0, 5)}` : ''}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <div className="flex flex-wrap gap-4 justify-center">
                  {activeStaff.map(staff => {
                    const freeCount = freeSlotCounts[staff.id] || 0;
                    const totalSlots = timeSlots.length;
                    const percentage = Math.round((freeCount / totalSlots) * 100);
                    
                    return (
                      <div key={staff.id} className="flex items-center gap-2 text-sm">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: staff.color }}
                        />
                        <span className="font-medium">{staff.name}:</span>
                        <span className={freeCount > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                          {freeCount}/{totalSlots} frei ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

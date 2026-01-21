import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useStaffMembers, useUpdateReservationStaff, StaffMember } from '@/hooks/useStaffMembers';
import { useReservations } from '@/hooks/usePortalData';
import { StaffManagementDialog } from './StaffManagementDialog';
import ReservationForm from './ReservationForm';

type StaffViewMode = 'day' | 'week';

interface Reservation {
  id: string;
  customer_name: string;
  reservation_date: string;
  reservation_time: string;
  end_time: string | null;
  party_size: number;
  notes: string | null;
  status: string;
  staff_member_id?: string | null;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 9); // 09:00 - 22:00
const HOUR_HEIGHT = 60; // px per hour

export const StaffCalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<StaffViewMode>('day');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string; staffId: string } | null>(null);
  const [draggedReservation, setDraggedReservation] = useState<string | null>(null);

  const { data: staffMembers = [] } = useStaffMembers();
  const { data: reservations = [], refetch } = useReservations();
  const updateStaffMutation = useUpdateReservationStaff();

  const weekDays = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { locale: de });
      const end = endOfWeek(currentDate, { locale: de });
      return eachDayOfInterval({ start, end });
    }
    return [currentDate];
  }, [currentDate, viewMode]);

  const navigatePrev = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  const getReservationsForStaffAndDate = useCallback(
    (staffId: string, date: Date) => {
      return (reservations as Reservation[]).filter(
        (res) =>
          res.staff_member_id === staffId &&
          isSameDay(new Date(res.reservation_date), date)
      );
    },
    [reservations]
  );

  const getUnassignedReservationsForDate = useCallback(
    (date: Date) => {
      return (reservations as Reservation[]).filter(
        (res) =>
          !res.staff_member_id &&
          isSameDay(new Date(res.reservation_date), date)
      );
    },
    [reservations]
  );

  const calculateBlockPosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const startHour = 9;
    return ((hours - startHour) * HOUR_HEIGHT) + (minutes / 60) * HOUR_HEIGHT;
  };

  const calculateBlockHeight = (startTime: string, endTime: string | null) => {
    const [startH, startM] = startTime.split(':').map(Number);
    let endH = startH + 1;
    let endM = startM;
    
    if (endTime) {
      [endH, endM] = endTime.split(':').map(Number);
    }
    
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    return Math.max(30, (durationMinutes / 60) * HOUR_HEIGHT);
  };

  const handleDragStart = (e: React.DragEvent, reservationId: string) => {
    setDraggedReservation(reservationId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, staffId: string, date: Date) => {
    e.preventDefault();
    if (!draggedReservation) return;

    // Check for conflicts
    const targetReservations = getReservationsForStaffAndDate(staffId, date);
    const draggedRes = (reservations as Reservation[]).find(r => r.id === draggedReservation);
    
    if (draggedRes) {
      const hasConflict = targetReservations.some(r => {
        if (r.id === draggedReservation) return false;
        return r.reservation_time === draggedRes.reservation_time;
      });

      if (hasConflict) {
        setDraggedReservation(null);
        return;
      }

      updateStaffMutation.mutate({
        reservationId: draggedReservation,
        staffMemberId: staffId
      });
    }

    setDraggedReservation(null);
  };

  const handleSlotClick = (date: Date, hour: number, staffId: string) => {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    setSelectedSlot({ date, time, staffId });
    setIsFormOpen(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/90';
      case 'pending': return 'bg-yellow-500/90';
      case 'cancelled': return 'bg-red-500/90';
      case 'completed': return 'bg-blue-500/90';
      default: return 'bg-muted';
    }
  };

  // Render single day columns
  const renderDayView = () => (
    <div className="flex overflow-x-auto">
      {/* Time column */}
      <div className="flex-shrink-0 w-16 border-r border-border/50">
        <div className="h-12 border-b border-border/50" /> {/* Header spacer */}
        <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute w-full text-xs text-muted-foreground pr-2 text-right"
              style={{ top: (hour - 9) * HOUR_HEIGHT - 6 }}
            >
              {hour}:00
            </div>
          ))}
        </div>
      </div>

      {/* Unassigned column */}
      <div className="flex-shrink-0 w-32 border-r border-border/50 bg-muted/30">
        <div className="h-12 border-b border-border/50 flex items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground">Nicht zugewiesen</span>
        </div>
        <div
          className="relative"
          style={{ height: HOURS.length * HOUR_HEIGHT }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, '', currentDate)}
        >
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute w-full border-t border-border/20"
              style={{ top: (hour - 9) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            />
          ))}
          {getUnassignedReservationsForDate(currentDate).map((res) => (
            <motion.div
              key={res.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              draggable
              onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, res.id)}
              className={`absolute left-1 right-1 rounded-md px-2 py-1 cursor-move shadow-sm border border-white/20 ${getStatusColor(res.status)} text-white`}
              style={{
                top: calculateBlockPosition(res.reservation_time),
                height: calculateBlockHeight(res.reservation_time, res.end_time),
                minHeight: 30
              }}
            >
              <div className="text-[10px] font-medium truncate">{res.reservation_time.slice(0, 5)}</div>
              <div className="text-xs font-semibold truncate">{res.customer_name}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Staff columns */}
      {staffMembers.map((staff: StaffMember) => (
        <div key={staff.id} className="flex-shrink-0 w-40 border-r border-border/30">
          {/* Staff header */}
          <div className="h-12 border-b border-border/50 flex items-center justify-center gap-2 px-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback style={{ backgroundColor: staff.color, color: 'white', fontSize: '10px' }}>
                {getInitials(staff.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">{staff.name}</span>
          </div>

          {/* Time slots */}
          <div
            className="relative"
            style={{ height: HOURS.length * HOUR_HEIGHT }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, staff.id, currentDate)}
          >
            {/* Hour lines */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-border/20 hover:bg-primary/5 cursor-pointer transition-colors"
                style={{ top: (hour - 9) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                onClick={() => handleSlotClick(currentDate, hour, staff.id)}
              />
            ))}

            {/* Reservations */}
            {getReservationsForStaffAndDate(staff.id, currentDate).map((res) => (
              <motion.div
                key={res.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                draggable
                onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, res.id)}
                className="absolute left-1 right-1 rounded-md px-2 py-1 cursor-move shadow-sm text-white overflow-hidden"
                style={{
                  top: calculateBlockPosition(res.reservation_time),
                  height: calculateBlockHeight(res.reservation_time, res.end_time),
                  backgroundColor: staff.color,
                  minHeight: 30
                }}
              >
                <div className="text-[10px] font-medium opacity-90">
                  {res.reservation_time.slice(0, 5)} - {res.end_time?.slice(0, 5) || ''}
                </div>
                <div className="text-xs font-semibold truncate">{res.customer_name}</div>
                {res.notes && (
                  <div className="text-[10px] opacity-80 truncate">{res.notes}</div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {staffMembers.length === 0 && (
        <div className="flex-1 flex items-center justify-center min-h-[400px] text-muted-foreground">
          <div className="text-center">
            <p className="mb-2">Keine Mitarbeiter vorhanden</p>
            <StaffManagementDialog trigger={<Button size="sm"><Plus className="w-4 h-4 mr-2" />Mitarbeiter hinzufügen</Button>} />
          </div>
        </div>
      )}
    </div>
  );

  // Render week view (simplified - one column per staff, stacked days)
  const renderWeekView = () => (
    <div className="space-y-4">
      {weekDays.map((day) => (
        <div key={day.toISOString()} className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 font-medium flex items-center justify-between">
            <span>{format(day, 'EEEE, d. MMMM', { locale: de })}</span>
            {isSameDay(day, new Date()) && (
              <Badge variant="secondary">Heute</Badge>
            )}
          </div>
          <div className="flex overflow-x-auto">
            {/* Time column */}
            <div className="flex-shrink-0 w-14 border-r border-border/50">
              <div className="relative" style={{ height: HOURS.length * (HOUR_HEIGHT / 2) }}>
                {HOURS.filter((_, i) => i % 2 === 0).map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full text-xs text-muted-foreground pr-1 text-right"
                    style={{ top: ((hour - 9) / 2) * (HOUR_HEIGHT / 2) - 4 }}
                  >
                    {hour}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Staff columns */}
            {staffMembers.map((staff: StaffMember) => (
              <div key={staff.id} className="flex-shrink-0 w-32 border-r border-border/30">
                <div
                  className="relative"
                  style={{ height: HOURS.length * (HOUR_HEIGHT / 2) }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, staff.id, day)}
                >
                  {getReservationsForStaffAndDate(staff.id, day).map((res) => (
                    <motion.div
                      key={res.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      draggable
                      onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, res.id)}
                      className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 cursor-move text-white text-[10px]"
                      style={{
                        top: calculateBlockPosition(res.reservation_time) / 2,
                        height: Math.max(20, calculateBlockHeight(res.reservation_time, res.end_time) / 2),
                        backgroundColor: staff.color,
                      }}
                    >
                      <div className="font-medium truncate">{res.reservation_time.slice(0, 5)} {res.customer_name}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={navigatePrev}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[200px] text-center">
            {viewMode === 'day'
              ? format(currentDate, 'EEEE, d. MMMM yyyy', { locale: de })
              : `KW ${format(currentDate, 'w', { locale: de })} - ${format(currentDate, 'MMMM yyyy', { locale: de })}`
            }
          </h2>
          <Button variant="ghost" size="icon" onClick={navigateNext}>
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Heute
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              Tagesansicht
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Wochenansicht
            </Button>
          </div>
          <StaffManagementDialog />
        </div>
      </div>

      {/* Staff header row (for day view) */}
      {viewMode === 'day' && staffMembers.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-2">
          {staffMembers.map((staff: StaffMember) => (
            <div
              key={staff.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: staff.color + '20', borderColor: staff.color, borderWidth: 1 }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: staff.color }} />
              <span className="text-sm font-medium whitespace-nowrap">{staff.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <Card className="overflow-hidden">
        {viewMode === 'day' ? renderDayView() : renderWeekView()}
      </Card>

      {/* New reservation dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neuer Termin</DialogTitle>
          </DialogHeader>
          <ReservationForm
            onSuccess={() => {
              setIsFormOpen(false);
              setSelectedSlot(null);
              refetch();
            }}
            defaultValues={
              selectedSlot
                ? {
                    reservation_date: format(selectedSlot.date, 'yyyy-MM-dd'),
                    reservation_time: selectedSlot.time,
                  }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

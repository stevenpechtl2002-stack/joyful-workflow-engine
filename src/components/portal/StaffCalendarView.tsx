import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, User, Phone, Mail, Clock, Calendar, Users, FileText, Pencil, Sparkles } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useStaffMembers, useUpdateReservationStaff, StaffMember } from '@/hooks/useStaffMembers';
import { useReservations } from '@/hooks/usePortalData';
import { StaffManagementDialog } from './StaffManagementDialog';
import ReservationForm from './ReservationForm';
import { SmartTextImport } from './SmartTextImport';

type StaffViewMode = 'day' | 'week';

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  reservation_date: string;
  reservation_time: string;
  end_time: string | null;
  party_size: number;
  notes: string | null;
  status: string;
  staff_member_id?: string | null;
  source?: string | null;
  product_id?: string | null;
  price_paid?: number | null;
}

// 30-Minuten-Intervalle von 09:00 - 22:00
const TIME_SLOTS = Array.from({ length: 26 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const minutes = (i % 2) * 30;
  return { hour, minutes, label: `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}` };
});
const SLOT_HEIGHT = 30; // px per 30-min slot

export const StaffCalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<StaffViewMode>('day');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string; staffId: string } | null>(null);
  const [draggedReservation, setDraggedReservation] = useState<string | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [smartImportStaffId, setSmartImportStaffId] = useState<string | undefined>();

  const { staffMembers } = useStaffMembers();
  const activeStaffMembers = staffMembers.filter(s => s.is_active);
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
    const totalMinutesFromStart = (hours - startHour) * 60 + minutes;
    return (totalMinutesFromStart / 30) * SLOT_HEIGHT;
  };

  const calculateBlockHeight = (startTime: string, endTime: string | null) => {
    const [startH, startM] = startTime.split(':').map(Number);
    let endH = startH + 1;
    let endM = startM;
    
    if (endTime) {
      [endH, endM] = endTime.split(':').map(Number);
    }
    
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    return Math.max(SLOT_HEIGHT, (durationMinutes / 30) * SLOT_HEIGHT);
  };

  const handleDragStart = (e: React.DragEvent, reservationId: string) => {
    setDraggedReservation(reservationId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Check if it's a text drop (smart import) vs reservation drag
    const hasText = e.dataTransfer.types.includes('text/plain') && !draggedReservation;
    e.dataTransfer.dropEffect = hasText ? 'copy' : 'move';
  };

  const handleTextDrop = (e: React.DragEvent, staffId: string, date: Date) => {
    const text = e.dataTransfer.getData('text/plain');
    // Only open smart import if it's actual text content (not a reservation drag)
    if (text && text.length > 2 && !draggedReservation) {
      e.preventDefault();
      e.stopPropagation();
      setSmartImportStaffId(staffId || undefined);
      setIsSmartImportOpen(true);
      // Store text for the dialog (we'll use a ref or state)
      setTimeout(() => {
        const textarea = document.querySelector('[data-smart-import-textarea]') as HTMLTextAreaElement;
        if (textarea) {
          textarea.value = text;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 100);
    }
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

  const handleSlotClick = (date: Date, hour: number, minutes: number, staffId: string) => {
    const time = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Bestätigt';
      case 'pending': return 'Ausstehend';
      case 'cancelled': return 'Storniert';
      case 'completed': return 'Abgeschlossen';
      default: return status;
    }
  };

  const getSourceLabel = (source?: string | null) => {
    switch (source) {
      case 'voice_agent': return 'Telefonassistent';
      case 'n8n': return 'Automatisierung';
      case 'manual': return 'Manuell';
      case 'web': return 'Webseite';
      default: return source || 'Unbekannt';
    }
  };

  const handleReservationClick = (e: React.MouseEvent, res: Reservation) => {
    e.stopPropagation();
    setSelectedReservation(res);
    setIsDetailOpen(true);
  };

  const getStaffName = (staffId?: string | null) => {
    if (!staffId) return 'Nicht zugewiesen';
    const staff = activeStaffMembers.find(s => s.id === staffId);
    return staff?.name || 'Unbekannt';
  };

  // Render single day columns
  const renderDayView = () => (
    <div className="flex overflow-x-auto">
      {/* Time column */}
      <div className="flex-shrink-0 w-16 border-r border-border-subtle">
        <div className="h-12 border-b border-border-subtle" /> {/* Header spacer */}
        <div className="relative" style={{ height: TIME_SLOTS.length * SLOT_HEIGHT }}>
          {TIME_SLOTS.map((slot, idx) => (
            <div
              key={slot.label}
              className="absolute w-full text-xs text-muted-foreground pr-2 text-right"
              style={{ top: idx * SLOT_HEIGHT - 6 }}
            >
              {slot.label}
            </div>
          ))}
        </div>
      </div>

      {/* Unassigned column */}
      <div className="flex-shrink-0 w-32 border-r border-border-subtle bg-muted/30">
        <div className="h-12 border-b border-border-subtle flex items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground">Nicht zugewiesen</span>
        </div>
        <div
          className="relative"
          style={{ height: TIME_SLOTS.length * SLOT_HEIGHT }}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, '', currentDate)}
        >
          {TIME_SLOTS.map((slot, idx) => (
            <div
              key={slot.label}
              className={`absolute w-full border-t ${slot.minutes === 0 ? 'border-border-subtle' : 'border-border-subtle/30'}`}
              style={{ top: idx * SLOT_HEIGHT, height: SLOT_HEIGHT }}
            />
          ))}
          {getUnassignedReservationsForDate(currentDate).map((res) => (
            <motion.div
              key={res.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              draggable
              onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, res.id)}
              onClick={(e) => handleReservationClick(e as unknown as React.MouseEvent, res)}
              className={`absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer shadow-sm border border-white/20 ${getStatusColor(res.status)} text-white hover:ring-2 hover:ring-white/50 transition-all`}
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
      {activeStaffMembers.map((staff: StaffMember) => (
        <div key={staff.id} className="flex-shrink-0 w-40 border-r border-border-subtle/50">
          {/* Staff header */}
          <div className="h-12 border-b border-border-subtle flex items-center justify-center gap-2 px-2">
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
            style={{ height: TIME_SLOTS.length * SLOT_HEIGHT }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, staff.id, currentDate)}
          >
            {/* 30-min slot lines */}
            {TIME_SLOTS.map((slot, idx) => (
              <div
                key={slot.label}
                className={`absolute w-full border-t ${slot.minutes === 0 ? 'border-border-subtle' : 'border-border-subtle/30'} hover:bg-primary/5 cursor-pointer transition-colors`}
                style={{ top: idx * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                onClick={() => handleSlotClick(currentDate, slot.hour, slot.minutes, staff.id)}
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
                onClick={(e) => handleReservationClick(e as unknown as React.MouseEvent, res)}
                className="absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer shadow-sm text-white overflow-hidden hover:ring-2 hover:ring-white/50 transition-all"
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

      {activeStaffMembers.length === 0 && (
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
            <div className="flex-shrink-0 w-14 border-r border-border-subtle">
              <div className="relative" style={{ height: TIME_SLOTS.length * (SLOT_HEIGHT / 2) }}>
                {TIME_SLOTS.filter((_, i) => i % 2 === 0).map((slot, idx) => (
                  <div
                    key={slot.label}
                    className="absolute w-full text-xs text-muted-foreground pr-1 text-right"
                    style={{ top: (idx / 2) * (SLOT_HEIGHT) - 4 }}
                  >
                    {slot.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Staff columns */}
            {activeStaffMembers.map((staff: StaffMember) => (
              <div key={staff.id} className="flex-shrink-0 w-32 border-r border-border-subtle/50">
                <div
                  className="relative"
                  style={{ height: TIME_SLOTS.length * (SLOT_HEIGHT / 2) }}
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
                      onClick={(e) => handleReservationClick(e as unknown as React.MouseEvent, res)}
                      className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 cursor-pointer text-white text-[10px] hover:ring-2 hover:ring-white/50 transition-all"
                      style={{
                        top: calculateBlockPosition(res.reservation_time) / 2,
                        height: Math.max(15, calculateBlockHeight(res.reservation_time, res.end_time) / 2),
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setSmartImportStaffId(undefined);
              setIsSmartImportOpen(true);
            }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Text Import
          </Button>
          <StaffManagementDialog />
        </div>
      </div>

      {/* Staff header row (for day view) */}
      {viewMode === 'day' && activeStaffMembers.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-2">
          {activeStaffMembers.map((staff: StaffMember) => (
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

      {/* Reservation detail/edit dialog */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => {
        setIsDetailOpen(open);
        if (!open) setIsEditMode(false);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {isEditMode ? 'Reservierung bearbeiten' : 'Reservierungsdetails'}
            </DialogTitle>
            {!isEditMode && (
              <DialogDescription>
                Details zur ausgewählten Reservierung
              </DialogDescription>
            )}
          </DialogHeader>
          
          {selectedReservation && !isEditMode && (
            <div className="space-y-4">
              {/* Edit Button */}
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditMode(true)}
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Bearbeiten
                </Button>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge className={`${getStatusColor(selectedReservation.status)} text-white`}>
                  {getStatusLabel(selectedReservation.status)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Quelle: {getSourceLabel(selectedReservation.source)}
                </span>
              </div>

              {/* Customer Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Kunde</p>
                    <p className="font-medium">{selectedReservation.customer_name}</p>
                  </div>
                </div>

                {selectedReservation.customer_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <p className="font-medium">{selectedReservation.customer_phone}</p>
                    </div>
                  </div>
                )}

                {selectedReservation.customer_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">E-Mail</p>
                      <p className="font-medium">{selectedReservation.customer_email}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Appointment Details */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Datum</p>
                    <p className="font-medium">
                      {format(new Date(selectedReservation.reservation_date), 'EEEE, d. MMMM yyyy', { locale: de })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Uhrzeit</p>
                    <p className="font-medium">
                      {selectedReservation.reservation_time.slice(0, 5)} 
                      {selectedReservation.end_time && ` - ${selectedReservation.end_time.slice(0, 5)}`} Uhr
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Mitarbeiter</p>
                    <p className="font-medium">{getStaffName(selectedReservation.staff_member_id)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Personenanzahl</p>
                    <p className="font-medium">{selectedReservation.party_size} Person(en)</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedReservation.notes && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Notizen / Dienstleistung</p>
                      <p className="font-medium whitespace-pre-wrap">{selectedReservation.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedReservation && isEditMode && (
            <ReservationForm
              mode="edit"
              editData={{
                id: selectedReservation.id,
                customer_name: selectedReservation.customer_name,
                customer_phone: selectedReservation.customer_phone,
                customer_email: selectedReservation.customer_email,
                reservation_date: selectedReservation.reservation_date,
                reservation_time: selectedReservation.reservation_time,
                end_time: selectedReservation.end_time,
                party_size: selectedReservation.party_size,
                notes: selectedReservation.notes,
                status: selectedReservation.status,
                staff_member_id: selectedReservation.staff_member_id,
              }}
              onSuccess={() => {
                setIsDetailOpen(false);
                setIsEditMode(false);
                setSelectedReservation(null);
                refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Smart Text Import Dialog */}
      <SmartTextImport
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
        onSuccess={() => {
          refetch();
        }}
        defaultDate={currentDate}
        defaultStaffId={smartImportStaffId}
      />
    </div>
  );
};

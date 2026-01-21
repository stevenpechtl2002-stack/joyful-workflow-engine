import { useState, useMemo } from 'react';
import { useStaffMembers } from '@/hooks/useStaffMembers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Clock, CalendarDays, Save, Copy, UserCircle, Users } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

interface ShiftSchedule {
  staffId: string;
  date: Date;
  startTime: string;
  endTime: string;
  isWorking: boolean;
}

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const DEFAULT_START = '09:00';
const DEFAULT_END = '18:00';

const Shifts = () => {
  const { staffMembers, isLoading } = useStaffMembers();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<{
    staffId: string;
    dayIndex: number;
    startTime: string;
    endTime: string;
    isWorking: boolean;
  } | null>(null);
  
  // Bulk edit state
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkStartTime, setBulkStartTime] = useState(DEFAULT_START);
  const [bulkEndTime, setBulkEndTime] = useState(DEFAULT_END);
  const [bulkDays, setBulkDays] = useState<number[]>([0, 1, 2, 3, 4]); // Mo-Fr default
  const [bulkIsWorking, setBulkIsWorking] = useState(true);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  const getScheduleForDay = (staffId: string, date: Date): ShiftSchedule | undefined => {
    return schedules.find(s => s.staffId === staffId && isSameDay(s.date, date));
  };

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const handleToday = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleSaveSchedule = () => {
    if (!editingSchedule) return;

    const date = weekDays[editingSchedule.dayIndex];
    const existingIndex = schedules.findIndex(
      s => s.staffId === editingSchedule.staffId && isSameDay(s.date, date)
    );

    const newSchedule: ShiftSchedule = {
      staffId: editingSchedule.staffId,
      date,
      startTime: editingSchedule.startTime,
      endTime: editingSchedule.endTime,
      isWorking: editingSchedule.isWorking
    };

    if (existingIndex >= 0) {
      const updated = [...schedules];
      updated[existingIndex] = newSchedule;
      setSchedules(updated);
    } else {
      setSchedules([...schedules, newSchedule]);
    }

    setEditingSchedule(null);
    toast.success('Dienstplan gespeichert');
  };

  const handleCopyWeek = () => {
    // Copy current week to next week
    const nextWeekStart = addWeeks(currentWeek, 1);
    const newSchedules = schedules
      .filter(s => weekDays.some(d => isSameDay(s.date, d)))
      .map(s => ({
        ...s,
        date: addWeeks(s.date, 1)
      }));
    
    setSchedules([...schedules, ...newSchedules]);
    toast.success('Woche wurde kopiert');
  };

  const handleBulkApply = () => {
    const newSchedules: ShiftSchedule[] = [];
    
    activeStaff.forEach((staff) => {
      bulkDays.forEach((dayIndex) => {
        const date = weekDays[dayIndex];
        const existingIndex = schedules.findIndex(
          s => s.staffId === staff.id && isSameDay(s.date, date)
        );
        
        const newSchedule: ShiftSchedule = {
          staffId: staff.id,
          date,
          startTime: bulkStartTime,
          endTime: bulkEndTime,
          isWorking: bulkIsWorking
        };
        
        if (existingIndex >= 0) {
          // Will be updated later
          newSchedules.push({ ...newSchedule, staffId: staff.id });
        } else {
          newSchedules.push(newSchedule);
        }
      });
    });
    
    // Update existing and add new
    const updatedSchedules = [...schedules];
    newSchedules.forEach((newSched) => {
      const existingIndex = updatedSchedules.findIndex(
        s => s.staffId === newSched.staffId && isSameDay(s.date, newSched.date)
      );
      if (existingIndex >= 0) {
        updatedSchedules[existingIndex] = newSched;
      } else {
        updatedSchedules.push(newSched);
      }
    });
    
    setSchedules(updatedSchedules);
    setIsBulkDialogOpen(false);
    toast.success(`Zeiten auf ${activeStaff.length} Mitarbeiter angewendet`);
  };

  const toggleBulkDay = (dayIndex: number) => {
    if (bulkDays.includes(dayIndex)) {
      setBulkDays(bulkDays.filter(d => d !== dayIndex));
    } else {
      setBulkDays([...bulkDays, dayIndex].sort());
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const activeStaff = staffMembers.filter(s => s.is_active);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dienstplan</h1>
          <p className="text-muted-foreground mt-1">
            Planen Sie die Arbeitszeiten Ihrer Mitarbeiter
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={handleToday}>
            Heute
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="gap-2 ml-4" onClick={handleCopyWeek}>
            <Copy className="w-4 h-4" />
            Woche kopieren
          </Button>
          
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Users className="w-4 h-4" />
                Alle bearbeiten
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Zeiten auf alle Mitarbeiter anwenden</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <Label>Arbeitet</Label>
                  <Switch
                    checked={bulkIsWorking}
                    onCheckedChange={setBulkIsWorking}
                  />
                </div>
                
                {bulkIsWorking && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Beginn</Label>
                        <Input
                          type="time"
                          value={bulkStartTime}
                          onChange={(e) => setBulkStartTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ende</Label>
                        <Input
                          type="time"
                          value={bulkEndTime}
                          onChange={(e) => setBulkEndTime(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tage auswählen</Label>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAYS.map((day, index) => (
                          <button
                            key={day}
                            onClick={() => toggleBulkDay(index)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              bulkDays.includes(index)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {day.slice(0, 2)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                <div className="text-sm text-muted-foreground">
                  Diese Zeiten werden auf <span className="font-medium text-foreground">{activeStaff.length} Mitarbeiter</span> für die ausgewählten Tage angewendet.
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Abbrechen</Button>
                </DialogClose>
                <Button onClick={handleBulkApply} className="gap-2" disabled={bulkDays.length === 0}>
                  <Save className="w-4 h-4" />
                  Auf alle anwenden
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Week Display */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {format(currentWeek, 'dd. MMMM', { locale: de })} - {format(addDays(currentWeek, 6), 'dd. MMMM yyyy', { locale: de })}
        </h2>
      </div>

      {activeStaff.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">Keine aktiven Mitarbeiter</h3>
            <p className="text-muted-foreground text-center mt-1">
              Fügen Sie zuerst Mitarbeiter hinzu, um den Dienstplan zu erstellen.
            </p>
            <Button className="mt-4 gap-2" onClick={() => window.location.href = '/portal/staff'}>
              Zu Mitarbeiter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Wochenübersicht
            </TabsTrigger>
            <TabsTrigger value="individual" className="gap-2">
              <Clock className="w-4 h-4" />
              Einzelansicht
            </TabsTrigger>
          </TabsList>

          {/* Week Overview */}
          <TabsContent value="overview">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="p-4 text-left font-medium text-muted-foreground w-48">
                          Mitarbeiter
                        </th>
                        {weekDays.map((day, i) => (
                          <th key={i} className="p-4 text-center font-medium text-muted-foreground min-w-[120px]">
                            <div>{WEEKDAYS[i]}</div>
                            <div className="text-sm">{format(day, 'dd.MM.', { locale: de })}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeStaff.map((staff) => (
                        <tr key={staff.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8 border-2" style={{ borderColor: staff.color }}>
                                <AvatarImage src={staff.avatar_url || undefined} />
                                <AvatarFallback style={{ backgroundColor: staff.color + '20', color: staff.color }}>
                                  {getInitials(staff.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{staff.name}</span>
                            </div>
                          </td>
                          {weekDays.map((day, dayIndex) => {
                            const schedule = getScheduleForDay(staff.id, day);
                            return (
                              <td key={dayIndex} className="p-2 text-center">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button
                                      onClick={() => setEditingSchedule({
                                        staffId: staff.id,
                                        dayIndex,
                                        startTime: schedule?.startTime || DEFAULT_START,
                                        endTime: schedule?.endTime || DEFAULT_END,
                                        isWorking: schedule?.isWorking ?? true
                                      })}
                                      className={`w-full p-2 rounded-lg text-sm transition-all hover:ring-2 hover:ring-primary/50 ${
                                        schedule?.isWorking
                                          ? 'bg-primary/10 text-primary'
                                          : schedule
                                          ? 'bg-muted text-muted-foreground'
                                          : 'bg-muted/50 text-muted-foreground/50 border border-dashed'
                                      }`}
                                    >
                                      {schedule?.isWorking ? (
                                        <div>
                                          <div className="font-medium">{schedule.startTime}</div>
                                          <div className="text-xs">{schedule.endTime}</div>
                                        </div>
                                      ) : schedule ? (
                                        <div className="text-xs">Frei</div>
                                      ) : (
                                        <div className="text-xs">+</div>
                                      )}
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        {staff.name} - {WEEKDAYS[dayIndex]}, {format(day, 'dd.MM.yyyy')}
                                      </DialogTitle>
                                    </DialogHeader>
                                    {editingSchedule && (
                                      <div className="space-y-4 py-4">
                                        <div className="flex items-center justify-between">
                                          <Label>Arbeitet</Label>
                                          <Switch
                                            checked={editingSchedule.isWorking}
                                            onCheckedChange={(checked) => 
                                              setEditingSchedule({ ...editingSchedule, isWorking: checked })
                                            }
                                          />
                                        </div>
                                        
                                        {editingSchedule.isWorking && (
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <Label>Beginn</Label>
                                              <Input
                                                type="time"
                                                value={editingSchedule.startTime}
                                                onChange={(e) => 
                                                  setEditingSchedule({ ...editingSchedule, startTime: e.target.value })
                                                }
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Ende</Label>
                                              <Input
                                                type="time"
                                                value={editingSchedule.endTime}
                                                onChange={(e) => 
                                                  setEditingSchedule({ ...editingSchedule, endTime: e.target.value })
                                                }
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <DialogFooter>
                                      <DialogClose asChild>
                                        <Button variant="outline">Abbrechen</Button>
                                      </DialogClose>
                                      <DialogClose asChild>
                                        <Button onClick={handleSaveSchedule} className="gap-2">
                                          <Save className="w-4 h-4" />
                                          Speichern
                                        </Button>
                                      </DialogClose>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Individual View */}
          <TabsContent value="individual">
            <div className="space-y-4">
              <Select value={selectedStaff || ''} onValueChange={setSelectedStaff}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Mitarbeiter auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {activeStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: staff.color }} />
                        {staff.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedStaff && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {weekDays.map((day, dayIndex) => {
                    const schedule = getScheduleForDay(selectedStaff, day);
                    const staff = activeStaff.find(s => s.id === selectedStaff);
                    
                    return (
                      <Card key={dayIndex}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{WEEKDAYS[dayIndex]}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {format(day, 'dd. MMMM yyyy', { locale: de })}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <Dialog>
                            <DialogTrigger asChild>
                              <button
                                onClick={() => setEditingSchedule({
                                  staffId: selectedStaff,
                                  dayIndex,
                                  startTime: schedule?.startTime || DEFAULT_START,
                                  endTime: schedule?.endTime || DEFAULT_END,
                                  isWorking: schedule?.isWorking ?? true
                                })}
                                className={`w-full p-4 rounded-lg text-center transition-all hover:ring-2 hover:ring-primary/50 ${
                                  schedule?.isWorking
                                    ? 'bg-primary/10 text-primary'
                                    : schedule
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-muted/50 text-muted-foreground/50 border border-dashed'
                                }`}
                              >
                                {schedule?.isWorking ? (
                                  <div>
                                    <Clock className="w-5 h-5 mx-auto mb-2" />
                                    <div className="font-medium text-lg">{schedule.startTime} - {schedule.endTime}</div>
                                  </div>
                                ) : schedule ? (
                                  <div className="py-2 text-muted-foreground">Frei</div>
                                ) : (
                                  <div className="py-2 text-muted-foreground/50">Klicken zum Hinzufügen</div>
                                )}
                              </button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  {staff?.name} - {WEEKDAYS[dayIndex]}, {format(day, 'dd.MM.yyyy')}
                                </DialogTitle>
                              </DialogHeader>
                              {editingSchedule && (
                                <div className="space-y-4 py-4">
                                  <div className="flex items-center justify-between">
                                    <Label>Arbeitet</Label>
                                    <Switch
                                      checked={editingSchedule.isWorking}
                                      onCheckedChange={(checked) => 
                                        setEditingSchedule({ ...editingSchedule, isWorking: checked })
                                      }
                                    />
                                  </div>
                                  
                                  {editingSchedule.isWorking && (
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Beginn</Label>
                                        <Input
                                          type="time"
                                          value={editingSchedule.startTime}
                                          onChange={(e) => 
                                            setEditingSchedule({ ...editingSchedule, startTime: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Ende</Label>
                                        <Input
                                          type="time"
                                          value={editingSchedule.endTime}
                                          onChange={(e) => 
                                            setEditingSchedule({ ...editingSchedule, endTime: e.target.value })
                                          }
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Abbrechen</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button onClick={handleSaveSchedule} className="gap-2">
                                    <Save className="w-4 h-4" />
                                    Speichern
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Shifts;

import { useState, useMemo } from 'react';
import { useStaffMembers } from '@/hooks/useStaffMembers';
import { useStaffShifts } from '@/hooks/useStaffShifts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Clock, CalendarDays, Save, UserCircle, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const DEFAULT_START = '09:00';
const DEFAULT_END = '18:00';

const Shifts = () => {
  const { staffMembers, isLoading: staffLoading } = useStaffMembers();
  const { shifts, isLoading: shiftsLoading, upsertShift, upsertBulkShifts, getShiftForStaffAndDay, isUpserting, isBulkUpserting } = useStaffShifts();
  
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
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

  const handleSaveSchedule = async () => {
    if (!editingSchedule) return;

    await upsertShift.mutateAsync({
      staff_member_id: editingSchedule.staffId,
      day_of_week: editingSchedule.dayIndex,
      start_time: editingSchedule.startTime,
      end_time: editingSchedule.endTime,
      is_working: editingSchedule.isWorking
    });

    setEditingSchedule(null);
    toast.success('Dienstplan gespeichert');
  };

  const handleBulkApply = async () => {
    const shiftsToCreate = activeStaff.flatMap((staff) =>
      bulkDays.map((dayIndex) => ({
        staff_member_id: staff.id,
        day_of_week: dayIndex,
        start_time: bulkStartTime,
        end_time: bulkEndTime,
        is_working: bulkIsWorking
      }))
    );

    await upsertBulkShifts.mutateAsync(shiftsToCreate);
    setIsBulkDialogOpen(false);
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
  const isLoading = staffLoading || shiftsLoading;

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
            Planen Sie die Standard-Arbeitszeiten Ihrer Mitarbeiter (wöchentlich wiederkehrend)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
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
                <Button onClick={handleBulkApply} className="gap-2" disabled={bulkDays.length === 0 || isBulkUpserting}>
                  {isBulkUpserting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Auf alle anwenden
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
                        {WEEKDAYS.map((day, i) => (
                          <th key={i} className="p-4 text-center font-medium text-muted-foreground min-w-[120px]">
                            <div>{day}</div>
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
                          {WEEKDAYS.map((_, dayIndex) => {
                            const shift = getShiftForStaffAndDay(staff.id, dayIndex);
                            return (
                              <td key={dayIndex} className="p-2 text-center">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button
                                      onClick={() => setEditingSchedule({
                                        staffId: staff.id,
                                        dayIndex,
                                        startTime: shift?.start_time?.slice(0, 5) || DEFAULT_START,
                                        endTime: shift?.end_time?.slice(0, 5) || DEFAULT_END,
                                        isWorking: shift?.is_working ?? true
                                      })}
                                      className={`w-full p-2 rounded-lg text-sm transition-all hover:ring-2 hover:ring-primary/50 ${
                                        shift?.is_working
                                          ? 'bg-primary/10 text-primary'
                                          : shift
                                          ? 'bg-muted text-muted-foreground'
                                          : 'bg-muted/50 text-muted-foreground/50 border border-dashed'
                                      }`}
                                    >
                                      {shift?.is_working ? (
                                        <div>
                                          <div className="font-medium">{shift.start_time?.slice(0, 5)}</div>
                                          <div className="text-xs">{shift.end_time?.slice(0, 5)}</div>
                                        </div>
                                      ) : shift ? (
                                        <div className="text-xs">Frei</div>
                                      ) : (
                                        <div className="text-xs">+</div>
                                      )}
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        {staff.name} - {WEEKDAYS[dayIndex]}
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
                                        <Button onClick={handleSaveSchedule} className="gap-2" disabled={isUpserting}>
                                          {isUpserting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
                  {WEEKDAYS.map((dayName, dayIndex) => {
                    const shift = getShiftForStaffAndDay(selectedStaff, dayIndex);
                    const staff = activeStaff.find(s => s.id === selectedStaff);
                    
                    return (
                      <Card key={dayIndex}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{dayName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Dialog>
                            <DialogTrigger asChild>
                              <button
                                onClick={() => setEditingSchedule({
                                  staffId: selectedStaff,
                                  dayIndex,
                                  startTime: shift?.start_time?.slice(0, 5) || DEFAULT_START,
                                  endTime: shift?.end_time?.slice(0, 5) || DEFAULT_END,
                                  isWorking: shift?.is_working ?? true
                                })}
                                className={`w-full p-4 rounded-lg text-center transition-all hover:ring-2 hover:ring-primary/50 ${
                                  shift?.is_working
                                    ? 'bg-primary/10 text-primary'
                                    : shift
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-muted/50 text-muted-foreground/50 border border-dashed'
                                }`}
                              >
                                {shift?.is_working ? (
                                  <div>
                                    <Clock className="w-5 h-5 mx-auto mb-2" />
                                    <div className="font-medium text-lg">{shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}</div>
                                  </div>
                                ) : shift ? (
                                  <div className="py-2 text-muted-foreground">Frei</div>
                                ) : (
                                  <div className="py-2 text-muted-foreground/50">Klicken zum Hinzufügen</div>
                                )}
                              </button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  {staff?.name} - {dayName}
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
                                  <Button onClick={handleSaveSchedule} className="gap-2" disabled={isUpserting}>
                                    {isUpserting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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

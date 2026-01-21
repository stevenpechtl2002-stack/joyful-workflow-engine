import { useState } from 'react';
import { useStaffMembers } from '@/hooks/useStaffMembers';
import { useReservations } from '@/hooks/usePortalData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, GripVertical, UserCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const Staff = () => {
  const { staffMembers, isLoading, createStaffMember, updateStaffMember, deleteStaffMember } = useStaffMembers();
  const { data: reservations = [], refetch: refetchReservations } = useReservations();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffColor, setNewStaffColor] = useState(COLORS[0]);
  
  // Deactivation with reassignment
  const [deactivatingStaff, setDeactivatingStaff] = useState<any>(null);
  const [reassignToStaffId, setReassignToStaffId] = useState<string>('none');
  
  const activeStaffMembers = staffMembers.filter(s => s.is_active);
  
  // Get reservations assigned to a specific staff member
  const getStaffReservationCount = (staffId: string) => {
    return reservations.filter(r => r.staff_member_id === staffId).length;
  };

  const handleAddStaff = async () => {
    if (!newStaffName.trim()) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    try {
      await createStaffMember({
        name: newStaffName.trim(),
        color: newStaffColor,
        is_active: true,
        sort_order: staffMembers.length
      });
      setNewStaffName('');
      setNewStaffColor(COLORS[0]);
      setIsAddDialogOpen(false);
      toast.success('Mitarbeiter erfolgreich hinzugefügt');
    } catch (error) {
      toast.error('Fehler beim Hinzufügen des Mitarbeiters');
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff || !editingStaff.name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }

    try {
      await updateStaffMember({
        id: editingStaff.id,
        name: editingStaff.name.trim(),
        color: editingStaff.color,
        is_active: editingStaff.is_active
      });
      setEditingStaff(null);
      toast.success('Mitarbeiter erfolgreich aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Mitarbeiters');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      await deleteStaffMember(id);
      toast.success('Mitarbeiter erfolgreich gelöscht');
    } catch (error) {
      toast.error('Fehler beim Löschen des Mitarbeiters');
    }
  };

  const handleToggleActive = async (staff: any) => {
    // If activating, just do it
    if (!staff.is_active) {
      try {
        await updateStaffMember({
          id: staff.id,
          is_active: true
        });
        toast.success('Mitarbeiter aktiviert');
      } catch (error) {
        toast.error('Fehler beim Aktivieren');
      }
      return;
    }
    
    // If deactivating, check for assigned reservations
    const reservationCount = getStaffReservationCount(staff.id);
    if (reservationCount > 0) {
      setDeactivatingStaff(staff);
      setReassignToStaffId('none');
    } else {
      // No reservations, just deactivate
      try {
        await updateStaffMember({
          id: staff.id,
          is_active: false
        });
        toast.success('Mitarbeiter deaktiviert');
      } catch (error) {
        toast.error('Fehler beim Deaktivieren');
      }
    }
  };

  const handleConfirmDeactivation = async () => {
    if (!deactivatingStaff) return;
    
    try {
      // Reassign reservations if a target was selected
      if (reassignToStaffId && reassignToStaffId !== 'none') {
        const { error: reassignError } = await supabase
          .from('reservations')
          .update({ staff_member_id: reassignToStaffId })
          .eq('staff_member_id', deactivatingStaff.id);
        
        if (reassignError) throw reassignError;
        
        const targetStaff = staffMembers.find(s => s.id === reassignToStaffId);
        toast.success(`Termine wurden zu ${targetStaff?.name} verschoben`);
      } else {
        // Remove staff assignment from reservations
        const { error: removeError } = await supabase
          .from('reservations')
          .update({ staff_member_id: null })
          .eq('staff_member_id', deactivatingStaff.id);
        
        if (removeError) throw removeError;
      }
      
      // Now deactivate the staff member
      await updateStaffMember({
        id: deactivatingStaff.id,
        is_active: false
      });
      
      refetchReservations();
      setDeactivatingStaff(null);
      toast.success('Mitarbeiter deaktiviert');
    } catch (error) {
      toast.error('Fehler beim Deaktivieren');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

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
          <h1 className="text-3xl font-bold text-foreground">Mitarbeiter</h1>
          <p className="text-muted-foreground mt-1">
            Verwalten Sie Ihre Mitarbeiter für die Terminzuordnung
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Mitarbeiter hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Mitarbeiter hinzufügen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Mitarbeitername eingeben"
                />
              </div>
              <div className="space-y-2">
                <Label>Farbe</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewStaffColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        newStaffColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Abbrechen</Button>
              </DialogClose>
              <Button onClick={handleAddStaff}>Hinzufügen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff List */}
      <div className="grid gap-4">
        {staffMembers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground">Keine Mitarbeiter</h3>
              <p className="text-muted-foreground text-center mt-1">
                Fügen Sie Ihren ersten Mitarbeiter hinzu, um Termine zuzuordnen.
              </p>
              <Button 
                className="mt-4 gap-2" 
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Mitarbeiter hinzufügen
              </Button>
            </CardContent>
          </Card>
        ) : (
          staffMembers.map((staff, index) => (
            <Card key={staff.id} className={!staff.is_active ? 'opacity-60' : ''}>
              <CardContent className="flex items-center gap-4 py-4">
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                
                <Avatar className="w-12 h-12 border-2" style={{ borderColor: staff.color }}>
                  <AvatarImage src={staff.avatar_url || undefined} />
                  <AvatarFallback style={{ backgroundColor: staff.color + '20', color: staff.color }}>
                    {getInitials(staff.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{staff.name}</h3>
                    <Badge variant={staff.is_active ? 'default' : 'secondary'}>
                      {staff.is_active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: staff.color }} 
                    />
                    <span className="text-sm text-muted-foreground">
                      Position {index + 1}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={staff.is_active}
                    onCheckedChange={() => handleToggleActive(staff)}
                  />
                  
                  <Dialog open={editingStaff?.id === staff.id} onOpenChange={(open) => !open && setEditingStaff(null)}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setEditingStaff({ ...staff })}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Mitarbeiter bearbeiten</DialogTitle>
                      </DialogHeader>
                      {editingStaff && (
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                              id="edit-name"
                              value={editingStaff.name}
                              onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Farbe</Label>
                            <div className="flex flex-wrap gap-2">
                              {COLORS.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => setEditingStaff({ ...editingStaff, color })}
                                  className={`w-8 h-8 rounded-full transition-all ${
                                    editingStaff.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                                  }`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Abbrechen</Button>
                        </DialogClose>
                        <Button onClick={handleUpdateStaff}>Speichern</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mitarbeiter löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Möchten Sie "{staff.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Deactivation Dialog with Reassignment */}
      <Dialog open={!!deactivatingStaff} onOpenChange={(open) => !open && setDeactivatingStaff(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitarbeiter deaktivieren</DialogTitle>
          </DialogHeader>
          {deactivatingStaff && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="w-10 h-10 border-2" style={{ borderColor: deactivatingStaff.color }}>
                  <AvatarFallback style={{ backgroundColor: deactivatingStaff.color + '20', color: deactivatingStaff.color }}>
                    {getInitials(deactivatingStaff.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{deactivatingStaff.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getStaffReservationCount(deactivatingStaff.id)} zugewiesene Termine
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Termine verschieben zu</Label>
                <Select value={reassignToStaffId} onValueChange={setReassignToStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mitarbeiter auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Keine Zuordnung (Termine ohne Mitarbeiter)</span>
                    </SelectItem>
                    {activeStaffMembers
                      .filter(s => s.id !== deactivatingStaff.id)
                      .map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: staff.color }} />
                            {staff.name}
                          </div>
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              {reassignToStaffId && reassignToStaffId !== 'none' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowRight className="w-4 h-4" />
                  <span>
                    {getStaffReservationCount(deactivatingStaff.id)} Termine werden zu{' '}
                    <span className="font-medium text-foreground">
                      {staffMembers.find(s => s.id === reassignToStaffId)?.name}
                    </span>{' '}
                    verschoben
                  </span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivatingStaff(null)}>
              Abbrechen
            </Button>
            <Button onClick={handleConfirmDeactivation}>
              Deaktivieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Staff;

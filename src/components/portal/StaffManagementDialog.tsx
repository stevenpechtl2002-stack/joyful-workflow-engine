import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { useStaffMembers, useCreateStaffMember, useDeleteStaffMember, StaffMember } from '@/hooks/useStaffMembers';

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#10B981',
  '#06B6D4', '#EF4444', '#F59E0B', '#84CC16', '#6366F1'
];

interface StaffManagementDialogProps {
  trigger?: React.ReactNode;
}

export const StaffManagementDialog = ({ trigger }: StaffManagementDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const { data: staffMembers = [] } = useStaffMembers();
  const createMutation = useCreateStaffMember();
  const deleteMutation = useDeleteStaffMember();

  const handleAddStaff = () => {
    if (!newName.trim()) return;
    
    createMutation.mutate(
      { name: newName.trim(), color: newColor },
      {
        onSuccess: () => {
          setNewName('');
          setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
        }
      }
    );
  };

  const handleDeleteStaff = (id: string) => {
    if (confirm('Mitarbeiter wirklich entfernen?')) {
      deleteMutation.mutate(id);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Mitarbeiter verwalten
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mitarbeiter verwalten</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add new staff */}
          <div className="space-y-3">
            <Label>Neuer Mitarbeiter</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Name eingeben..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStaff()}
              />
              <Button onClick={handleAddStaff} disabled={!newName.trim() || createMutation.isPending}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-6 h-6 rounded-full transition-transform ${newColor === color ? 'scale-125 ring-2 ring-offset-2 ring-primary' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Staff list */}
          <div className="space-y-2">
            <Label>Aktive Mitarbeiter ({staffMembers.length})</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {staffMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Noch keine Mitarbeiter hinzugefügt
                </p>
              ) : (
                staffMembers.map((staff: StaffMember) => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback style={{ backgroundColor: staff.color, color: 'white' }}>
                          {getInitials(staff.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{staff.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteStaff(staff.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

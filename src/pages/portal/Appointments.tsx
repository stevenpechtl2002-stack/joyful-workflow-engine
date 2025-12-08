import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: string;
  location: string | null;
  created_at: string;
}

const Appointments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [newAppointment, setNewAppointment] = useState({
    title: '',
    description: '',
    date: undefined as Date | undefined,
    startTime: '09:00',
    endTime: '10:00',
    location: '',
  });

  const fetchAppointments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: 'Fehler',
        description: 'Termine konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } else {
      setAppointments(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !newAppointment.date) {
      toast({
        title: 'Fehler',
        description: 'Bitte alle Pflichtfelder ausfüllen.',
        variant: 'destructive',
      });
      return;
    }

    const startDateTime = new Date(newAppointment.date);
    const [startHours, startMinutes] = newAppointment.startTime.split(':');
    startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

    const endDateTime = new Date(newAppointment.date);
    const [endHours, endMinutes] = newAppointment.endTime.split(':');
    endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

    const { error } = await supabase.from('appointments').insert({
      user_id: user.id,
      title: newAppointment.title,
      description: newAppointment.description || null,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      location: newAppointment.location || null,
      status: 'pending',
    });

    if (error) {
      toast({
        title: 'Fehler',
        description: 'Termin konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Erfolgreich',
        description: 'Termin wurde erstellt.',
      });
      setIsDialogOpen(false);
      setNewAppointment({
        title: '',
        description: '',
        date: undefined,
        startTime: '09:00',
        endTime: '10:00',
        location: '',
      });
      fetchAppointments();
    }
  };

  const handleCancelAppointment = async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Fehler',
        description: 'Termin konnte nicht storniert werden.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Erfolgreich',
        description: 'Termin wurde storniert.',
      });
      fetchAppointments();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
            <CheckCircle2 className="w-3 h-3" />
            Bestätigt
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
            <XCircle className="w-3 h-3" />
            Storniert
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
            <CheckCircle2 className="w-3 h-3" />
            Abgeschlossen
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500">
            <AlertCircle className="w-3 h-3" />
            Ausstehend
          </span>
        );
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Termine
          </h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Termine und Buchungen
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Neuer Termin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Neuen Termin erstellen</DialogTitle>
              <DialogDescription>
                Füllen Sie die Details für Ihren neuen Termin aus.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateAppointment} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={newAppointment.title}
                  onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
                  placeholder="z.B. Beratungsgespräch"
                  required
                  className="bg-secondary/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung</Label>
                <Textarea
                  id="description"
                  value={newAppointment.description}
                  onChange={(e) => setNewAppointment({ ...newAppointment, description: e.target.value })}
                  placeholder="Optionale Beschreibung..."
                  className="bg-secondary/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Datum *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-secondary/50",
                        !newAppointment.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newAppointment.date 
                        ? format(newAppointment.date, "PPP", { locale: de })
                        : "Datum auswählen"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newAppointment.date}
                      onSelect={(date) => setNewAppointment({ ...newAppointment, date })}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Startzeit *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newAppointment.startTime}
                    onChange={(e) => setNewAppointment({ ...newAppointment, startTime: e.target.value })}
                    required
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Endzeit *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newAppointment.endTime}
                    onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })}
                    required
                    className="bg-secondary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Ort</Label>
                <Input
                  id="location"
                  value={newAppointment.location}
                  onChange={(e) => setNewAppointment({ ...newAppointment, location: e.target.value })}
                  placeholder="z.B. Online Meeting"
                  className="bg-secondary/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit" variant="hero">
                  Termin erstellen
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Termine durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? '' : 'border-border/50'}
            >
              {status === 'all' && 'Alle'}
              {status === 'pending' && 'Ausstehend'}
              {status === 'confirmed' && 'Bestätigt'}
              {status === 'completed' && 'Abgeschlossen'}
              {status === 'cancelled' && 'Storniert'}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredAppointments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <CalendarIcon className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Keine Termine gefunden
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all' 
              ? 'Versuchen Sie andere Suchkriterien.'
              : 'Erstellen Sie Ihren ersten Termin.'}
          </p>
          <Button variant="hero" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Termin erstellen
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {filteredAppointments.map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="glass border-border/50 hover:border-primary/30 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <CalendarIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-foreground text-lg">
                            {appointment.title}
                          </h3>
                          {getStatusBadge(appointment.status)}
                        </div>
                        {appointment.description && (
                          <p className="text-muted-foreground text-sm mb-2">
                            {appointment.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {format(new Date(appointment.start_time), "PPP", { locale: de })}
                            {' · '}
                            {format(new Date(appointment.start_time), "HH:mm")}
                            {' - '}
                            {format(new Date(appointment.end_time), "HH:mm")}
                          </span>
                          {appointment.location && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {appointment.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelAppointment(appointment.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Stornieren
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Appointments;

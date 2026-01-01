import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, 
  Plus, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send
} from 'lucide-react';
import { useSupportTickets } from '@/hooks/usePortalData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const Support = () => {
  const { user } = useAuth();
  const { data: tickets, isLoading, refetch } = useSupportTickets();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'normal',
  });

  const handleSubmit = async () => {
    if (!user?.id || !newTicket.subject || !newTicket.message) {
      toast.error('Bitte füllen Sie alle Felder aus');
      return;
    }
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          ...newTicket,
        });

      if (error) throw error;

      toast.success('Ticket erfolgreich erstellt');
      setNewTicket({ subject: '', message: '', category: 'general', priority: 'normal' });
      setIsFormOpen(false);
      refetch();
    } catch (error: any) {
      toast.error('Fehler: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { class: string; label: string }> = {
      open: { class: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Offen' },
      in_progress: { class: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', label: 'In Bearbeitung' },
      resolved: { class: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Gelöst' },
      closed: { class: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: 'Geschlossen' },
    };
    const style = styles[status] || styles.open;
    return (
      <Badge variant="outline" className={style.class}>
        {style.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, { class: string; label: string }> = {
      low: { class: 'bg-gray-500/10 text-gray-500', label: 'Niedrig' },
      normal: { class: 'bg-blue-500/10 text-blue-500', label: 'Normal' },
      high: { class: 'bg-orange-500/10 text-orange-500', label: 'Hoch' },
      urgent: { class: 'bg-red-500/10 text-red-500', label: 'Dringend' },
    };
    const style = styles[priority] || styles.normal;
    return (
      <Badge variant="outline" className={`${style.class} border-0`}>
        {style.label}
      </Badge>
    );
  };

  const categories = [
    { value: 'general', label: 'Allgemein' },
    { value: 'technical', label: 'Technisch' },
    { value: 'billing', label: 'Abrechnung' },
    { value: 'feature', label: 'Feature-Anfrage' },
  ];

  const priorities = [
    { value: 'low', label: 'Niedrig' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Hoch' },
    { value: 'urgent', label: 'Dringend' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Support</h1>
          <p className="text-muted-foreground">
            Haben Sie Fragen? Unser Support-Team ist für Sie da.
          </p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Neues Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Neues Support-Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Betreff</Label>
                <Input
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Kurze Beschreibung des Problems"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select value={newTicket.category} onValueChange={(v) => setNewTicket(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priorität</Label>
                  <Select value={newTicket.priority} onValueChange={(v) => setNewTicket(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nachricht</Label>
                <Textarea
                  value={newTicket.message}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Beschreiben Sie Ihr Anliegen ausführlich..."
                  rows={5}
                />
              </div>

              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Ticket erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Tickets List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="glass border-border/50">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority || 'normal')}
                      </div>
                      <p className="text-muted-foreground mb-3">{ticket.message}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(ticket.created_at), 'dd. MMM yyyy, HH:mm', { locale: de })}
                        </span>
                        <span className="capitalize">{ticket.category}</span>
                      </div>
                    </div>
                  </div>

                  {ticket.admin_response && (
                    <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Support-Antwort</span>
                        {ticket.responded_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(ticket.responded_at), 'dd. MMM, HH:mm', { locale: de })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{ticket.admin_response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass border-border/50">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">Noch keine Tickets</h3>
              <p className="text-muted-foreground mb-4">
                Haben Sie eine Frage? Erstellen Sie Ihr erstes Support-Ticket.
              </p>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Neues Ticket erstellen
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Contact Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Weitere Kontaktmöglichkeiten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-medium mb-1">Live Chat</h4>
                <p className="text-sm text-muted-foreground">Mo-Fr 9-18 Uhr</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-medium mb-1">E-Mail</h4>
                <p className="text-sm text-muted-foreground">support@voiceagent.ai</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-medium mb-1">Notfall-Hotline</h4>
                <p className="text-sm text-muted-foreground">+49 123 456789</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Support;

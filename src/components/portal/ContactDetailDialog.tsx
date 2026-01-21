import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, User, Calendar, Clock, Users, Loader2, Link2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Contact {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  info: string | null;
  consent_status: string | null;
  gender: string | null;
  booking_count: number | null;
  original_created_at: string | null;
  created_at: string;
}

interface Reservation {
  id: string;
  reservation_date: string;
  reservation_time: string;
  end_time: string | null;
  party_size: number;
  status: string;
  source: string;
  notes: string | null;
  customer_name: string;
  staff_member_id: string | null;
  contact_id: string | null;
  created_at: string;
}

interface ContactDetailDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactUpdated?: () => void;
}

const ContactDetailDialog = ({ contact, open, onOpenChange, onContactUpdated }: ContactDetailDialogProps) => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkedCount, setLinkedCount] = useState(0);

  useEffect(() => {
    if (contact && open) {
      fetchReservations();
    }
  }, [contact, open]);

  const fetchReservations = async () => {
    if (!contact) return;
    
    setLoading(true);
    try {
      // Get reservations linked to this contact
      const linkedQuery = supabase
        .from('reservations')
        .select('*')
        .order('reservation_date', { ascending: false })
        .order('reservation_time', { ascending: false });
      
      // @ts-ignore - contact_id column exists but types not updated yet
      const { data: linkedRes, error: linkedError } = await linkedQuery.eq('contact_id', contact.id);

      if (linkedError) throw linkedError;

      // Also find reservations by name that aren't linked yet
      const unlinkedQuery = supabase
        .from('reservations')
        .select('*')
        .eq('user_id', user?.id as string)
        .ilike('customer_name', contact.name)
        .order('reservation_date', { ascending: false })
        .limit(50);
      
      // @ts-ignore - contact_id column exists but types not updated yet
      const { data: unlinkedRes, error: unlinkedError } = await unlinkedQuery.is('contact_id', null);

      if (unlinkedError) throw unlinkedError;

      // Combine and deduplicate
      const allReservations = [...(linkedRes || []), ...(unlinkedRes || [])];
      const uniqueReservations = allReservations.filter((r: any, i: number, arr: any[]) => 
        arr.findIndex((x: any) => x.id === r.id) === i
      ) as unknown as Reservation[];

      setReservations(uniqueReservations);
      setLinkedCount((linkedRes || []).length);
    } catch (error: any) {
      toast.error('Fehler: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const linkReservationsToContact = async () => {
    if (!contact || !user?.id) return;

    setLinking(true);
    try {
      // Link all reservations matching this contact's name
      const updateQuery = supabase
        .from('reservations')
        .update({ contact_id: contact.id } as any)
        .eq('user_id', user.id)
        .ilike('customer_name', contact.name);
      
      // @ts-ignore - contact_id column exists but types not updated yet
      const { error } = await updateQuery.is('contact_id', null);

      if (error) throw error;

      toast.success('Reservierungen verknüpft');
      fetchReservations();
      onContactUpdated?.();
    } catch (error: any) {
      toast.error('Fehler: ' + error.message);
    } finally {
      setLinking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-primary/20 text-primary">Bestätigt</Badge>;
      case 'pending':
        return <Badge variant="secondary">Ausstehend</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Storniert</Badge>;
      case 'completed':
        return <Badge className="bg-muted text-muted-foreground">Abgeschlossen</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'manual': return 'Manuell';
      case 'voice_ai': return 'Voice AI';
      case 'n8n': return 'Automatisch';
      case 'csv_import': return 'CSV Import';
      default: return source;
    }
  };

  if (!contact) return null;

  const unlinkedCount = reservations.length - linkedCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {contact.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Kontaktdaten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {contact.phone && contact.phone !== '+49 8888 88' && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.gender && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{contact.gender === 'W' ? 'Weiblich' : contact.gender === 'M' ? 'Männlich' : contact.gender}</span>
                  </div>
                )}
                {!contact.phone && !contact.email && (
                  <span className="text-muted-foreground text-sm">Keine Kontaktdaten</span>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Statistiken</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Buchungen (Import)</span>
                  <Badge variant="secondary">{contact.booking_count || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Verknüpfte Termine</span>
                  <Badge>{linkedCount}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Kunde seit</span>
                  <span className="text-sm">
                    {contact.original_created_at 
                      ? format(new Date(contact.original_created_at), 'dd.MM.yyyy', { locale: de })
                      : format(new Date(contact.created_at), 'dd.MM.yyyy', { locale: de })}
                  </span>
                </div>
                {contact.consent_status && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Einwilligung</span>
                    {contact.consent_status === 'J' ? (
                      <Badge className="bg-primary/20 text-primary">Ja</Badge>
                    ) : (
                      <Badge variant="secondary">Nein</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info/Notes */}
          {contact.info && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Notizen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{contact.info}</p>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Booking History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Buchungshistorie
                {reservations.length > 0 && (
                  <Badge variant="outline">{reservations.length}</Badge>
                )}
              </h3>
              {unlinkedCount > 0 && (
                <Button 
                  size="sm" 
                  onClick={linkReservationsToContact}
                  disabled={linking}
                  className="gap-2"
                >
                  {linking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  {unlinkedCount} Reservierungen verknüpfen
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Keine Buchungen gefunden</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Zeit</TableHead>
                    <TableHead>Service/Notiz</TableHead>
                    <TableHead className="text-center">Personen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quelle</TableHead>
                    <TableHead className="text-center">Verknüpft</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell>
                        {format(new Date(res.reservation_date), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {res.reservation_time?.slice(0, 5)}
                          {res.end_time && ` - ${res.end_time.slice(0, 5)}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        {res.notes ? (
                          <span className="text-sm truncate max-w-[200px] block">{res.notes}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-3 h-3" />
                          {res.party_size}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(res.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getSourceLabel(res.source)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {(res as any).contact_id ? (
                          <CheckCircle className="w-4 h-4 text-primary mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDetailDialog;

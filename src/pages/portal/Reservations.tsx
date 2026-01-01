import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  Search, 
  Check, 
  X,
  Phone,
  Users,
  Calendar,
  Bot,
  User,
  MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useReservations } from '@/hooks/usePortalData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import ReservationForm from '@/components/portal/ReservationForm';

const Reservations = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const { data: reservations, isLoading, refetch } = useReservations({ status: statusFilter });

  const filteredReservations = reservations?.filter(res => {
    const matchesSearch = searchQuery === '' || 
      res.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.customer_phone?.includes(searchQuery);
    return matchesSearch;
  }) || [];

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id);
    
    if (error) {
      toast.error('Fehler beim Aktualisieren');
    } else {
      toast.success('Status aktualisiert');
      refetch();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      confirmed: 'bg-green-500/10 text-green-500 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
      completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      no_show: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };
    const labels: Record<string, string> = {
      confirmed: 'Bestätigt',
      pending: 'Offen',
      cancelled: 'Storniert',
      completed: 'Abgeschlossen',
      no_show: 'No-Show',
    };
    return (
      <Badge variant="outline" className={styles[status] || ''}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Reservierungen</h1>
          <p className="text-muted-foreground">
            Alle Reservierungen auf einen Blick verwalten.
          </p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Neue Reservierung
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Neue Reservierung</DialogTitle>
            </DialogHeader>
            <ReservationForm onSuccess={() => { setIsFormOpen(false); refetch(); }} />
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Suche nach Name oder Telefon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="pending">Offen</SelectItem>
            <SelectItem value="confirmed">Bestätigt</SelectItem>
            <SelectItem value="cancelled">Storniert</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
            <SelectItem value="no_show">No-Show</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass border-border/50">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Keine Reservierungen gefunden</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Zeit</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Personen</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Quelle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReservations.map((res) => (
                      <TableRow key={res.id}>
                        <TableCell className="font-medium">
                          {format(new Date(res.reservation_date), 'dd.MM.yyyy', { locale: de })}
                        </TableCell>
                        <TableCell>
                          {res.reservation_time.slice(0, 5)}
                        </TableCell>
                        <TableCell>{res.customer_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {res.party_size}
                          </div>
                        </TableCell>
                        <TableCell>
                          {res.customer_phone ? (
                            <a href={`tel:${res.customer_phone}`} className="flex items-center gap-1 hover:text-primary">
                              <Phone className="w-3 h-3" />
                              {res.customer_phone}
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            {res.source === 'voice_agent' ? (
                              <>
                                <Bot className="w-3 h-3" />
                                Voice Agent
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3" />
                                Manuell
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(res.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {res.status === 'pending' && (
                                <DropdownMenuItem onClick={() => updateStatus(res.id, 'confirmed')}>
                                  <Check className="w-4 h-4 mr-2 text-green-500" />
                                  Bestätigen
                                </DropdownMenuItem>
                              )}
                              {res.status !== 'cancelled' && res.status !== 'completed' && (
                                <DropdownMenuItem onClick={() => updateStatus(res.id, 'cancelled')}>
                                  <X className="w-4 h-4 mr-2 text-red-500" />
                                  Stornieren
                                </DropdownMenuItem>
                              )}
                              {res.status === 'confirmed' && (
                                <>
                                  <DropdownMenuItem onClick={() => updateStatus(res.id, 'completed')}>
                                    <Check className="w-4 h-4 mr-2 text-blue-500" />
                                    Abschließen
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateStatus(res.id, 'no_show')}>
                                    <X className="w-4 h-4 mr-2 text-gray-500" />
                                    No-Show
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Reservations;

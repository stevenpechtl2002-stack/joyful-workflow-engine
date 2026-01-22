import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
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
  MoreHorizontal,
  Trash2,
  Package,
  Euro,
  FileText
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useReservations } from '@/hooks/usePortalData';
import { useStaffMembers } from '@/hooks/useStaffMembers';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import ReservationForm from '@/components/portal/ReservationForm';

const Reservations = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { data: reservations, isLoading, refetch } = useReservations({ status: statusFilter });
  const { staffMembers } = useStaffMembers();
  const { data: products } = useProducts();
  
  // Create lookup maps
  const staffMap = new Map(staffMembers?.map(s => [s.id, s.name]) || []);
  const productMap = new Map(products?.map(p => [p.id, { name: p.name, price: p.price }]) || []);

  const filteredReservations = reservations?.filter(res => {
    const matchesSearch = searchQuery === '' || 
      res.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.customer_phone?.includes(searchQuery);
    return matchesSearch;
  }) || [];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredReservations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReservations.map(r => r.id));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    
    const { error } = await supabase
      .from('reservations')
      .delete()
      .in('id', selectedIds);
    
    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success(`${selectedIds.length} Reservierung(en) gelöscht`);
      setSelectedIds([]);
      refetch();
    }
  };

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

  const getSourceLabel = (source: string) => {
    const labels: Record<string, { label: string; icon: typeof Bot }> = {
      voice_agent: { label: 'Voice Agent', icon: Bot },
      n8n: { label: 'API/n8n', icon: Bot },
      manual: { label: 'Manuell', icon: User },
      api: { label: 'API', icon: Bot },
    };
    return labels[source] || { label: source, icon: User };
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
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
        
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={deleteSelected}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {selectedIds.length} löschen
            </Button>
          )}
          
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
        </div>
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
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectedIds.length === filteredReservations.length && filteredReservations.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Zeit</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Pers.</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Mitarbeiter</TableHead>
                      <TableHead>Produkt</TableHead>
                      <TableHead>Anfrage</TableHead>
                      <TableHead>Umsatz</TableHead>
                      <TableHead>Quelle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReservations.map((res) => {
                      const sourceInfo = getSourceLabel(res.source);
                      const product = res.product_id ? productMap.get(res.product_id) : null;
                      const staffName = res.staff_member_id ? staffMap.get(res.staff_member_id) : null;
                      // Calculate revenue: price_paid × party_size
                      const revenue = res.price_paid != null 
                        ? Number(res.price_paid) * (res.party_size || 1)
                        : (product ? Number(product.price) * (res.party_size || 1) : null);
                      
                      return (
                        <TableRow key={res.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedIds.includes(res.id)}
                              onCheckedChange={() => toggleSelect(res.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(new Date(res.reservation_date), 'dd.MM.yyyy', { locale: de })}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {res.reservation_time.slice(0, 5)}
                            {res.end_time && ` - ${res.end_time.slice(0, 5)}`}
                          </TableCell>
                          <TableCell className="font-medium">{res.customer_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              {res.party_size}
                            </div>
                          </TableCell>
                          <TableCell>
                            {res.customer_phone ? (
                              <a href={`tel:${res.customer_phone}`} className="flex items-center gap-1 hover:text-primary text-sm">
                                <Phone className="w-3 h-3" />
                                {res.customer_phone}
                              </a>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {staffName ? (
                              <span className="text-sm">{staffName}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {product ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Package className="w-3 h-3 text-muted-foreground" />
                                {product.name}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {res.notes ? (
                              <div className="flex items-center gap-1 text-sm max-w-[120px] truncate" title={res.notes}>
                                <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{res.notes}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {revenue != null ? (
                              <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                                <Euro className="w-3 h-3" />
                                {formatCurrency(revenue)}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <sourceInfo.icon className="w-3 h-3" />
                              <span className="hidden sm:inline">{sourceInfo.label}</span>
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
                      );
                    })}
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

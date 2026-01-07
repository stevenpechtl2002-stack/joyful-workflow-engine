import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, Phone, Calendar, DollarSign, Activity, 
  Search, Filter, LogOut, Shield, Ban, CheckCircle,
  TrendingUp, Clock, FileText, Key, Copy, Eye, EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Customer {
  id: string;
  email: string;
  company_name: string | null;
  plan: string;
  status: string;
  created_at: string;
  notes: string | null;
  sales_rep_id: string | null;
  api_key: string;
}

interface CallLog {
  id: string;
  user_id: string;
  caller_phone: string | null;
  call_status: string;
  call_duration: number | null;
  call_outcome: string | null;
  started_at: string;
}

interface Reservation {
  id: string;
  user_id: string;
  customer_name: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, roles, signOut, isLoading } = useAuth();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dataLoading, setDataLoading] = useState(true);
  const [visibleApiKeys, setVisibleApiKeys] = useState<Set<string>>(new Set());

  const toggleApiKeyVisibility = (customerId: string) => {
    setVisibleApiKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Kopiert',
      description: 'API-Key in die Zwischenablage kopiert',
    });
  };

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!user || !roles.includes('admin'))) {
      navigate('/portal/auth');
    }
  }, [user, roles, isLoading, navigate]);

  // Fetch all data
  useEffect(() => {
    if (user && roles.includes('admin')) {
      fetchAllData();
    }
  }, [user, roles]);

  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      const [customersRes, callLogsRes, reservationsRes] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('call_logs').select('*').order('started_at', { ascending: false }).limit(100),
        supabase.from('reservations').select('*').order('reservation_date', { ascending: false }).limit(100),
      ]);

      if (customersRes.data) setCustomers(customersRes.data);
      if (callLogsRes.data) setCallLogs(callLogsRes.data);
      if (reservationsRes.data) setReservations(reservationsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Fehler',
        description: 'Daten konnten nicht geladen werden',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const toggleCustomerStatus = async (customerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const { error } = await supabase
      .from('customers')
      .update({ status: newStatus })
      .eq('id', customerId);

    if (error) {
      toast({
        title: 'Fehler',
        description: 'Status konnte nicht geändert werden',
        variant: 'destructive',
      });
    } else {
      setCustomers(customers.map(c => 
        c.id === customerId ? { ...c, status: newStatus } : c
      ));
      toast({
        title: 'Erfolg',
        description: `Kunde wurde ${newStatus === 'active' ? 'aktiviert' : 'gesperrt'}`,
      });
    }
  };

  const updateCustomerNotes = async (customerId: string, notes: string) => {
    const { error } = await supabase
      .from('customers')
      .update({ notes })
      .eq('id', customerId);

    if (error) {
      toast({
        title: 'Fehler',
        description: 'Notizen konnten nicht gespeichert werden',
        variant: 'destructive',
      });
    } else {
      setCustomers(customers.map(c => 
        c.id === customerId ? { ...c, notes } : c
      ));
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const totalCalls = callLogs.length;
  const totalReservations = reservations.length;
  const starterPlanCount = customers.filter(c => c.plan === 'starter').length;
  const professionalPlanCount = customers.filter(c => c.plan === 'professional').length;
  const enterprisePlanCount = customers.filter(c => c.plan === 'enterprise').length;

  if (isLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Alle Kunden und Daten verwalten</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => signOut()} className="gap-2">
            <LogOut className="w-4 h-4" />
            Abmelden
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Kunden gesamt</p>
                  <p className="text-2xl font-bold text-foreground">{totalCustomers}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aktive Kunden</p>
                  <p className="text-2xl font-bold text-green-500">{activeCustomers}</p>
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Anrufe</p>
                  <p className="text-2xl font-bold text-foreground">{totalCalls}</p>
                </div>
                <Phone className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reservierungen</p>
                  <p className="text-2xl font-bold text-foreground">{totalReservations}</p>
                </div>
                <Calendar className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Distribution */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-foreground">{starterPlanCount}</p>
              <p className="text-sm text-muted-foreground">Starter Plan</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{professionalPlanCount}</p>
              <p className="text-sm text-muted-foreground">Professional Plan</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-amber-500">{enterprisePlanCount}</p>
              <p className="text-sm text-muted-foreground">Enterprise Plan</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="customers" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="customers">Kunden</TabsTrigger>
            <TabsTrigger value="calls">Anrufe</TabsTrigger>
            <TabsTrigger value="reservations">Reservierungen</TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Kundenverwaltung</CardTitle>
                    <CardDescription>Alle registrierten Kunden</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Suchen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 bg-secondary/50"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 rounded-md bg-secondary/50 border border-border text-sm"
                    >
                      <option value="all">Alle Status</option>
                      <option value="active">Aktiv</option>
                      <option value="suspended">Gesperrt</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Firma</TableHead>
                      <TableHead>API-Key</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.email}</TableCell>
                        <TableCell>{customer.company_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-2 py-1 rounded max-w-[140px] truncate">
                              {visibleApiKeys.has(customer.id) 
                                ? customer.api_key 
                                : '••••••••••••'}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => toggleApiKeyVisibility(customer.id)}
                            >
                              {visibleApiKeys.has(customer.id) ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => copyToClipboard(customer.api_key)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={customer.plan === 'enterprise' ? 'default' : 'secondary'}>
                            {customer.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={customer.status === 'active' ? 'default' : 'destructive'}>
                            {customer.status === 'active' ? 'Aktiv' : 'Gesperrt'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(customer.created_at), 'dd.MM.yyyy', { locale: de })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCustomerStatus(customer.id, customer.status)}
                          >
                            {customer.status === 'active' ? (
                              <Ban className="w-4 h-4 text-red-500" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Keine Kunden gefunden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calls">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Anrufprotokoll</CardTitle>
                <CardDescription>Letzte 100 Anrufe aller Kunden</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dauer</TableHead>
                      <TableHead>Ergebnis</TableHead>
                      <TableHead>Datum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callLogs.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>{call.caller_phone || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={call.call_status === 'completed' ? 'default' : 'secondary'}>
                            {call.call_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{call.call_duration ? `${call.call_duration}s` : '-'}</TableCell>
                        <TableCell>{call.call_outcome || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(call.started_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {callLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Keine Anrufe vorhanden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reservations">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle>Reservierungen</CardTitle>
                <CardDescription>Letzte 100 Reservierungen aller Kunden</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Uhrzeit</TableHead>
                      <TableHead>Personen</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.map((res) => (
                      <TableRow key={res.id}>
                        <TableCell className="font-medium">{res.customer_name}</TableCell>
                        <TableCell>
                          {format(new Date(res.reservation_date), 'dd.MM.yyyy', { locale: de })}
                        </TableCell>
                        <TableCell>{res.reservation_time}</TableCell>
                        <TableCell>{res.party_size}</TableCell>
                        <TableCell>
                          <Badge variant={res.status === 'confirmed' ? 'default' : 'secondary'}>
                            {res.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reservations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Keine Reservierungen vorhanden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, DollarSign, Activity, LogOut, Briefcase,
  TrendingUp, Calendar, Phone
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
}

interface DailyStats {
  id: string;
  user_id: string;
  stat_date: string;
  total_calls: number | null;
  reservations_made: number | null;
}

const SalesDashboard = () => {
  const navigate = useNavigate();
  const { user, roles, signOut, isLoading } = useAuth();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Redirect if not sales
  useEffect(() => {
    if (!isLoading && (!user || !roles.includes('sales'))) {
      navigate('/portal/auth');
    }
  }, [user, roles, isLoading, navigate]);

  // Fetch data for this sales rep
  useEffect(() => {
    if (user && roles.includes('sales')) {
      fetchData();
    }
  }, [user, roles]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      // Customers acquired by this sales rep
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('sales_rep_id', user?.id)
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;
      if (customersData) setCustomers(customersData);

      // Get stats for these customers
      if (customersData && customersData.length > 0) {
        const customerIds = customersData.map(c => c.id);
        const { data: statsData } = await supabase
          .from('daily_stats')
          .select('*')
          .in('user_id', customerIds)
          .order('stat_date', { ascending: false })
          .limit(30);

        if (statsData) setStats(statsData);
      }
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

  // Calculate revenue estimate based on plans
  const calculateRevenue = () => {
    return customers.reduce((total, customer) => {
      if (customer.status !== 'active') return total;
      switch (customer.plan) {
        case 'starter': return total + 199;
        case 'professional': return total + 499;
        case 'enterprise': return total + 999;
        default: return total;
      }
    }, 0);
  };

  // Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const monthlyRevenue = calculateRevenue();
  const totalCalls = stats.reduce((sum, s) => sum + (s.total_calls || 0), 0);
  const totalReservations = stats.reduce((sum, s) => sum + (s.reservations_made || 0), 0);

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
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Vertriebs Dashboard</h1>
              <p className="text-sm text-muted-foreground">Ihre geworbenen Kunden</p>
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
                  <p className="text-sm text-muted-foreground">Meine Kunden</p>
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
                  <p className="text-sm text-muted-foreground">Monatl. Umsatz</p>
                  <p className="text-2xl font-bold text-foreground">€{monthlyRevenue}</p>
                </div>
                <DollarSign className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gesamt Anrufe</p>
                  <p className="text-2xl font-bold text-foreground">{totalCalls}</p>
                </div>
                <Phone className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Performance Übersicht
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Gesamt Reservierungen</span>
                <span className="font-bold">{totalReservations}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Conversion Rate</span>
                <span className="font-bold">
                  {totalCalls > 0 ? ((totalReservations / totalCalls) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Durchschn. Umsatz/Kunde</span>
                <span className="font-bold">
                  €{activeCustomers > 0 ? Math.round(monthlyRevenue / activeCustomers) : 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Plan Verteilung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Starter (€199/Mo)</span>
                <Badge variant="secondary">
                  {customers.filter(c => c.plan === 'starter').length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Professional (€499/Mo)</span>
                <Badge>
                  {customers.filter(c => c.plan === 'professional').length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Enterprise (€999/Mo)</span>
                <Badge className="bg-amber-500">
                  {customers.filter(c => c.plan === 'enterprise').length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customers Table */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle>Meine Kunden</CardTitle>
            <CardDescription>Übersicht aller von Ihnen geworbenen Kunden</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Firma</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registriert</TableHead>
                  <TableHead>Umsatz/Mo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.email}</TableCell>
                    <TableCell>{customer.company_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={customer.plan === 'enterprise' ? 'default' : 'secondary'}>
                        {customer.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.status === 'active' ? 'default' : 'destructive'}>
                        {customer.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(customer.created_at), 'dd.MM.yyyy', { locale: de })}
                    </TableCell>
                    <TableCell className="font-medium">
                      €{customer.status === 'active' 
                        ? customer.plan === 'starter' ? 199 
                        : customer.plan === 'professional' ? 499 
                        : 999
                        : 0}
                    </TableCell>
                  </TableRow>
                ))}
                {customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Noch keine Kunden geworben
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SalesDashboard;
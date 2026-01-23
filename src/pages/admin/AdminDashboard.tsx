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
  TrendingUp, Clock, FileText, Key, Copy, Eye, EyeOff, Link2,
  CreditCard, Bot, Globe, Building2
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
}

interface CustomerWithApiKey extends Customer {
  api_key?: string;
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

interface VoiceAgentConfig {
  id: string;
  user_id: string;
  business_name: string | null;
  industry: string | null;
  language: string | null;
  voice: string | null;
  phone_number: string | null;
  website_url: string | null;
  greeting_text: string | null;
  opening_hours: any;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

interface StripeSubscription {
  id: string;
  customer: string;
  customer_email?: string;
  status: string;
  current_period_end: number;
  trial_end: number | null;
  metadata: {
    min_contract_months?: string;
    min_contract_end?: string;
    tier_name?: string;
    setup_paid?: string;
  };
  items: {
    data: Array<{
      price: {
        id: string;
        unit_amount: number;
        product: string;
      };
    }>;
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, roles, signOut, isLoading } = useAuth();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<CustomerWithApiKey[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [voiceAgentConfigs, setVoiceAgentConfigs] = useState<VoiceAgentConfig[]>([]);
  const [stripeSubscriptions, setStripeSubscriptions] = useState<StripeSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dataLoading, setDataLoading] = useState(true);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
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

  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Kopiert',
      description: label ? `${label} in die Zwischenablage kopiert` : 'In die Zwischenablage kopiert',
    });
  };

  const webhookBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/n8n-reservations`;

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
      fetchStripeSubscriptions();
    }
  }, [user, roles]);

  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      const [customersRes, apiKeysRes, callLogsRes, reservationsRes, voiceAgentRes] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('customer_api_keys').select('customer_id, api_key'),
        supabase.from('call_logs').select('*').order('started_at', { ascending: false }).limit(100),
        supabase.from('reservations').select('*').order('reservation_date', { ascending: false }).limit(100),
        supabase.from('voice_agent_config').select('*').order('updated_at', { ascending: false }),
      ]);

      // Merge API keys with customers
      if (customersRes.data) {
        const apiKeyMap = new Map(
          (apiKeysRes.data || []).map(k => [k.customer_id, k.api_key])
        );
        const customersWithKeys: CustomerWithApiKey[] = customersRes.data.map(c => ({
          ...c,
          api_key: apiKeyMap.get(c.id)
        }));
        setCustomers(customersWithKeys);
      }
      if (callLogsRes.data) setCallLogs(callLogsRes.data);
      if (reservationsRes.data) setReservations(reservationsRes.data);
      if (voiceAgentRes.data) setVoiceAgentConfigs(voiceAgentRes.data);
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

  const fetchStripeSubscriptions = async () => {
    setSubscriptionsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-subscriptions');
      if (error) throw error;
      if (data?.subscriptions) {
        setStripeSubscriptions(data.subscriptions);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setSubscriptionsLoading(false);
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

  const getCustomerEmail = (userId: string) => {
    const customer = customers.find(c => c.id === userId);
    return customer?.email || userId;
  };

  const getCustomerCompany = (userId: string) => {
    const customer = customers.find(c => c.id === userId);
    return customer?.company_name || '-';
  };

  const formatSubscriptionStatus = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Aktiv', variant: 'default' },
      trialing: { label: 'Testphase', variant: 'secondary' },
      canceled: { label: 'Gekündigt', variant: 'destructive' },
      past_due: { label: 'Überfällig', variant: 'destructive' },
      incomplete: { label: 'Unvollständig', variant: 'outline' },
    };
    return statusMap[status] || { label: status, variant: 'outline' as const };
  };

  // Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const totalCalls = callLogs.length;
  const totalReservations = reservations.length;
  const activeSubscriptions = stripeSubscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length;
  const configuredVoiceAgents = voiceAgentConfigs.filter(v => v.is_active).length;

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Kunden</p>
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
                  <p className="text-sm text-muted-foreground">Aktive Abos</p>
                  <p className="text-2xl font-bold text-green-500">{activeSubscriptions}</p>
                </div>
                <CreditCard className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Voice Agents</p>
                  <p className="text-2xl font-bold text-purple-500">{configuredVoiceAgents}</p>
                </div>
                <Bot className="w-8 h-8 text-purple-500" />
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
          <Card className="glass-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aktiv</p>
                  <p className="text-2xl font-bold text-green-500">{activeCustomers}</p>
                </div>
                <Activity className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="subscriptions" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
            <TabsTrigger value="voiceagents">Voice Agent Configs</TabsTrigger>
            <TabsTrigger value="customers">Kunden</TabsTrigger>
            <TabsTrigger value="calls">Anrufe</TabsTrigger>
            <TabsTrigger value="reservations">Reservierungen</TabsTrigger>
          </TabsList>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Stripe Abonnements
                    </CardTitle>
                    <CardDescription>Alle aktiven Subscriptions und Setup-Status</CardDescription>
                  </div>
                  <Button variant="outline" onClick={fetchStripeSubscriptions} disabled={subscriptionsLoading}>
                    Aktualisieren
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {subscriptionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kunde</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Setup bezahlt</TableHead>
                        <TableHead>Testphase Ende</TableHead>
                        <TableHead>Nächste Abrechnung</TableHead>
                        <TableHead>Mindestlaufzeit bis</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stripeSubscriptions.map((sub) => {
                        const status = formatSubscriptionStatus(sub.status);
                        
                        // Safe date parsing with validation
                        const parseTimestamp = (ts: number | null | undefined) => {
                          if (!ts || ts <= 0) return null;
                          const date = new Date(ts * 1000);
                          return isNaN(date.getTime()) ? null : date;
                        };
                        
                        const parseISODate = (isoString: string | null | undefined) => {
                          if (!isoString) return null;
                          const date = new Date(isoString);
                          return isNaN(date.getTime()) ? null : date;
                        };
                        
                        const trialEnd = parseTimestamp(sub.trial_end);
                        const periodEnd = parseTimestamp(sub.current_period_end);
                        const minContractEnd = parseISODate(sub.metadata?.min_contract_end);
                        
                        return (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{sub.customer_email || sub.customer}</p>
                                <p className="text-xs text-muted-foreground">{sub.id}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {sub.metadata?.tier_name || 'Voice Agent Pro'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {sub.metadata?.setup_paid === 'true' ? (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Bezahlt
                                </Badge>
                              ) : (
                                <Badge variant="outline">Ausstehend</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {trialEnd ? (
                                <span className="text-sm">
                                  {format(trialEnd, 'dd.MM.yyyy', { locale: de })}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {periodEnd ? format(periodEnd, 'dd.MM.yyyy', { locale: de }) : '-'}
                            </TableCell>
                            <TableCell>
                              {minContractEnd ? (
                                <span className="text-sm">
                                  {format(minContractEnd, 'dd.MM.yyyy', { locale: de })}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {stripeSubscriptions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Keine Abonnements gefunden
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Voice Agent Configs Tab */}
          <TabsContent value="voiceagents">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Voice Agent Konfigurationen
                </CardTitle>
                <CardDescription>Alle Kunden Voice Agent Einstellungen</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Unternehmen</TableHead>
                      <TableHead>Branche</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Sprache</TableHead>
                      <TableHead>Stimme</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Zuletzt aktualisiert</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voiceAgentConfigs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{getCustomerEmail(config.user_id)}</p>
                            <p className="text-xs text-muted-foreground">{getCustomerCompany(config.user_id)}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {config.business_name || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{config.industry || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          {config.phone_number ? (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{config.phone_number}</span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {config.website_url ? (
                            <a 
                              href={config.website_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline text-sm"
                            >
                              <Globe className="w-3 h-3" />
                              Öffnen
                            </a>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{config.language?.toUpperCase() || 'DE'}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {config.voice || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.is_active ? 'default' : 'secondary'} className={config.is_active ? 'bg-green-500' : ''}>
                            {config.is_active ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(config.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {voiceAgentConfigs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          Keine Voice Agent Konfigurationen vorhanden
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

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
                      <TableHead>Webhook-URL</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
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
                              onClick={() => copyToClipboard(customer.api_key, 'API-Key')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-2 py-1 rounded max-w-[180px] truncate">
                              {webhookBaseUrl}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => copyToClipboard(webhookBaseUrl, 'Webhook-URL')}
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

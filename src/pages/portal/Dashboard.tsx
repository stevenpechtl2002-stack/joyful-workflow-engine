import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Phone, 
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { useDashboardStats, useReservations, useDailyStats } from '@/hooks/usePortalData';

const Dashboard = () => {
  const { profile } = useAuth();
  const { data: stats, isLoading: statsLoading, refetch } = useDashboardStats();
  const { data: reservations } = useReservations();
  const { data: dailyStats } = useDailyStats(14);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  // Prepare chart data
  const statusData = [
    { name: 'Bestätigt', value: reservations?.filter(r => r.status === 'confirmed').length || 0, color: '#22c55e' },
    { name: 'Ausstehend', value: reservations?.filter(r => r.status === 'pending').length || 0, color: '#eab308' },
    { name: 'Storniert', value: reservations?.filter(r => r.status === 'cancelled').length || 0, color: '#ef4444' },
    { name: 'Abgeschlossen', value: reservations?.filter(r => r.status === 'completed').length || 0, color: '#3b82f6' },
  ].filter(d => d.value > 0);


  // Prepare upcoming reservations data for chart (when no daily_stats)
  const upcomingReservationsData = reservations
    ?.filter(r => new Date(r.reservation_date) >= new Date())
    .slice(0, 14)
    .reduce((acc, r) => {
      const dateKey = new Date(r.reservation_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      const existing = acc.find(item => item.date === dateKey);
      if (existing) {
        existing.reservations += 1;
      } else {
        acc.push({ date: dateKey, reservations: 1, calls: 0 });
      }
      return acc;
    }, [] as { date: string; reservations: number; calls: number }[]) || [];

  const trendData = dailyStats && dailyStats.length > 0 
    ? dailyStats.map(stat => ({
        date: new Date(stat.stat_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
        calls: stat.total_calls,
        reservations: stat.reservations_made
      }))
    : upcomingReservationsData;

  // Count upcoming reservations (pending/confirmed with future date)
  const upcomingReservationsCount = reservations?.filter(r => 
    (r.status === 'pending' || r.status === 'confirmed') && 
    new Date(r.reservation_date) >= new Date()
  ).length || 0;

  const kpiCards = [
    { 
      label: 'Reservierungen gesamt', 
      value: stats?.totalReservations ?? 0, 
      icon: Calendar, 
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: '+12%',
      trendUp: true
    },
    { 
      label: 'Anstehende Reservierungen', 
      value: upcomingReservationsCount, 
      icon: Clock, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    { 
      label: 'Beantwortete Anrufe', 
      value: stats?.answeredCalls ?? 0, 
      icon: Phone, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      trend: '+8%',
      trendUp: true
    },
    { 
      label: 'Conversion Rate', 
      value: `${stats?.conversionRate ?? 0}%`, 
      icon: TrendingUp, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    { 
      label: 'Neue Kunden', 
      value: stats?.newCustomers ?? 0, 
      icon: Users, 
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      trend: '+15%',
      trendUp: true
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Benutzer'}!
          </h1>
          <p className="text-muted-foreground">
            Hier ist Ihre Übersicht für heute.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Aktualisieren
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass border-border/50 hover:border-primary/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  {kpi.trend && (
                    <div className={`flex items-center text-xs ${kpi.trendUp ? 'text-green-500' : 'text-red-500'}`}>
                      {kpi.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {kpi.trend}
                    </div>
                  )}
                </div>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Anrufe & Reservierungen</CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="calls" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorCalls)" 
                        name="Anrufe"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="reservations" 
                        stroke="#22c55e" 
                        fillOpacity={1} 
                        fill="url(#colorRes)" 
                        name="Reservierungen"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  Noch keine Daten vorhanden
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Status Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass border-border/50 h-full">
            <CardHeader>
              <CardTitle className="text-lg">Reservierungsstatus</CardTitle>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {statusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                  Keine Reservierungen
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Schnellaktionen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/portal/calendar">
                <Button variant="outline" className="w-full h-20 flex-col gap-2 hover:border-primary/50">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm">Kalender</span>
                </Button>
              </Link>
              <Link to="/portal/reservations">
                <Button variant="outline" className="w-full h-20 flex-col gap-2 hover:border-primary/50">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm">Reservierungen</span>
                </Button>
              </Link>
              <Link to="/portal/analytics">
                <Button variant="outline" className="w-full h-20 flex-col gap-2 hover:border-primary/50">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm">Analytics</span>
                </Button>
              </Link>
              <Link to="/portal/voice-agent">
                <Button variant="outline" className="w-full h-20 flex-col gap-2 hover:border-primary/50">
                  <Phone className="w-5 h-5" />
                  <span className="text-sm">Voice Agent</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;

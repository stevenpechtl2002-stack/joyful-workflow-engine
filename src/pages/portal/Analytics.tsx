import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  PhoneOff,
  PhoneMissed,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Timer,
  Users
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useCallLogs, useDailyStats, useDashboardStats } from '@/hooks/usePortalData';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const Analytics = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: callLogs, isLoading: logsLoading } = useCallLogs();
  const { data: dailyStats, isLoading: chartLoading } = useDailyStats(30);

  const kpiCards = [
    { 
      label: 'Beantwortete Anrufe', 
      value: stats?.answeredCalls || 0, 
      icon: Phone, 
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    { 
      label: 'Erfolgreiche Reservierungen', 
      value: callLogs?.filter(c => c.call_outcome === 'reservation_made').length || 0, 
      icon: CheckCircle2, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    { 
      label: 'Abgebrochene Anrufe', 
      value: callLogs?.filter(c => c.call_status === 'abandoned').length || 0, 
      icon: PhoneOff, 
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    { 
      label: 'Conversion Rate', 
      value: `${stats?.conversionRate || 0}%`, 
      icon: TrendingUp, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    { 
      label: 'Ø Anrufdauer', 
      value: `${Math.round((callLogs?.reduce((acc, c) => acc + (c.call_duration || 0), 0) || 0) / Math.max(callLogs?.length || 1, 1))}s`, 
      icon: Timer, 
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  const outcomeData = [
    { name: 'Reservierung', value: callLogs?.filter(c => c.call_outcome === 'reservation_made').length || 0, color: '#22c55e' },
    { name: 'Anfrage', value: callLogs?.filter(c => c.call_outcome === 'inquiry').length || 0, color: '#3b82f6' },
    { name: 'Stornierung', value: callLogs?.filter(c => c.call_outcome === 'cancelled').length || 0, color: '#ef4444' },
    { name: 'Keine Aktion', value: callLogs?.filter(c => c.call_outcome === 'no_action').length || 0, color: '#6b7280' },
  ].filter(d => d.value > 0);

  const trendData = dailyStats?.map(stat => ({
    date: format(new Date(stat.stat_date), 'dd.MM', { locale: de }),
    calls: stat.total_calls,
    reservations: stat.reservations_made,
    conversion: stat.conversion_rate
  })) || [];

  const getCallStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-500/10 text-green-500',
      missed: 'bg-red-500/10 text-red-500',
      abandoned: 'bg-orange-500/10 text-orange-500',
      voicemail: 'bg-blue-500/10 text-blue-500',
    };
    const labels: Record<string, string> = {
      completed: 'Beantwortet',
      missed: 'Verpasst',
      abandoned: 'Abgebrochen',
      voicemail: 'Mailbox',
    };
    return (
      <Badge variant="outline" className={`${styles[status]} border-0`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) return null;
    const labels: Record<string, string> = {
      reservation_made: 'Reservierung',
      inquiry: 'Anfrage',
      cancelled: 'Stornierung',
      no_action: 'Keine Aktion',
      transferred: 'Weitergeleitet',
    };
    return (
      <span className="text-xs text-muted-foreground">{labels[outcome] || outcome}</span>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-foreground mb-1">Tracking & Analytics</h1>
        <p className="text-muted-foreground">
          Überwachen Sie alle Anrufe und deren Ergebnisse in Echtzeit.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
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

      {/* Charts */}
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
              <CardTitle className="text-lg">Anrufe & Reservierungen (30 Tage)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : trendData.length > 0 ? (
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
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCalls)" name="Anrufe" />
                      <Area type="monotone" dataKey="reservations" stroke="#22c55e" fillOpacity={1} fill="url(#colorRes)" name="Reservierungen" />
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

        {/* Outcome Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass border-border/50 h-full">
            <CardHeader>
              <CardTitle className="text-lg">Anruf-Ergebnisse</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : outcomeData.length > 0 ? (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outcomeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {outcomeData.map((entry, index) => (
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
                    {outcomeData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                  Keine Anrufe
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Call Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Anruf-Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : callLogs && callLogs.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {callLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg bg-secondary/30">
                    <div className={`p-2 rounded-lg ${log.call_status === 'completed' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <Phone className={`w-4 h-4 ${log.call_status === 'completed' ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{log.caller_phone || 'Unbekannt'}</span>
                        {getCallStatusBadge(log.call_status)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.started_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          {log.call_duration}s
                        </span>
                        {getOutcomeBadge(log.call_outcome)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Noch keine Anrufe aufgezeichnet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Analytics;

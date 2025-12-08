import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  FileText, 
  Bell, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Mock data for demonstration
const mockStats = {
  upcomingAppointments: 3,
  documentsCount: 12,
  unreadNotifications: 5,
  completedTasks: 8,
};

const mockRecentAppointments = [
  { id: 1, title: 'Beratungsgespräch', date: '2024-12-10', time: '14:00', status: 'confirmed' },
  { id: 2, title: 'Projektbesprechung', date: '2024-12-12', time: '10:30', status: 'pending' },
  { id: 3, title: 'Quarterly Review', date: '2024-12-15', time: '09:00', status: 'confirmed' },
];

const mockRecentActivity = [
  { id: 1, message: 'Dokument "Vertrag_2024.pdf" hochgeladen', time: 'vor 2 Stunden' },
  { id: 2, message: 'Termin "Beratungsgespräch" bestätigt', time: 'vor 5 Stunden' },
  { id: 3, message: 'Neue Nachricht erhalten', time: 'gestern' },
];

const Dashboard = () => {
  const { profile } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  const statCards = [
    { 
      label: 'Anstehende Termine', 
      value: mockStats.upcomingAppointments, 
      icon: Calendar, 
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: '/portal/appointments'
    },
    { 
      label: 'Dokumente', 
      value: mockStats.documentsCount, 
      icon: FileText, 
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      link: '/portal/documents'
    },
    { 
      label: 'Ungelesene Nachrichten', 
      value: mockStats.unreadNotifications, 
      icon: Bell, 
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      link: '/portal/notifications'
    },
    { 
      label: 'Erledigte Aufgaben', 
      value: mockStats.completedTasks, 
      icon: CheckCircle2, 
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      link: '/portal'
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'Benutzer'}!
        </h1>
        <p className="text-muted-foreground">
          Hier ist Ihre Übersicht für heute.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={stat.link}>
              <Card className="glass border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="glass border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-display">Anstehende Termine</CardTitle>
                <CardDescription>Ihre nächsten geplanten Termine</CardDescription>
              </div>
              <Link to="/portal/appointments">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Neuer Termin
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{appointment.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(appointment.date).toLocaleDateString('de-DE')} um {appointment.time}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      appointment.status === 'confirmed' 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {appointment.status === 'confirmed' ? 'Bestätigt' : 'Ausstehend'}
                    </span>
                  </div>
                ))}
              </div>
              <Link to="/portal/appointments" className="block mt-4">
                <Button variant="ghost" className="w-full group">
                  Alle Termine anzeigen
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass border-border/50 h-full">
            <CardHeader>
              <CardTitle className="text-xl font-display">Letzte Aktivitäten</CardTitle>
              <CardDescription>Ihre neuesten Aktionen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 pb-4 border-b border-border/50 last:border-0 last:pb-0"
                  >
                    <div className="p-1.5 rounded-full bg-primary/10 mt-0.5">
                      <Clock className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{activity.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6"
      >
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-display">Schnellaktionen</CardTitle>
            <CardDescription>Häufig verwendete Funktionen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/portal/appointments">
                <Button variant="outline" className="w-full h-24 flex-col gap-2 hover:border-primary/50">
                  <Calendar className="w-6 h-6" />
                  <span>Termin buchen</span>
                </Button>
              </Link>
              <Link to="/portal/documents">
                <Button variant="outline" className="w-full h-24 flex-col gap-2 hover:border-primary/50">
                  <FileText className="w-6 h-6" />
                  <span>Dokument hochladen</span>
                </Button>
              </Link>
              <Link to="/portal/notifications">
                <Button variant="outline" className="w-full h-24 flex-col gap-2 hover:border-primary/50">
                  <Bell className="w-6 h-6" />
                  <span>Nachrichten</span>
                </Button>
              </Link>
              <Link to="/portal/profile">
                <Button variant="outline" className="w-full h-24 flex-col gap-2 hover:border-primary/50">
                  <TrendingUp className="w-6 h-6" />
                  <span>Status ansehen</span>
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

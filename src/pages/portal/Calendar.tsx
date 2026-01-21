import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Calendar as CalendarIcon,
  Clock,
  Users,
  Phone,
  MessageSquare,
  Bot,
  User,
  UsersRound,
  CheckCircle2
} from 'lucide-react';
import { useReservations } from '@/hooks/usePortalData';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks } from 'date-fns';
import { de } from 'date-fns/locale';
import ReservationForm from '@/components/portal/ReservationForm';
import { StaffCalendarView } from '@/components/portal/StaffCalendarView';
import { AvailabilityView } from '@/components/portal/AvailabilityView';

type ViewMode = 'month' | 'week' | 'day';
type CalendarType = 'standard' | 'staff' | 'availability';

const Calendar = () => {
  const [calendarType, setCalendarType] = useState<CalendarType>('standard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const { data: reservations, isLoading, refetch } = useReservations();

  const filteredReservations = useMemo(() => {
    if (!reservations) return [];
    
    return reservations.filter(res => {
      const matchesStatus = statusFilter === 'all' || res.status === statusFilter;
      const matchesSearch = searchQuery === '' || 
        res.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.customer_phone?.includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [reservations, statusFilter, searchQuery]);

  const getReservationsForDate = (date: Date) => {
    return filteredReservations.filter(res => 
      isSameDay(new Date(res.reservation_date), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      case 'no_show': return 'bg-gray-500';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Bestätigt';
      case 'pending': return 'Offen';
      case 'cancelled': return 'Storniert';
      case 'completed': return 'Abgeschlossen';
      case 'no_show': return 'No-Show';
      default: return status;
    }
  };

  // Navigation
  const navigatePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const navigateNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { locale: de });
      const end = endOfWeek(endOfMonth(currentDate), { locale: de });
      return eachDayOfInterval({ start, end });
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { locale: de });
      const end = endOfWeek(currentDate, { locale: de });
      return eachDayOfInterval({ start, end });
    }
    return [currentDate];
  }, [currentDate, viewMode]);

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 - 21:00

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Kalender</h1>
          <p className="text-muted-foreground">
            Verwalten Sie alle Reservierungen übersichtlich.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Calendar Type Switcher */}
          <Tabs value={calendarType} onValueChange={(v) => setCalendarType(v as CalendarType)}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="standard" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Standard</span>
              </TabsTrigger>
              <TabsTrigger value="staff" className="gap-2">
                <UsersRound className="w-4 h-4" />
                <span className="hidden sm:inline">Mitarbeiter</span>
              </TabsTrigger>
              <TabsTrigger value="availability" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="hidden sm:inline">Verfügbar</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
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

      {/* Staff Calendar View */}
      {calendarType === 'staff' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StaffCalendarView />
        </motion.div>
      ) : calendarType === 'availability' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AvailabilityView />
        </motion.div>
      ) : (
        <>
          {/* Standard Calendar - Filters & Controls */}
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
            <SelectItem value="confirmed">Bestätigt</SelectItem>
            <SelectItem value="pending">Offen</SelectItem>
            <SelectItem value="cancelled">Storniert</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            Monat
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            Woche
          </Button>
          <Button
            variant={viewMode === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('day')}
          >
            Tag
          </Button>
        </div>
      </motion.div>

      {/* Calendar Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={navigatePrev}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <CardTitle className="text-xl">
                {viewMode === 'day' 
                  ? format(currentDate, 'EEEE, d. MMMM yyyy', { locale: de })
                  : format(currentDate, 'MMMM yyyy', { locale: de })
                }
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={navigateNext}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : viewMode === 'month' ? (
              // Month View
              <div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const dayReservations = getReservationsForDate(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    
                    return (
                      <div
                        key={idx}
                        onClick={() => { setSelectedDate(day); setViewMode('day'); setCurrentDate(day); }}
                        className={`
                          min-h-[100px] p-2 rounded-lg border cursor-pointer transition-all
                          ${isToday ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'}
                          ${!isCurrentMonth ? 'opacity-40' : ''}
                        `}
                      >
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayReservations.slice(0, 3).map(res => (
                            <div
                              key={res.id}
                              className={`text-xs px-1.5 py-0.5 rounded truncate ${getStatusColor(res.status)} text-white`}
                            >
                              {res.reservation_time.slice(0, 5)} {res.customer_name}
                            </div>
                          ))}
                          {dayReservations.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayReservations.length - 3} weitere
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : viewMode === 'week' ? (
              // Week View
              <div className="overflow-x-auto">
                <div className="grid grid-cols-8 gap-1 min-w-[800px]">
                  <div className="text-sm font-medium text-muted-foreground py-2" />
                  {calendarDays.map(day => (
                    <div key={day.toISOString()} className="text-center">
                      <div className="text-sm text-muted-foreground">{format(day, 'EEE', { locale: de })}</div>
                      <div className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))}
                  
                  {hours.map(hour => (
                    <>
                      <div key={`hour-${hour}`} className="text-xs text-muted-foreground py-2 text-right pr-2">
                        {hour}:00
                      </div>
                      {calendarDays.map(day => {
                        const hourReservations = getReservationsForDate(day).filter(res => {
                          const resHour = parseInt(res.reservation_time.split(':')[0]);
                          return resHour === hour;
                        });
                        
                        return (
                          <div key={`${day.toISOString()}-${hour}`} className="border border-border/30 min-h-[40px] p-0.5">
                            {hourReservations.map(res => (
                              <div
                                key={res.id}
                                className={`text-xs px-1 py-0.5 rounded truncate ${getStatusColor(res.status)} text-white`}
                              >
                                {res.customer_name}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            ) : (
              // Day View
              <div className="space-y-2">
                {hours.map(hour => {
                  const hourReservations = getReservationsForDate(currentDate).filter(res => {
                    const resHour = parseInt(res.reservation_time.split(':')[0]);
                    return resHour === hour;
                  });
                  
                  return (
                    <div key={hour} className="flex gap-4">
                      <div className="w-16 text-sm text-muted-foreground py-2">
                        {hour}:00
                      </div>
                      <div className="flex-1 border-l border-border/30 pl-4 min-h-[60px] py-2">
                        {hourReservations.map(res => (
                          <Card key={res.id} className="mb-2 p-3 bg-secondary/30">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{res.customer_name}</span>
                                  <Badge variant="outline" className={`${getStatusColor(res.status)} text-white border-0 text-xs`}>
                                    {getStatusLabel(res.status)}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {res.reservation_time.slice(0, 5)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {res.party_size} Personen
                                  </span>
                                  {res.customer_phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {res.customer_phone}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    {res.source === 'voice_agent' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                    {res.source === 'voice_agent' ? 'Voice Agent' : 'Manuell'}
                                  </span>
                                </div>
                                {res.notes && (
                                  <div className="flex items-start gap-1 mt-2 text-sm text-muted-foreground">
                                    <MessageSquare className="w-3 h-3 mt-0.5" />
                                    {res.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
        </>
      )}
    </div>
  );
};

export default Calendar;

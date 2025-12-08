import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  BellOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link: string | null;
  created_at: string;
}

const Notifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications(data as Notification[] || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      toast({
        title: 'Fehler',
        description: 'Benachrichtigungen konnten nicht aktualisiert werden.',
        variant: 'destructive',
      });
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast({
        title: 'Erfolgreich',
        description: 'Alle Benachrichtigungen wurden als gelesen markiert.',
      });
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Fehler',
        description: 'Benachrichtigung konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    } else {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const deleteAllRead = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('read', true);

    if (error) {
      toast({
        title: 'Fehler',
        description: 'Benachrichtigungen konnten nicht gelöscht werden.',
        variant: 'destructive',
      });
    } else {
      setNotifications(prev => prev.filter(n => !n.read));
      toast({
        title: 'Erfolgreich',
        description: 'Alle gelesenen Benachrichtigungen wurden gelöscht.',
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
      case 'error':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' };
      default:
        return { icon: Info, color: 'text-primary', bg: 'bg-primary/10' };
    }
  };

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || !n.read
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Benachrichtigungen
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 
              ? `Sie haben ${unreadCount} ungelesene Benachrichtigung${unreadCount > 1 ? 'en' : ''}`
              : 'Alle Benachrichtigungen wurden gelesen'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="w-4 h-4 mr-2" />
              Alle lesen
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={deleteAllRead}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Gelesene löschen
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 mb-6"
      >
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Alle ({notifications.length})
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unread')}
        >
          Ungelesen ({unreadCount})
        </Button>
      </motion.div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <BellOff className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Keine Benachrichtigungen
          </h3>
          <p className="text-muted-foreground">
            {filter === 'unread' 
              ? 'Sie haben alle Benachrichtigungen gelesen.'
              : 'Sie haben noch keine Benachrichtigungen erhalten.'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification, index) => {
            const { icon: TypeIcon, color, bg } = getTypeIcon(notification.type);
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={cn(
                    "glass border-border/50 transition-all duration-300 cursor-pointer group",
                    !notification.read && "border-l-4 border-l-primary bg-primary/5"
                  )}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2.5 rounded-xl shrink-0", bg)}>
                        <TypeIcon className={cn("w-5 h-5", color)} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={cn(
                            "font-medium text-foreground",
                            !notification.read && "font-semibold"
                          )}>
                            {notification.title}
                          </h4>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {format(new Date(notification.created_at), "dd.MM.yy HH:mm", { locale: de })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;

import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  Sparkles,
  CreditCard,
  Workflow,
  Package,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const PortalSidebar = () => {
  const location = useLocation();
  const { profile, isAdmin, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/portal' },
    { icon: Calendar, label: 'Kalender', path: '/portal/calendar' },
    { icon: Package, label: 'Produkte', path: '/portal/products' },
    { icon: UserPlus, label: 'Kunden', path: '/portal/customers' },
    { icon: Users, label: 'Mitarbeiter', path: '/portal/staff' },
    { icon: Workflow, label: 'Dienstplan', path: '/portal/shifts' },
    { icon: FileText, label: 'Reservierungen', path: '/portal/reservations' },
    { icon: CreditCard, label: 'Abonnement', path: '/portal/subscriptions' },
    { icon: Bell, label: 'Benachrichtigungen', path: '/portal/notifications' },
    { icon: User, label: 'Profil', path: '/portal/profile' },
  ];

  const adminItems = [
    { icon: Users, label: 'Admin Kunden', path: '/portal/admin/users' },
    { icon: Settings, label: 'Einstellungen', path: '/portal/admin/settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/portal') {
      return location.pathname === '/portal';
    }
    return location.pathname.startsWith(path);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.2 }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0"
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-sidebar-foreground">
              Portal
            </span>
          </motion.div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              isActive(item.path)
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-medium"
              >
                {item.label}
              </motion.span>
            )}
          </Link>
        ))}

        {isAdmin && (
          <>
            {!isCollapsed && (
              <div className="pt-4 pb-2">
                <span className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin
                </span>
              </div>
            )}
            {adminItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive(item.path)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50",
          isCollapsed && "justify-center"
        )}>
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'Benutzer'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </motion.div>
          )}
        </div>
        
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "w-full mt-2 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive",
            isCollapsed && "px-0"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Abmelden</span>}
        </Button>
      </div>
    </motion.aside>
  );
};

export default PortalSidebar;

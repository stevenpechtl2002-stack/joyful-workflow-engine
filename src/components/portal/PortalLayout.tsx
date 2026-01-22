import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PortalSidebar from './PortalSidebar';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';
import { PinProtectionProvider, PinProtectedContent } from './PinProtection';

// Routes that are freely accessible without PIN
const FREE_ROUTES = [
  '/portal/calendar',
  '/portal/reservations',
  '/portal/products',
  '/portal/customers',
  '/portal/staff',
  '/portal/shifts',
  '/portal/subscriptions',
  '/portal/notifications',
];

const PortalLayout = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/portal/auth');
    }
  }, [user, isLoading, navigate]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('light', !isDark);
  };

  // Check if current route is free (no PIN required)
  const isRouteProtected = () => {
    const currentPath = location.pathname;
    return !FREE_ROUTES.some(route => currentPath.startsWith(route));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PinProtectionProvider>
      <div className="flex min-h-screen bg-background w-full">
        <PortalSidebar />
        <main className="flex-1 overflow-auto">
          {isRouteProtected() ? (
            <PinProtectedContent>
              <Outlet />
            </PinProtectedContent>
          ) : (
            <Outlet />
          )}
        </main>
        
        {/* Theme Toggle Button */}
        <Button
          onClick={toggleTheme}
          size="icon"
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-50 bg-card hover:bg-card/80 border border-border"
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-foreground" />
          ) : (
            <Moon className="h-5 w-5 text-foreground" />
          )}
        </Button>
      </div>
    </PinProtectionProvider>
  );
};

export default PortalLayout;

import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PortalSidebar from './PortalSidebar';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

const PortalLayout = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
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
    <div className="flex min-h-screen bg-background w-full">
      <PortalSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
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
  );
};

export default PortalLayout;

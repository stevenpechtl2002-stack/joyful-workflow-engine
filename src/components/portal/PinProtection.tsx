import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PinContextType {
  isPinVerified: boolean;
  hasPinSet: boolean;
  verifyPin: () => void;
  resetPinSession: () => void;
  isLoading: boolean;
}

const PinContext = createContext<PinContextType>({
  isPinVerified: false,
  hasPinSet: false,
  verifyPin: () => {},
  resetPinSession: () => {},
  isLoading: true,
});

export const usePinProtection = () => useContext(PinContext);

export const PinProtectionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const checkPin = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        // Type assertion for new column
        const customerData = data as typeof data & { dashboard_pin?: string | null };
        setHasPinSet(!!customerData.dashboard_pin);
      }
      setIsLoading(false);
    };

    checkPin();
  }, [user?.id]);

  const verifyPin = () => {
    if (!hasPinSet) {
      // No PIN set, allow access
      setIsPinVerified(true);
      return;
    }
    setShowPinDialog(true);
  };

  const handlePinSubmit = async () => {
    if (!user?.id || !pin) return;
    
    setIsVerifying(true);
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', user.id)
      .single();

    setIsVerifying(false);

    if (error) {
      toast.error('Fehler beim Prüfen des PINs');
      return;
    }

    // Type assertion for new column
    const customerData = data as typeof data & { dashboard_pin?: string | null };
    if (customerData?.dashboard_pin === pin) {
      setIsPinVerified(true);
      setShowPinDialog(false);
      setPin('');
      toast.success('PIN bestätigt');
    } else {
      toast.error('Falscher PIN');
    }
  };

  const resetPinSession = () => {
    setIsPinVerified(false);
  };

  return (
    <PinContext.Provider value={{ isPinVerified, hasPinSet, verifyPin, resetPinSession, isLoading }}>
      {children}
      
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              PIN eingeben
            </DialogTitle>
            <DialogDescription>
              Bitte geben Sie Ihren Dashboard-PIN ein, um fortzufahren.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="pr-10 text-center text-2xl tracking-widest"
                  maxLength={6}
                  onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <Button 
              onClick={handlePinSubmit} 
              className="w-full"
              disabled={!pin || isVerifying}
            >
              {isVerifying ? 'Prüfe...' : 'Entsperren'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PinContext.Provider>
  );
};

// Component to wrap protected content
interface ProtectedContentProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const PinProtectedContent = ({ children, fallback }: ProtectedContentProps) => {
  const { isPinVerified, hasPinSet, verifyPin, isLoading } = usePinProtection();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }
  
  // No PIN set = no protection needed
  if (!hasPinSet) {
    return <>{children}</>;
  }
  
  // PIN set but not verified
  if (!isPinVerified) {
    return (
      fallback || (
        <div className="flex flex-col items-center justify-center h-64 text-center p-6">
          <Lock className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Geschützter Bereich</h3>
          <p className="text-muted-foreground mb-4">
            Dieser Bereich ist PIN-geschützt. Bitte entsperren Sie das Dashboard.
          </p>
          <Button onClick={verifyPin}>
            <Lock className="w-4 h-4 mr-2" />
            Mit PIN entsperren
          </Button>
        </div>
      )
    );
  }
  
  return <>{children}</>;
};

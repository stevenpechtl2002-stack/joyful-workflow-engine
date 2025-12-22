import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, 
  Calendar, 
  FileText, 
  CheckCircle,
  Clock,
  Package,
  Euro,
  ExternalLink,
  Loader2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Settings
} from 'lucide-react';

const SUBSCRIPTION_PRICE = 499.99;
const SETUP_FEE = 2500;
const MIN_CONTRACT_MONTHS = 12;
const PRODUCT_ID = "prod_TeG5dVBHN5lNA5";

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
}

const features = [
  'KI-Telefonassistent',
  'Individuelle Automatisierungen',
  'Workflow Integration',
  'Premium Dashboard',
  'Dokumentenverwaltung',
  'Priority Support',
  '24/7 Verfügbarkeit'
];

const Subscriptions = () => {
  const { profile, session } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  // Check for success/cancel query params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: 'Zahlung erfolgreich!',
        description: 'Ihr Abonnement wurde aktiviert.',
      });
      checkSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast({
        title: 'Zahlung abgebrochen',
        description: 'Die Zahlung wurde nicht abgeschlossen.',
        variant: 'destructive',
      });
    }
  }, [searchParams]);

  const checkSubscription = async () => {
    if (!session) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      setSubscriptionStatus(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionStatus({ subscribed: false, product_id: null, subscription_end: null });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
    
    // Auto-refresh every minute
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [session]);

  const handleCheckout = async () => {
    setIsCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Fehler',
        description: 'Checkout konnte nicht gestartet werden.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      toast({
        title: 'Fehler',
        description: 'Kundenportal konnte nicht geöffnet werden.',
        variant: 'destructive',
      });
    } finally {
      setIsPortalLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const isSubscribed = subscriptionStatus?.subscribed && subscriptionStatus?.product_id === PRODUCT_ID;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Abonnement & Abrechnung
          </h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihr Premium-Abonnement
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={checkSubscription} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </motion.div>

      {isSubscribed ? (
        /* Active Subscription View */
        <div className="grid gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass border-primary/30 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-display flex items-center gap-3">
                      <Package className="w-6 h-6 text-primary" />
                      NextGenAI Premium
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Ihr aktives Abonnement
                    </CardDescription>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Aktiv
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-6">
                {/* Price Display */}
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-display font-bold text-foreground">
                    {formatCurrency(SUBSCRIPTION_PRICE)}
                  </span>
                  <span className="text-muted-foreground">/ Monat</span>
                </div>

                {/* Next Billing Date */}
                {subscriptionStatus?.subscription_end && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Nächste Abrechnung:</span>
                    <span className="text-foreground font-medium">
                      {formatDate(subscriptionStatus.subscription_end)}
                    </span>
                  </div>
                )}

                <Separator />

                {/* Features */}
                <div>
                  <h4 className="font-medium text-foreground mb-3">Enthaltene Leistungen</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Manage Button */}
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  onClick={handleManageSubscription}
                  disabled={isPortalLoading}
                >
                  {isPortalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Settings className="w-4 h-4" />
                  )}
                  Abonnement verwalten
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : (
        /* No Subscription - Show Pricing */
        <div className="grid gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass border-primary/30 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
              <div className="absolute top-4 right-4">
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              </div>
              <CardHeader className="relative text-center pt-12">
                <CardTitle className="text-3xl font-display">
                  NextGenAI Premium
                </CardTitle>
                <CardDescription className="text-lg mt-2">
                  Vollzugriff auf alle Features
                </CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-8 text-center">
                {/* Price Display */}
                <div className="space-y-3">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-display font-bold text-foreground">
                      {formatCurrency(SUBSCRIPTION_PRICE)}
                    </span>
                    <span className="text-muted-foreground text-lg">/ Monat</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <span className="text-sm">+</span>
                    <span className="text-lg font-semibold text-foreground">{formatCurrency(SETUP_FEE)}</span>
                    <span className="text-sm">einmalige Setup-Gebühr</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Mindestlaufzeit: {MIN_CONTRACT_MONTHS} Monate
                  </div>
                  <Badge variant="outline" className="mx-auto">
                    Status: Nicht aktiv
                  </Badge>
                </div>

                {/* Features */}
                <div className="max-w-md mx-auto text-left">
                  <div className="grid gap-3">
                    {features.map((feature, index) => (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        className="flex items-center gap-3 text-muted-foreground"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-3 h-3 text-primary" />
                        </div>
                        <span>{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* CTA Button */}
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="w-full max-w-sm mx-auto"
                  onClick={handleCheckout}
                  disabled={isCheckoutLoading}
                >
                  {isCheckoutLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="w-5 h-5 mr-2" />
                  )}
                  Jetzt abonnieren
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <p className="text-xs text-muted-foreground">
                  Sichere Zahlung über Stripe. Mindestlaufzeit 12 Monate.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Contact Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6"
      >
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Fragen zu Ihrem Abonnement?</p>
                <p className="text-sm text-muted-foreground">
                  Unser Team hilft Ihnen gerne weiter.
                </p>
              </div>
              <Button variant="outline" className="gap-2" asChild>
                <a href="/kontakt">
                  <ExternalLink className="w-4 h-4" />
                  Kontakt aufnehmen
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Subscriptions;

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, 
  CheckCircle,
  Clock,
  Package,
  Loader2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Settings,
  Zap,
  Phone,
  BarChart3,
  Calendar,
  Headphones,
  Globe
} from 'lucide-react';

// Combined checkout tiers - Setup fee + delayed subscription
const TIERS = {
  voiceAgent: {
    name: 'Voice Agent Pro',
    setupPrice: 2500,
    monthlyPrice: 499,
    minContractMonths: 12,
    setup_price_id: 'price_1Sn3XAC1vJESw3twhFlgfGCa',
    subscription_price_id: 'price_1Sn3YtC1vJESw3tw0pxhy28C',
    product_id: 'prod_TkYgCu8ecKGKAT',
    description: 'KI-Sprachassistent mit 24/7 Verfügbarkeit',
    features: [
      'AI Voice Agent',
      'Unbegrenzte Anrufe',
      'Erweiterte Analytics',
      'Priority Support',
      'Alle Stimmen',
      'Kalender-Integration',
      'Custom Workflows',
      'Custom Automatisierung',
      'API Zugang'
    ],
    highlighted: true
  },
  voiceAgentSeo: {
    name: 'Voice Agent + SEO Website',
    setupPrice: 3000,
    monthlyPrice: 499,
    minContractMonths: 12,
    setup_price_id: 'price_1Sn3XtC1vJESw3twBqrEFWMU',
    subscription_price_id: 'price_1Sn3YtC1vJESw3tw0pxhy28C',
    product_id: 'prod_TkYgCu8ecKGKAT',
    description: 'KI-Sprachassistent + SEO-optimierte Website',
    features: [
      'AI Voice Agent',
      'Unbegrenzte Anrufe',
      'Erweiterte Analytics',
      'Priority Support',
      'Alle Stimmen',
      'Kalender-Integration',
      'Custom Workflows',
      'Custom Automatisierung',
      'API Zugang',
      'SEO-optimierte Website'
    ],
    highlighted: false,
    hasWebsite: true
  }
};

interface SubscriptionStatus {
  subscribed: boolean;
  product_id: string | null;
  subscription_end: string | null;
}

const Subscriptions = () => {
  const { session, subscription, isSubscriptionLoading, checkSubscription } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Zahlung erfolgreich! Ihr Abonnement wird in 30 Tagen aktiviert.');
      checkSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast.error('Zahlung abgebrochen');
    }
  }, [searchParams, checkSubscription]);

  // Convert AuthContext subscription to local format
  const subscriptionStatus: SubscriptionStatus = {
    subscribed: subscription.subscribed,
    product_id: subscription.productId,
    subscription_end: subscription.subscriptionEnd
  };
  
  const isLoading = isSubscriptionLoading;

  const handleCheckout = async (tierKey: string) => {
    const tier = TIERS[tierKey as keyof typeof TIERS];
    if (!tier) return;
    
    setCheckoutLoading(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          setup_price_id: tier.setup_price_id,
          subscription_price_id: tier.subscription_price_id,
          tier_name: tier.name
        }
      });
      
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error('Checkout konnte nicht gestartet werden.');
    } finally {
      setCheckoutLoading(null);
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
      toast.error('Kundenportal konnte nicht geöffnet werden.');
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

  const getCurrentTier = () => {
    if (!subscriptionStatus?.product_id) return null;
    return Object.entries(TIERS).find(([_, tier]) => tier.product_id === subscriptionStatus.product_id);
  };

  const currentTier = getCurrentTier();
  const isSubscribed = subscriptionStatus?.subscribed;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            Abonnement & Abrechnung
          </h1>
          <p className="text-muted-foreground">
            Wählen Sie den passenden Plan für Ihr Unternehmen
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={checkSubscription} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </motion.div>

      {/* Current Plan Banner (if subscribed) */}
      {isSubscribed && currentTier && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass border-primary/30 bg-gradient-to-r from-primary/10 to-accent/10">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/20">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{currentTier[1].name}</h3>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Aktiv
                      </Badge>
                    </div>
                    {subscriptionStatus?.subscription_end && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Nächste Abrechnung: {formatDate(subscriptionStatus.subscription_end)}
                      </p>
                    )}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleManageSubscription}
                  disabled={isPortalLoading}
                >
                  {isPortalLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="w-4 h-4 mr-2" />
                  )}
                  Verwalten
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pricing Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(TIERS).map(([key, tier], index) => {
            const isCurrentPlan = currentTier?.[0] === key && isSubscribed;
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className={`
                  glass border-border/50 h-full flex flex-col relative overflow-hidden
                  ${tier.highlighted ? 'border-primary/50 shadow-lg shadow-primary/10' : ''}
                  ${isCurrentPlan ? 'ring-2 ring-primary' : ''}
                `}>
                  {tier.highlighted && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-accent py-1 text-center">
                      <span className="text-xs font-medium text-primary-foreground flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Beliebteste Wahl
                      </span>
                    </div>
                  )}
                  
                  <CardHeader className={tier.highlighted ? 'pt-10' : ''}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{tier.name}</CardTitle>
                        {'hasWebsite' in tier && tier.hasWebsite && (
                          <Globe className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      {isCurrentPlan && (
                        <Badge variant="outline" className="border-primary text-primary">
                          Ihr Plan
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col">
                    {/* Pricing - Setup + Monthly */}
                    <div className="mb-6 space-y-4">
                      {/* Setup Fee */}
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Einmalige Setup-Gebühr</span>
                          <Badge variant="secondary">Sofort fällig</Badge>
                        </div>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-bold">€{tier.setupPrice.toLocaleString('de-DE')}</span>
                        </div>
                      </div>
                      
                      {/* Monthly Subscription */}
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Monatliches Abo</span>
                          <Badge className="bg-primary/20 text-primary border-primary/30">Startet nach 30 Tagen</Badge>
                        </div>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-bold">€{tier.monthlyPrice}</span>
                          <span className="text-muted-foreground">/Monat</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Mindestlaufzeit: {tier.minContractMonths} Monate
                        </p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex-1 space-y-3 mb-6">
                      {tier.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Separator className="mb-6" />

                    {/* CTA */}
                    {isCurrentPlan ? (
                      <Button variant="outline" disabled className="w-full">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aktueller Plan
                      </Button>
                    ) : (
                      <Button 
                        variant={tier.highlighted ? "default" : "outline"}
                        className={`w-full ${tier.highlighted ? 'bg-primary' : ''}`}
                        onClick={() => handleCheckout(key)}
                        disabled={checkoutLoading === key}
                      >
                        {checkoutLoading === key ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CreditCard className="w-4 h-4 mr-2" />
                        )}
                        {isSubscribed ? 'Upgrade' : 'Jetzt starten'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Features Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Was Sie erhalten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-medium mb-1">AI Voice Agent</h4>
                <p className="text-sm text-muted-foreground">24/7 automatische Anrufannahme</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-medium mb-1">Reservierungen</h4>
                <p className="text-sm text-muted-foreground">Automatische Buchungsverwaltung</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-medium mb-1">Analytics</h4>
                <p className="text-sm text-muted-foreground">Detaillierte Einblicke & Reports</p>
              </div>
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Headphones className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-medium mb-1">Support</h4>
                <p className="text-sm text-muted-foreground">Persönliche Betreuung</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* FAQ Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium text-foreground">Fragen zu den Plänen?</p>
                <p className="text-sm text-muted-foreground">
                  Unser Team berät Sie gerne bei der Wahl des richtigen Plans.
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/portal/support">
                  <Zap className="w-4 h-4 mr-2" />
                  Support kontaktieren
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Subscriptions;

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, ArrowRight, Sparkles, ArrowLeft, Shield, Users, Briefcase } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Name muss mindestens 2 Zeichen lang sein'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
});

type LoginType = 'customer' | 'admin' | 'sales';

const PortalAuth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user, isLoading, roles } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'reset'>('login');
  const [loginType, setLoginType] = useState<LoginType>('customer');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '', 
    fullName: '' 
  });
  const [resetEmail, setResetEmail] = useState('');

  // Redirect based on role after login
  useEffect(() => {
    if (!isLoading && user && roles.length > 0) {
      if (roles.includes('admin')) {
        navigate('/admin');
      } else if (roles.includes('sales')) {
        navigate('/sales');
      } else {
        navigate('/portal');
      }
    }
  }, [user, isLoading, roles, navigate]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail || !z.string().email().safeParse(resetEmail).success) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/portal/auth`,
    });
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'E-Mail gesendet',
        description: 'Überprüfen Sie Ihren Posteingang für den Link zum Zurücksetzen.',
      });
      setActiveTab('login');
      setResetEmail('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      toast({
        title: 'Fehler',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Anmeldung fehlgeschlagen',
        description: error.message === 'Invalid login credentials' 
          ? 'E-Mail oder Passwort ist falsch' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Willkommen zurück!',
        description: 'Sie wurden erfolgreich angemeldet.',
      });
      // Navigation handled by useEffect based on role
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signupSchema.safeParse(signupData);
    if (!result.success) {
      toast({
        title: 'Fehler',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);
    setIsSubmitting(false);

    if (error) {
      const errorMessage = error.message.includes('already registered')
        ? 'Diese E-Mail-Adresse ist bereits registriert'
        : error.message;
      
      toast({
        title: 'Registrierung fehlgeschlagen',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account erstellt!',
        description: 'Willkommen in Ihrem neuen Portal.',
      });
      navigate('/portal');
    }
  };

  const getLoginTypeConfig = (type: LoginType) => {
    switch (type) {
      case 'admin':
        return {
          icon: Shield,
          title: 'Admin Login',
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
        };
      case 'sales':
        return {
          icon: Briefcase,
          title: 'Vertrieb Login',
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/20',
        };
      default:
        return {
          icon: Users,
          title: 'Kunden Login',
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          borderColor: 'border-primary/20',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const currentConfig = getLoginTypeConfig(loginType);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${currentConfig.bgColor} border ${currentConfig.borderColor} mb-4`}
          >
            <currentConfig.icon className={`w-4 h-4 ${currentConfig.color}`} />
            <span className={`text-sm font-medium ${currentConfig.color}`}>{currentConfig.title}</span>
          </motion.div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Willkommen
          </h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Termine, Dokumente und mehr
          </p>
        </div>

        {/* Login Type Selector */}
        <div className="flex gap-2 mb-6 justify-center">
          {(['customer', 'admin', 'sales'] as LoginType[]).map((type) => {
            const config = getLoginTypeConfig(type);
            const Icon = config.icon;
            return (
              <Button
                key={type}
                variant={loginType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLoginType(type)}
                className={`flex items-center gap-2 ${loginType === type ? '' : 'bg-secondary/50'}`}
              >
                <Icon className="w-4 h-4" />
                {type === 'customer' ? 'Kunde' : type === 'admin' ? 'Admin' : 'Vertrieb'}
              </Button>
            );
          })}
        </div>

        <Card className="glass border-border/50">
          <CardHeader className="pb-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup' | 'reset')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
                <TabsTrigger value="login">Anmelden</TabsTrigger>
                <TabsTrigger value="signup" disabled={loginType !== 'customer'}>Registrieren</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-Mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="ihre@email.de"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="pl-10 bg-secondary/50 border-border/50"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Passwort</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="pl-10 bg-secondary/50 border-border/50"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    variant="hero" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Anmelden...' : 'Anmelden'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('reset')}
                    className="w-full text-sm text-muted-foreground hover:text-primary transition-colors mt-2"
                  >
                    Passwort vergessen?
                  </button>
                </form>
              </TabsContent>
              
              <TabsContent value="reset" className="mt-6">
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">
                      Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zurücksetzen zu erhalten.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">E-Mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="ihre@email.de"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="pl-10 bg-secondary/50 border-border/50"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    variant="hero" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Senden...' : 'Link senden'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mt-2"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Zurück zur Anmeldung
                  </button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Vollständiger Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Max Mustermann"
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                        className="pl-10 bg-secondary/50 border-border/50"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-Mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="ihre@email.de"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        className="pl-10 bg-secondary/50 border-border/50"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Passwort</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        className="pl-10 bg-secondary/50 border-border/50"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Passwort bestätigen</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                        className="pl-10 bg-secondary/50 border-border/50"
                        required
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    variant="hero" 
                    className="w-full" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Registrieren...' : 'Account erstellen'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <a href="/" className="hover:text-primary transition-colors">
            ← Zurück zur Startseite
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default PortalAuth;
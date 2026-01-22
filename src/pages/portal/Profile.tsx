import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Camera, 
  Save,
  Lock,
  Shield,
  Loader2,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [pinData, setPinData] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: '',
    showCurrentPin: false,
    showNewPin: false,
  });
  
  const [hasExistingPin, setHasExistingPin] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        company_name: profile.company_name || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  // Check if PIN is already set
  useEffect(() => {
    const checkPin = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        const customerData = data as typeof data & { dashboard_pin?: string | null };
        setHasExistingPin(!!customerData.dashboard_pin);
      }
    };
    
    checkPin();
  }, [user?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        company_name: formData.company_name,
        phone: formData.phone,
      })
      .eq('id', user.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: 'Fehler',
        description: 'Profil konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
    } else {
      await refreshProfile();
      toast({
        title: 'Erfolgreich',
        description: 'Ihr Profil wurde aktualisiert.',
      });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie Ihr aktuelles Passwort ein.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Fehler',
        description: 'Die neuen Passwörter stimmen nicht überein.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Fehler',
        description: 'Das neue Passwort muss mindestens 6 Zeichen lang sein.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Erst mit aktuellem Passwort verifizieren durch Re-Login
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || '',
      password: passwordData.currentPassword,
    });

    if (signInError) {
      setIsLoading(false);
      toast({
        title: 'Fehler',
        description: 'Das aktuelle Passwort ist nicht korrekt.',
        variant: 'destructive',
      });
      return;
    }

    // Dann neues Passwort setzen
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword
    });
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      toast({
        title: 'Erfolgreich',
        description: 'Ihr Passwort wurde geändert.',
      });
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) return;
    
    // Validation
    if (hasExistingPin && !pinData.currentPin) {
      toast({
        title: 'Fehler',
        description: 'Bitte geben Sie Ihren aktuellen PIN ein.',
        variant: 'destructive',
      });
      return;
    }
    
    if (pinData.newPin && pinData.newPin !== pinData.confirmPin) {
      toast({
        title: 'Fehler',
        description: 'Die neuen PINs stimmen nicht überein.',
        variant: 'destructive',
      });
      return;
    }
    
    if (pinData.newPin && (pinData.newPin.length < 4 || pinData.newPin.length > 6)) {
      toast({
        title: 'Fehler',
        description: 'Der PIN muss 4-6 Zeichen lang sein.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSavingPin(true);
    
    // If changing existing PIN, verify current PIN first
    if (hasExistingPin) {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const customerData = data as typeof data & { dashboard_pin?: string | null };
      
      if (customerData?.dashboard_pin !== pinData.currentPin) {
        setIsSavingPin(false);
        toast({
          title: 'Fehler',
          description: 'Der aktuelle PIN ist nicht korrekt.',
          variant: 'destructive',
        });
        return;
      }
    }
    
    // Update PIN (or remove if empty)
    const { error } = await supabase
      .from('customers')
      .update({ dashboard_pin: pinData.newPin || null } as any)
      .eq('id', user.id);
    
    setIsSavingPin(false);
    
    if (error) {
      toast({
        title: 'Fehler',
        description: 'PIN konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    } else {
      setPinData({
        currentPin: '',
        newPin: '',
        confirmPin: '',
        showCurrentPin: false,
        showNewPin: false,
      });
      setHasExistingPin(!!pinData.newPin);
      toast({
        title: 'Erfolgreich',
        description: pinData.newPin ? 'PIN wurde gespeichert.' : 'PIN wurde entfernt.',
      });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Profil
        </h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihre persönlichen Daten und Einstellungen
        </p>
      </motion.div>

      <div className="grid gap-6">
        {/* Profile Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-xl font-display flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Persönliche Daten
              </CardTitle>
              <CardDescription>
                Aktualisieren Sie Ihre Kontaktinformationen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="w-24 h-24 border-4 border-primary/20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground mb-1">
                      {profile?.full_name || 'Benutzer'}
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      {profile?.email}
                    </p>
                    <Button variant="outline" size="sm" type="button" disabled>
                      <Camera className="w-4 h-4 mr-2" />
                      Foto ändern
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Vollständiger Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="pl-10 bg-secondary/50"
                        placeholder="Max Mustermann"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        value={profile?.email || ''}
                        disabled
                        className="pl-10 bg-secondary/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_name">Unternehmen</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="pl-10 bg-secondary/50"
                        placeholder="Firma GmbH"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-10 bg-secondary/50"
                        placeholder="+49 123 456789"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" variant="hero" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Speichern
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Password Change Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-xl font-display flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Passwort ändern
              </CardTitle>
              <CardDescription>
                Aktualisieren Sie Ihr Passwort für mehr Sicherheit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="bg-secondary/50"
                    placeholder="••••••••"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Neues Passwort</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="bg-secondary/50"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="bg-secondary/50"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    variant="outline" 
                    disabled={isLoading || !passwordData.newPassword}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4 mr-2" />
                    )}
                    Passwort ändern
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* PIN Protection Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="text-xl font-display flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                Dashboard-PIN
              </CardTitle>
              <CardDescription>
                Schützen Sie sensible Bereiche (Statistiken, Umsatz) mit einem PIN. 
                Kalender und Reservierungen bleiben ohne PIN zugänglich.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePin} className="space-y-4">
                {hasExistingPin && (
                  <div className="space-y-2">
                    <Label htmlFor="currentPin">Aktueller PIN</Label>
                    <div className="relative">
                      <Input
                        id="currentPin"
                        type={pinData.showCurrentPin ? 'text' : 'password'}
                        value={pinData.currentPin}
                        onChange={(e) => setPinData({ ...pinData, currentPin: e.target.value })}
                        className="bg-secondary/50 pr-10"
                        placeholder="••••"
                        maxLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setPinData({ ...pinData, showCurrentPin: !pinData.showCurrentPin })}
                      >
                        {pinData.showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPin">{hasExistingPin ? 'Neuer PIN' : 'PIN festlegen'}</Label>
                    <div className="relative">
                      <Input
                        id="newPin"
                        type={pinData.showNewPin ? 'text' : 'password'}
                        value={pinData.newPin}
                        onChange={(e) => setPinData({ ...pinData, newPin: e.target.value })}
                        className="bg-secondary/50 pr-10"
                        placeholder="4-6 Zeichen"
                        maxLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setPinData({ ...pinData, showNewPin: !pinData.showNewPin })}
                      >
                        {pinData.showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPin">PIN bestätigen</Label>
                    <Input
                      id="confirmPin"
                      type="password"
                      value={pinData.confirmPin}
                      onChange={(e) => setPinData({ ...pinData, confirmPin: e.target.value })}
                      className="bg-secondary/50"
                      placeholder="••••"
                      maxLength={6}
                    />
                  </div>
                </div>

                {hasExistingPin && (
                  <p className="text-sm text-muted-foreground">
                    Lassen Sie das neue PIN-Feld leer, um den PIN-Schutz zu deaktivieren.
                  </p>
                )}

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    variant="outline" 
                    disabled={isSavingPin}
                  >
                    {isSavingPin ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4 mr-2" />
                    )}
                    {hasExistingPin ? 'PIN aktualisieren' : 'PIN aktivieren'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;

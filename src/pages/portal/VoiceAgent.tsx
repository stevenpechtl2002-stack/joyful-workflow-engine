import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Phone, 
  Globe, 
  Clock,
  MessageSquare,
  Save,
  Loader2,
  CheckCircle2,
  Link as LinkIcon,
  Bot,
  Settings2
} from 'lucide-react';
import { useVoiceAgentConfig } from '@/hooks/usePortalData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VoiceAgent = () => {
  const { user } = useAuth();
  const { data: config, isLoading, refetch } = useVoiceAgentConfig();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    business_name: '',
    industry: 'restaurant',
    language: 'de',
    voice: 'female_1',
    phone_number: '',
    website_url: '',
    greeting_text: '',
    opening_hours: {} as Record<string, { open: string; close: string; closed: boolean }>,
    is_active: false,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        business_name: config.business_name || '',
        industry: config.industry || 'restaurant',
        language: config.language || 'de',
        voice: config.voice || 'female_1',
        phone_number: config.phone_number || '',
        website_url: config.website_url || '',
        greeting_text: config.greeting_text || '',
        opening_hours: (config.opening_hours as Record<string, { open: string; close: string; closed: boolean }>) || {},
        is_active: config.is_active || false,
      });
    }
  }, [config]);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('voice_agent_config')
        .upsert({
          user_id: user.id,
          ...formData,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Send config to n8n
      try {
        await supabase.functions.invoke('trigger-workflow', {
          body: { 
            action: 'voice_agent_config_update',
            config: formData 
          }
        });
      } catch (e) {
        console.log('N8N notification skipped');
      }

      toast.success('Konfiguration gespeichert');
      refetch();
    } catch (error: any) {
      toast.error('Fehler beim Speichern: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const industries = [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'spa', label: 'Spa & Wellness' },
    { value: 'medical', label: 'Arztpraxis' },
    { value: 'salon', label: 'Friseur & Beauty' },
    { value: 'other', label: 'Sonstige' },
  ];

  const languages = [
    { value: 'de', label: 'Deutsch' },
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'Français' },
    { value: 'es', label: 'Español' },
    { value: 'it', label: 'Italiano' },
  ];

  const voices = [
    { value: 'female_1', label: 'Weiblich - Professionell' },
    { value: 'female_2', label: 'Weiblich - Freundlich' },
    { value: 'male_1', label: 'Männlich - Professionell' },
    { value: 'male_2', label: 'Männlich - Entspannt' },
  ];

  const weekdays = [
    { key: 'monday', label: 'Montag' },
    { key: 'tuesday', label: 'Dienstag' },
    { key: 'wednesday', label: 'Mittwoch' },
    { key: 'thursday', label: 'Donnerstag' },
    { key: 'friday', label: 'Freitag' },
    { key: 'saturday', label: 'Samstag' },
    { key: 'sunday', label: 'Sonntag' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Voice Agent Konfiguration</h1>
          <p className="text-muted-foreground">
            Konfigurieren Sie Ihren AI Voice Agent für optimale Ergebnisse.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              checked={formData.is_active} 
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label>Agent aktiv</Label>
          </div>
          <Badge variant={formData.is_active ? "default" : "secondary"} className={formData.is_active ? "bg-green-500" : ""}>
            {formData.is_active ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Grundeinstellungen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Unternehmensname</Label>
                  <Input
                    value={formData.business_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                    placeholder="Ihr Unternehmensname"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Branche</Label>
                  <Select value={formData.industry} onValueChange={(v) => setFormData(prev => ({ ...prev, industry: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map(ind => (
                        <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sprache</Label>
                    <Select value={formData.language} onValueChange={(v) => setFormData(prev => ({ ...prev, language: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map(lang => (
                          <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Stimme</Label>
                    <Select value={formData.voice} onValueChange={(v) => setFormData(prev => ({ ...prev, voice: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {voices.map(voice => (
                          <SelectItem key={voice.value} value={voice.value}>{voice.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Telefonnummer
                  </Label>
                  <Input
                    value={formData.phone_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                    placeholder="+49 123 456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website URL
                  </Label>
                  <Input
                    value={formData.website_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                    placeholder="https://www.example.com"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Opening Hours */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Öffnungszeiten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {weekdays.map(day => {
                  const dayData = formData.opening_hours[day.key] || { open: '09:00', close: '22:00', closed: false };
                  return (
                    <div key={day.key} className="flex items-center gap-3">
                      <div className="w-24 text-sm">{day.label}</div>
                      <Switch
                        checked={!dayData.closed}
                        onCheckedChange={(checked) => {
                          setFormData(prev => ({
                            ...prev,
                            opening_hours: {
                              ...prev.opening_hours,
                              [day.key]: { ...dayData, closed: !checked }
                            }
                          }));
                        }}
                      />
                      {!dayData.closed && (
                        <>
                          <Input
                            type="time"
                            value={dayData.open}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                opening_hours: {
                                  ...prev.opening_hours,
                                  [day.key]: { ...dayData, open: e.target.value }
                                }
                              }));
                            }}
                            className="w-28"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="time"
                            value={dayData.close}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                opening_hours: {
                                  ...prev.opening_hours,
                                  [day.key]: { ...dayData, close: e.target.value }
                                }
                              }));
                            }}
                            className="w-28"
                          />
                        </>
                      )}
                      {dayData.closed && (
                        <span className="text-sm text-muted-foreground">Geschlossen</span>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* Greeting & Responses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Begrüßung & Antworten
                </CardTitle>
                <CardDescription>
                  Definieren Sie, wie der Voice Agent Anrufer begrüßt und auf häufige Fragen antwortet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Begrüßungstext</Label>
                  <Textarea
                    value={formData.greeting_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, greeting_text: e.target.value }))}
                    placeholder="Guten Tag, Sie erreichen [Unternehmensname]. Wie kann ich Ihnen helfen?"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Verwenden Sie [Unternehmensname] als Platzhalter für Ihren Unternehmensnamen.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      )}

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-end"
      >
        <Button onClick={handleSave} disabled={saving} size="lg" className="bg-primary">
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Konfiguration speichern
        </Button>
      </motion.div>
    </div>
  );
};

export default VoiceAgent;

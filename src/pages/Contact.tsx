import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  CheckCircle2, 
  Phone, 
  Bot, 
  Workflow, 
  Code2, 
  Sparkles,
  User,
  Building,
  Mail as MailIcon,
  Phone as PhoneIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const serviceOptions = [
  { id: "phone-ai", label: "KI-Telefonassistent", icon: Phone },
  { id: "workflow", label: "Workflow-Automatisierungen", icon: Workflow },
  { id: "backoffice", label: "Web-Entwicklung", icon: Code2 },
  { id: "custom", label: "Individuelle Anfrage", icon: Sparkles },
];

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    services: [] as string[],
    message: ""
  });

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(s => s !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: formData.name,
          company: formData.company,
          phone: formData.phone,
          email: formData.email,
          services: formData.services.map(s => 
            serviceOptions.find(o => o.id === s)?.label || s
          ),
          projectDescription: formData.message,
        },
      });

      if (error) {
        throw error;
      }

      setIsSubmitted(true);
      toast({
        title: "Anfrage gesendet!",
        description: "Wir melden uns innerhalb von 24 Stunden bei Ihnen.",
      });
    } catch (error: any) {
      console.error("Error submitting contact form:", error);
      toast({
        title: "Fehler beim Senden",
        description: "Bitte versuchen Sie es erneut oder kontaktieren Sie uns telefonisch.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16 min-h-[calc(100vh-200px)] flex items-center">
          <div className="container mx-auto px-4">
            <div className="max-w-lg mx-auto text-center animate-fade-up">
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Vielen Dank für Ihre <span className="text-gradient">Anfrage</span>!
              </h1>
              <p className="text-muted-foreground text-lg mb-8">
                Wir haben Ihre Nachricht erhalten und werden uns innerhalb von 24 Stunden bei Ihnen melden.
              </p>
              <div className="glass rounded-xl p-6 text-left">
                <h3 className="font-display font-semibold mb-4">Zusammenfassung:</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><span className="text-foreground">Name:</span> {formData.name}</p>
                  <p><span className="text-foreground">Unternehmen:</span> {formData.company}</p>
                  <p><span className="text-foreground">E-Mail:</span> {formData.email}</p>
                  {formData.services.length > 0 && (
                    <p>
                      <span className="text-foreground">Interesse an:</span>{" "}
                      {formData.services.map(s => 
                        serviceOptions.find(o => o.id === s)?.label
                      ).join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                className="mt-6"
                onClick={() => setIsSubmitted(false)}
              >
                Neue Anfrage senden
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">
                Projekt <span className="text-gradient">anfragen</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Erzählen Sie uns von Ihrem Projekt und wir erstellen Ihnen ein 
                unverbindliches Angebot für Ihre individuelle KI-Lösung.
              </p>
            </div>

            {/* Form */}
            <div className="glass rounded-2xl p-8 md:p-10">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Name *
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Ihr vollständiger Name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-secondary border-border focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-foreground flex items-center gap-2">
                      <Building className="w-4 h-4 text-primary" />
                      Unternehmen
                    </Label>
                    <Input
                      id="company"
                      type="text"
                      placeholder="Ihr Unternehmen"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      className="bg-secondary border-border focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-primary" />
                      Telefonnummer *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+49 123 456 7890"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-secondary border-border focus:border-primary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground flex items-center gap-2">
                      <MailIcon className="w-4 h-4 text-primary" />
                      E-Mail *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ihre@email.de"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-secondary border-border focus:border-primary"
                      required
                    />
                  </div>
                </div>

                {/* Service Selection */}
                <div className="space-y-4">
                  <Label className="text-foreground">Wofür interessieren Sie sich?</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {serviceOptions.map((service) => {
                      const isSelected = formData.services.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => handleServiceToggle(service.id)}
                          className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
                            isSelected 
                              ? "border-primary bg-primary/10 glow-primary" 
                              : "border-border bg-secondary/30 hover:border-primary/50"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isSelected ? "bg-primary/30" : "bg-secondary"
                          }`}>
                            <service.icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <span className={`font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                            {service.label}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-foreground flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    Beschreiben Sie Ihr Projekt
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Erzählen Sie uns mehr über Ihr Projekt, Ihre Ziele und Herausforderungen..."
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    className="bg-secondary border-border focus:border-primary min-h-[150px] resize-none"
                  />
                </div>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    * Pflichtfelder. Wir melden uns innerhalb von 24 Stunden.
                  </p>
                  <Button 
                    type="submit" 
                    variant="hero" 
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Wird gesendet...
                      </>
                    ) : (
                      <>
                        Absenden
                        <Send className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;

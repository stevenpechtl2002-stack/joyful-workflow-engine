import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Zap, Shield, TrendingUp, ArrowRight } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "24/7 Erreichbarkeit",
    description: "Ihre KI-Assistenten arbeiten rund um die Uhr – ohne Pausen, Urlaub oder Überstunden."
  },
  {
    icon: Zap,
    title: "Sofortige Reaktion",
    description: "Blitzschnelle Antworten auf Kundenanfragen und automatische Lead-Qualifizierung."
  },
  {
    icon: Shield,
    title: "Zuverlässig & Sicher",
    description: "Deutsche Server, DSGVO-konform und höchste Sicherheitsstandards für Ihre Daten."
  },
  {
    icon: TrendingUp,
    title: "Skalierbar",
    description: "Von Einzelunternehmer bis Konzern – unsere Lösungen wachsen mit Ihrem Unternehmen."
  }
];

const BenefitsSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-hero opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
              Warum <span className="text-gradient">AIAssist</span>?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Wir kombinieren modernste KI-Technologie mit individueller Beratung, 
              um Ihnen maßgeschneiderte Automatisierungslösungen zu bieten.
            </p>

            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-foreground mb-1">
                      {benefit.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Link to="/kontakt">
                <Button variant="hero" size="lg">
                  Jetzt Projekt starten
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative">
            <div className="glass rounded-2xl p-8 animate-float">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-muted-foreground">KI-System aktiv</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/50 rounded-xl p-4">
                    <p className="text-3xl font-display font-bold text-gradient">247</p>
                    <p className="text-xs text-muted-foreground">Anrufe heute</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-4">
                    <p className="text-3xl font-display font-bold text-gradient">98%</p>
                    <p className="text-xs text-muted-foreground">Erfolgsrate</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-4">
                    <p className="text-3xl font-display font-bold text-gradient">1.2s</p>
                    <p className="text-xs text-muted-foreground">Antwortzeit</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-4">
                    <p className="text-3xl font-display font-bold text-gradient">24/7</p>
                    <p className="text-xs text-muted-foreground">Verfügbar</p>
                  </div>
                </div>

                <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Letzte Aktivität</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-muted-foreground">Reservierung aufgenommen</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-muted-foreground">Lead qualifiziert</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-muted-foreground">Workflow ausgeführt</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;

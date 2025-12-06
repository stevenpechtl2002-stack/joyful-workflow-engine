import { Phone, Workflow, Bot, Code2 } from "lucide-react";

const services = [
  {
    icon: Phone,
    title: "KI-Telefonassistenten",
    description: "Intelligente Voice-Agents, die Anrufe 24/7 entgegennehmen, Reservierungen aufnehmen und Kundenanfragen bearbeiten.",
    features: ["Natürliche Sprachverarbeitung", "Mehrsprachig", "Nahtlose Integration"]
  },
  {
    icon: Workflow,
    title: "n8n Automatisierungen",
    description: "Leistungsstarke Workflow-Automatisierungen, die Ihre Geschäftsprozesse optimieren und Zeit sparen.",
    features: ["Lead-Automatisierung", "E-Mail Workflows", "Datenintegration"]
  },
  {
    icon: Bot,
    title: "Web KI-Assistenten",
    description: "Chatbots und virtuelle Assistenten für Ihre Website, die Kunden beraten und Support bieten.",
    features: ["24/7 Verfügbarkeit", "Personalisiert", "Lernfähig"]
  },
  {
    icon: Code2,
    title: "Individuelle Entwicklung",
    description: "Maßgeschneiderte KI-Lösungen und Backoffice-Systeme, die genau auf Ihre Bedürfnisse zugeschnitten sind.",
    features: ["API-Integrationen", "Custom Solutions", "Beratung"]
  }
];

const ServicesSection = () => {
  return (
    <section className="py-24 bg-gradient-dark relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Unsere <span className="text-gradient">Services</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Von KI-gesteuerten Telefonassistenten bis hin zu komplexen Automatisierungen – 
            wir bieten die passende Lösung für Ihr Unternehmen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, index) => (
            <div
              key={index}
              className="group glass rounded-2xl p-8 hover:bg-card/70 transition-all duration-500 hover:scale-[1.02] animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 group-hover:glow-primary transition-all duration-300">
                  <service.icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {service.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {service.features.map((feature, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 text-xs rounded-full bg-secondary text-muted-foreground"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;

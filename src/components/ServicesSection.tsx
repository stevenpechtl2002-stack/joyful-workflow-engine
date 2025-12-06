import { Phone, Workflow, Bot, Code2 } from "lucide-react";
import { motion } from "framer-motion";
import phoneAssistant from "@/assets/phone-assistant.png";
import automationFlow from "@/assets/automation-flow.png";
import backofficeVisual from "@/assets/backoffice-visual.png";

const services = [
  {
    icon: Phone,
    title: "KI-Telefonassistenten",
    description: "Intelligente Voice-Agents, die Anrufe 24/7 entgegennehmen, Reservierungen aufnehmen und Kundenanfragen bearbeiten.",
    features: ["Natürliche Sprachverarbeitung", "Mehrsprachig", "Nahtlose Integration"],
    image: phoneAssistant,
    gradient: "from-cyan-500/20 to-blue-500/20"
  },
  {
    icon: Workflow,
    title: "n8n Automatisierungen",
    description: "Leistungsstarke Workflow-Automatisierungen, die Ihre Geschäftsprozesse optimieren und Zeit sparen.",
    features: ["Lead-Automatisierung", "E-Mail Workflows", "Datenintegration"],
    image: automationFlow,
    gradient: "from-blue-500/20 to-purple-500/20"
  },
  {
    icon: Bot,
    title: "Web KI-Assistenten",
    description: "Chatbots und virtuelle Assistenten für Ihre Website, die Kunden beraten und Support bieten.",
    features: ["24/7 Verfügbarkeit", "Personalisiert", "Lernfähig"],
    image: phoneAssistant,
    gradient: "from-purple-500/20 to-pink-500/20"
  },
  {
    icon: Code2,
    title: "Backoffice-Systeme",
    description: "Maßgeschneiderte KI-Lösungen und Backoffice-Systeme, die genau auf Ihre Bedürfnisse zugeschnitten sind.",
    features: ["API-Integrationen", "Custom Solutions", "Beratung"],
    image: backofficeVisual,
    gradient: "from-pink-500/20 to-cyan-500/20"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }
  }
};

const ServicesSection = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-dark" />
      <motion.div 
        className="absolute top-1/2 left-0 w-[800px] h-[800px] rounded-full blur-[150px] -translate-y-1/2"
        style={{ background: 'radial-gradient(circle, hsl(185 100% 50% / 0.08) 0%, transparent 70%)' }}
        animate={{ x: [-100, 100, -100] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.span 
            className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Was wir bieten
          </motion.span>
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">
            Unsere{" "}
            <span 
              style={{ 
                background: 'linear-gradient(135deg, hsl(185 100% 50%) 0%, hsl(200 100% 65%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Services
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Von KI-gesteuerten Telefonassistenten bis hin zu komplexen Automatisierungen – 
            wir bieten die passende Lösung für Ihr Unternehmen.
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {services.map((service, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative"
            >
              <motion.div 
                className="relative rounded-3xl overflow-hidden border border-border/30"
                style={{ background: 'linear-gradient(145deg, hsl(222 47% 11%) 0%, hsl(222 47% 8%) 100%)' }}
                whileHover={{ y: -10, scale: 1.02 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {/* Service Image */}
                <div className="relative h-48 overflow-hidden">
                  <motion.img 
                    src={service.image} 
                    alt={service.title}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-b ${service.gradient} via-transparent to-card`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative p-8 -mt-16">
                  <motion.div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-primary/30"
                    style={{ background: 'linear-gradient(135deg, hsl(185 100% 50% / 0.2) 0%, hsl(200 100% 60% / 0.1) 100%)', backdropFilter: 'blur(10px)' }}
                    whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <service.icon className="w-8 h-8 text-primary" />
                  </motion.div>
                  
                  <h3 className="font-display text-2xl font-bold text-foreground mb-3">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {service.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {service.features.map((feature, i) => (
                      <motion.span
                        key={i}
                        className="px-4 py-1.5 text-xs font-medium rounded-full border border-primary/30"
                        style={{ background: 'linear-gradient(135deg, hsl(185 100% 50% / 0.1) 0%, transparent 100%)' }}
                        whileHover={{ scale: 1.05, borderColor: 'hsl(185 100% 50% / 0.6)' }}
                      >
                        {feature}
                      </motion.span>
                    ))}
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <motion.div 
                  className="absolute inset-0 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ boxShadow: 'inset 0 0 60px hsl(185 100% 50% / 0.1), 0 0 80px hsl(185 100% 50% / 0.15)' }}
                />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;

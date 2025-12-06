import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, Zap, Shield, TrendingUp, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const benefits = [
  {
    icon: Clock,
    title: "24/7 Erreichbarkeit",
    description: "Ihre KI-Assistenten arbeiten rund um die Uhr – ohne Pausen, Urlaub oder Überstunden.",
    color: "from-cyan-400 to-blue-500"
  },
  {
    icon: Zap,
    title: "Sofortige Reaktion",
    description: "Blitzschnelle Antworten auf Kundenanfragen und automatische Lead-Qualifizierung.",
    color: "from-yellow-400 to-orange-500"
  },
  {
    icon: Shield,
    title: "Zuverlässig & Sicher",
    description: "Deutsche Server, DSGVO-konform und höchste Sicherheitsstandards für Ihre Daten.",
    color: "from-green-400 to-emerald-500"
  },
  {
    icon: TrendingUp,
    title: "Skalierbar",
    description: "Von Einzelunternehmer bis Konzern – unsere Lösungen wachsen mit Ihrem Unternehmen.",
    color: "from-purple-400 to-pink-500"
  }
];

const statsData = [
  { value: "247", label: "Anrufe heute", suffix: "" },
  { value: "98", label: "Erfolgsrate", suffix: "%" },
  { value: "1.2", label: "Antwortzeit", suffix: "s" },
  { value: "24/7", label: "Verfügbar", suffix: "" }
];

const BenefitsSection = () => {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Animated Background */}
      <motion.div 
        className="absolute top-0 right-0 w-[1000px] h-[1000px] rounded-full blur-[200px]"
        style={{ background: 'radial-gradient(circle, hsl(185 100% 50% / 0.1) 0%, transparent 60%)' }}
        animate={{ 
          x: [100, 0, 100],
          y: [-100, 100, -100],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <motion.span 
              className="inline-block text-primary text-sm font-semibold tracking-wider uppercase mb-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              Ihre Vorteile
            </motion.span>
            
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-8">
              Warum{" "}
              <span 
                style={{ 
                  background: 'linear-gradient(135deg, hsl(185 100% 50%) 0%, hsl(200 100% 65%) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                AIAssist
              </span>
              ?
            </h2>
            
            <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
              Wir kombinieren modernste KI-Technologie mit individueller Beratung, 
              um Ihnen maßgeschneiderte Automatisierungslösungen zu bieten.
            </p>

            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  className="group flex items-start gap-5"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <motion.div 
                    className="relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-20`} />
                    <div className="absolute inset-0 border border-primary/30 rounded-2xl" />
                    <benefit.icon className="w-6 h-6 text-primary relative z-10" />
                  </motion.div>
                  
                  <div>
                    <h4 className="font-display font-bold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                      {benefit.title}
                    </h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div 
              className="mt-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Link to="/kontakt">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    size="lg" 
                    className="relative overflow-hidden text-lg px-8 py-6 rounded-full font-semibold group"
                    style={{ background: 'linear-gradient(135deg, hsl(185 100% 50%) 0%, hsl(200 100% 60%) 100%)' }}
                  >
                    <span className="relative z-10 text-background flex items-center gap-2">
                      Jetzt Projekt starten
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Visual - Interactive Stats Dashboard */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <motion.div 
              className="relative rounded-3xl p-8 border border-border/50 overflow-hidden"
              style={{ background: 'linear-gradient(145deg, hsl(222 47% 11%) 0%, hsl(222 47% 8%) 100%)', backdropFilter: 'blur(20px)' }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Glow Effect */}
              <div 
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[80px]"
                style={{ background: 'radial-gradient(circle, hsl(185 100% 50% / 0.4) 0%, transparent 70%)' }}
              />
              
              <div className="relative z-10 space-y-6">
                {/* Status Header */}
                <div className="flex items-center gap-4">
                  <motion.div 
                    className="w-3 h-3 rounded-full bg-green-500"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-sm text-muted-foreground font-medium">KI-System aktiv</span>
                  <div className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                    Online
                  </div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {statsData.map((stat, index) => (
                    <motion.div 
                      key={index}
                      className="rounded-2xl p-5 border border-border/30"
                      style={{ background: 'linear-gradient(145deg, hsl(222 47% 14%) 0%, hsl(222 47% 10%) 100%)' }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      whileHover={{ scale: 1.05, borderColor: 'hsl(185 100% 50% / 0.4)' }}
                    >
                      <motion.p 
                        className="text-4xl font-display font-bold mb-1"
                        style={{ 
                          background: 'linear-gradient(135deg, hsl(185 100% 50%) 0%, hsl(200 100% 65%) 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        {stat.value}{stat.suffix}
                      </motion.p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Activity Feed */}
                <div 
                  className="rounded-2xl p-5 border border-border/30"
                  style={{ background: 'linear-gradient(145deg, hsl(222 47% 12%) 0%, hsl(222 47% 9%) 100%)' }}
                >
                  <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Letzte Aktivität</p>
                  <div className="space-y-3">
                    {[
                      { text: "Reservierung aufgenommen", time: "vor 2 Min." },
                      { text: "Lead qualifiziert", time: "vor 5 Min." },
                      { text: "Workflow ausgeführt", time: "vor 8 Min." }
                    ].map((activity, i) => (
                      <motion.div 
                        key={i}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
                      >
                        <motion.div 
                          className="w-2 h-2 rounded-full bg-primary"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                        />
                        <span className="text-sm text-foreground flex-1">{activity.text}</span>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Decorative Elements */}
            <motion.div 
              className="absolute -bottom-4 -right-4 w-32 h-32 rounded-2xl border border-primary/20 -z-10"
              animate={{ rotate: [0, 5, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute -top-4 -left-4 w-24 h-24 rounded-full border border-primary/10 -z-10"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;

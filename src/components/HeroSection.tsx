import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-ai.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Hero Background Image with Overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="AI Neural Network Visualization" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background/80" />
      </div>
      
      {/* Animated Gradient Orbs */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, hsl(185 100% 50% / 0.15) 0%, transparent 70%)' }}
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 50, 0],
          y: [0, -30, 0]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(circle, hsl(200 100% 60% / 0.12) 0%, transparent 70%)' }}
        animate={{ 
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
          x: [0, -40, 0],
          y: [0, 40, 0]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      
      {/* Floating Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/50"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/40 mb-8"
            style={{ background: 'linear-gradient(135deg, hsl(222 47% 10% / 0.8) 0%, hsl(222 47% 15% / 0.6) 100%)', backdropFilter: 'blur(20px)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm text-foreground/80 font-medium">Intelligente Automatisierung für Ihr Business</span>
          </motion.div>

          {/* Main Headline with Staggered Animation */}
          <motion.h1 
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <span className="block">AI Assistants &</span>
            <motion.span 
              className="block mt-2"
              style={{ 
                background: 'linear-gradient(135deg, hsl(185 100% 50%) 0%, hsl(200 100% 65%) 50%, hsl(220 100% 70%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{ duration: 5, repeat: Infinity }}
            >
              Automatisierungen
            </motion.span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Individuelle KI-Lösungen, Voice-Agents und Backoffice-Workflows – 
            <span className="text-foreground font-medium"> maßgeschneidert für Ihr Unternehmen.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
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
                    Jetzt unverbindlich anfragen
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <motion.div 
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, hsl(200 100% 60%) 0%, hsl(220 100% 70%) 100%)' }}
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </Button>
              </motion.div>
            </Link>
            <Link to="/backoffice">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-lg px-8 py-6 rounded-full border-primary/50 hover:border-primary hover:bg-primary/10 transition-all duration-300"
                >
                  Zum Backoffice
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Feature Cards */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <Link to="/backoffice" className="group">
              <motion.div 
                className="relative rounded-2xl p-8 border border-border/50 overflow-hidden"
                style={{ background: 'linear-gradient(145deg, hsl(222 47% 10% / 0.9) 0%, hsl(222 47% 8% / 0.8) 100%)', backdropFilter: 'blur(20px)' }}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: '0 0 60px hsl(185 100% 50% / 0.3), inset 0 0 30px hsl(185 100% 50% / 0.1)' }} />
                <div className="relative z-10">
                  <motion.div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 mx-auto" style={{ background: 'linear-gradient(135deg, hsl(185 100% 50% / 0.2) 0%, hsl(200 100% 60% / 0.1) 100%)' }} whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }} transition={{ duration: 0.5 }}>
                    <Bot className="w-7 h-7 text-primary" />
                  </motion.div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-2">Backoffice</h3>
                  <p className="text-sm text-muted-foreground">Dashboard für Ihre Daten</p>
                </div>
              </motion.div>
            </Link>
            
            <Link to="/login" className="group">
              <motion.div 
                className="relative rounded-2xl p-8 border border-border/50 overflow-hidden"
                style={{ background: 'linear-gradient(145deg, hsl(222 47% 10% / 0.9) 0%, hsl(222 47% 8% / 0.8) 100%)', backdropFilter: 'blur(20px)' }}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: '0 0 60px hsl(185 100% 50% / 0.3), inset 0 0 30px hsl(185 100% 50% / 0.1)' }} />
                <div className="relative z-10">
                  <motion.div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 mx-auto" style={{ background: 'linear-gradient(135deg, hsl(185 100% 50% / 0.2) 0%, hsl(200 100% 60% / 0.1) 100%)' }} whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }} transition={{ duration: 0.5 }}>
                    <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </motion.div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-2">Kunden Login</h3>
                  <p className="text-sm text-muted-foreground">Zugang zum Kundenbereich</p>
                </div>
              </motion.div>
            </Link>
            
            <Link to="/kontakt" className="group">
              <motion.div 
                className="relative rounded-2xl p-8 border border-border/50 overflow-hidden"
                style={{ background: 'linear-gradient(145deg, hsl(222 47% 10% / 0.9) 0%, hsl(222 47% 8% / 0.8) 100%)', backdropFilter: 'blur(20px)' }}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: '0 0 60px hsl(185 100% 50% / 0.3), inset 0 0 30px hsl(185 100% 50% / 0.1)' }} />
                <div className="relative z-10">
                  <motion.div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 mx-auto" style={{ background: 'linear-gradient(135deg, hsl(185 100% 50% / 0.2) 0%, hsl(200 100% 60% / 0.1) 100%)' }} whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }} transition={{ duration: 0.5 }}>
                    <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </motion.div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-2">Kontakt</h3>
                  <p className="text-sm text-muted-foreground">Projekt anfragen</p>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;

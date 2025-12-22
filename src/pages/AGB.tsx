import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const AGB = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-display font-bold text-foreground mb-8">
              Allgemeine Geschäftsbedingungen (AGB)
            </h1>
            
            <div className="prose prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">1. Geltungsbereich</h2>
                <p className="text-muted-foreground">
                  Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen NextGenAI 
                  und dem Kunden über die Bereitstellung von KI-gestützten Automatisierungslösungen 
                  und damit verbundenen Dienstleistungen.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">2. Vertragsgegenstand</h2>
                <p className="text-muted-foreground">
                  NextGenAI bietet individuelle, auf den Kunden zugeschnittene KI-Automatisierungslösungen an. 
                  Der genaue Leistungsumfang ergibt sich aus der jeweiligen Leistungsbeschreibung und dem 
                  gewählten Abonnement.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">3. Preise und Zahlung</h2>
                <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                  <li>Einmalige Setup-Gebühr: 2.500,00 € (sofort fällig bei Vertragsabschluss)</li>
                  <li>Monatliche Abonnementgebühr: 499,99 € (erste Zahlung 30 Tage nach Vertragsabschluss)</li>
                  <li>Alle Preise verstehen sich zzgl. der gesetzlichen Mehrwertsteuer</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">4. Vertragslaufzeit und Kündigung</h2>
                <p className="text-muted-foreground">
                  Der Vertrag hat eine Mindestlaufzeit von 12 Monaten. Eine Kündigung ist erstmals nach 
                  Ablauf der Mindestlaufzeit mit einer Frist von 30 Tagen zum Monatsende möglich. 
                  Ohne Kündigung verlängert sich der Vertrag automatisch um jeweils einen weiteren Monat.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">5. Widerrufsrecht und Rückgabe</h2>
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <p className="text-foreground font-medium mb-2">Wichtiger Hinweis:</p>
                  <p className="text-muted-foreground">
                    Da es sich bei unseren Leistungen um individuell auf den Kunden zugeschnittene 
                    Produkte und Dienstleistungen handelt, besteht gemäß § 312g Abs. 2 Nr. 1 BGB 
                    <strong className="text-foreground"> kein Widerrufsrecht</strong>. 
                    Die individuellen Anpassungen und Konfigurationen werden speziell für jeden 
                    Kunden erstellt und können nicht zurückgenommen oder weiterverwendet werden.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">6. Leistungserbringung</h2>
                <p className="text-muted-foreground">
                  Die Einrichtung und Konfiguration der individuellen Automatisierungslösung erfolgt 
                  innerhalb von 30 Tagen nach Zahlungseingang der Setup-Gebühr. Der Kunde erhält 
                  Zugang zum Portal und allen gebuchten Funktionen.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">7. Haftung</h2>
                <p className="text-muted-foreground">
                  NextGenAI haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers 
                  oder der Gesundheit sowie für vorsätzlich oder grob fahrlässig verursachte Schäden. 
                  Im Übrigen ist die Haftung auf vorhersehbare, vertragstypische Schäden begrenzt.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">8. Datenschutz</h2>
                <p className="text-muted-foreground">
                  Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer{' '}
                  <a href="/datenschutz" className="text-primary hover:underline">
                    Datenschutzerklärung
                  </a>
                  .
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">9. Schlussbestimmungen</h2>
                <p className="text-muted-foreground">
                  Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist, soweit gesetzlich 
                  zulässig, der Sitz von NextGenAI. Sollten einzelne Bestimmungen dieser AGB unwirksam 
                  sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
                </p>
              </section>

              <section className="pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Stand: Dezember 2025
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AGB;

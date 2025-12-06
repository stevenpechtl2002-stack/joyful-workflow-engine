import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Datenschutz = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-8">
              <span className="text-gradient">Datenschutzerklärung</span>
            </h1>
            
            <div className="glass rounded-2xl p-8 space-y-8">
              <section>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  1. Datenschutz auf einen Blick
                </h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Diese Datenschutzerklärung klärt Sie über die Art, den Umfang und Zweck der Verarbeitung 
                    von personenbezogenen Daten innerhalb unseres Onlineangebotes auf.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  2. Verantwortlicher
                </h2>
                <div className="text-muted-foreground space-y-1">
                  <p>AIAssist GmbH</p>
                  <p>Musterstraße 123</p>
                  <p>12345 Musterstadt</p>
                  <p>E-Mail: datenschutz@aiassist.de</p>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  3. Erhebung und Verarbeitung personenbezogener Daten
                </h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Bei der Nutzung unserer Website werden verschiedene personenbezogene Daten erhoben. 
                    Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden können.
                  </p>
                  <p>
                    <strong className="text-foreground">Kontaktformular:</strong> Bei Nutzung unseres 
                    Kontaktformulars werden die von Ihnen eingegebenen Daten (Name, E-Mail, Telefon, 
                    Nachricht) an uns übermittelt und gespeichert.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  4. Ihre Rechte
                </h2>
                <div className="text-muted-foreground space-y-4">
                  <p>Sie haben jederzeit das Recht:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Auskunft über Ihre gespeicherten Daten zu erhalten</li>
                    <li>Berichtigung unrichtiger Daten zu verlangen</li>
                    <li>Löschung Ihrer Daten zu verlangen</li>
                    <li>Die Einschränkung der Verarbeitung zu verlangen</li>
                    <li>Widerspruch gegen die Verarbeitung einzulegen</li>
                    <li>Datenübertragbarkeit zu verlangen</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  5. Cookies
                </h2>
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Unsere Website verwendet Cookies. Cookies sind kleine Textdateien, die auf Ihrem 
                    Endgerät gespeichert werden und die Ihr Browser speichert.
                  </p>
                </div>
              </section>

              <div className="pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Hinweis: Dies ist eine Platzhalter-Datenschutzerklärung. Bitte lassen Sie diese 
                  von einem Rechtsexperten an Ihre spezifischen Anforderungen anpassen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Datenschutz;

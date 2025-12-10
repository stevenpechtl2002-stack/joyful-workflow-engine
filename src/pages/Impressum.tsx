import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
const Impressum = () => {
  return <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-8">
              <span className="text-gradient">Impressum</span>
            </h1>
            
            <div className="glass rounded-2xl p-8 space-y-6">
              <section>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  Angaben gemäß § 5 TMG
                </h2>
                <div className="text-muted-foreground space-y-1">
                  <p>NextGen Smart Solutions </p>
                  <p>Musterstraße 123</p>
                  <p>75175 Pforzheim</p>
                  <p>Deutschland</p>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  Kontakt
                </h2>
                <div className="text-muted-foreground space-y-1">
                  <p>Telefon: +49 1520 4540077</p>
                  <p>E-Mail: info@nextgen-smart.de</p>
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  Vertreten durch
                </h2>
                <p className="text-muted-foreground">Max Mustermann, Geschäftsführer</p>
              </section>

              <section>
                
                <div className="text-muted-foreground space-y-1">
                  
                  
                  
                </div>
              </section>

              <section>
                <h2 className="font-display text-xl font-semibold text-foreground mb-3">
                  Umsatzsteuer-ID
                </h2>
                <p className="text-muted-foreground">Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: DE364872078</p>
              </section>

              <div className="pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Hinweis: Dies ist ein Platzhalter-Impressum. Bitte ersetzen Sie diese Angaben durch Ihre tatsächlichen Unternehmensdaten.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>;
};
export default Impressum;
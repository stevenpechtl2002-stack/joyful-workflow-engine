import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Mail, Lock, ArrowRight, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          navigate("/portal");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/portal");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          toast({
            title: "Fehler",
            description: "Die Passwörter stimmen nicht überein.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          toast({
            title: "Fehler",
            description: "Das Passwort muss mindestens 6 Zeichen lang sein.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/portal`,
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Fehler",
              description: "Diese E-Mail-Adresse ist bereits registriert.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Fehler",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Registrierung erfolgreich!",
            description: "Ihr Konto wurde erstellt. Sie werden weitergeleitet...",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Fehler",
              description: "E-Mail oder Passwort ist falsch.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Fehler",
              description: error.message,
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 min-h-[calc(100vh-200px)] flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 glow-primary">
                <Bot className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-2">
                {isSignUp ? (
                  <>Konto <span className="text-gradient">erstellen</span></>
                ) : (
                  <>Willkommen <span className="text-gradient">zurück</span></>
                )}
              </h1>
              <p className="text-muted-foreground">
                {isSignUp 
                  ? "Registrieren Sie sich für Ihren Kundenbereich"
                  : "Melden Sie sich in Ihrem Kundenbereich an"
                }
              </p>
            </div>

            {/* Login/Signup Form */}
            <div className="glass rounded-2xl p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">E-Mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="ihre@email.de"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-secondary border-border focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Passwort</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 bg-secondary border-border focus:border-primary"
                      required
                    />
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-foreground">Passwort bestätigen</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 bg-secondary border-border focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                )}

                {!isSignUp && (
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                      <input type="checkbox" className="rounded border-border bg-secondary" />
                      Angemeldet bleiben
                    </label>
                    <a href="#" className="text-primary hover:underline">
                      Passwort vergessen?
                    </a>
                  </div>
                )}

                <Button 
                  type="submit" 
                  variant="hero" 
                  size="lg" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      {isSignUp ? "Registrieren..." : "Anmelden..."}
                    </>
                  ) : (
                    <>
                      {isSignUp ? (
                        <>
                          Registrieren
                          <UserPlus className="w-5 h-5" />
                        </>
                      ) : (
                        <>
                          Anmelden
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-muted-foreground text-sm">
                  {isSignUp ? (
                    <>
                      Bereits registriert?{" "}
                      <button 
                        onClick={() => setIsSignUp(false)}
                        className="text-primary hover:underline font-medium"
                      >
                        Jetzt anmelden
                      </button>
                    </>
                  ) : (
                    <>
                      Noch kein Konto?{" "}
                      <button 
                        onClick={() => setIsSignUp(true)}
                        className="text-primary hover:underline font-medium"
                      >
                        Jetzt registrieren
                      </button>
                    </>
                  )}
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

export default Login;

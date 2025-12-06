import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  Plus, 
  Calendar, 
  ShoppingCart, 
  MessageSquare, 
  Activity,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Placeholder data
const reservations = [
  { id: 1, name: "Max Mustermann", date: "2024-01-15", time: "19:00", guests: 4, status: "confirmed" },
  { id: 2, name: "Anna Schmidt", date: "2024-01-15", time: "20:30", guests: 2, status: "pending" },
  { id: 3, name: "Thomas Weber", date: "2024-01-16", time: "18:00", guests: 6, status: "confirmed" },
];

const orders = [
  { id: "ORD-001", customer: "Firma ABC", total: "€ 1.250,00", status: "processing", date: "2024-01-14" },
  { id: "ORD-002", customer: "Müller GmbH", total: "€ 890,00", status: "completed", date: "2024-01-14" },
  { id: "ORD-003", customer: "Weber & Co", total: "€ 2.100,00", status: "pending", date: "2024-01-13" },
];

const logs = [
  { id: 1, type: "call", message: "Eingehender Anruf bearbeitet", time: "14:32", status: "success" },
  { id: 2, type: "workflow", message: "Lead-Workflow ausgeführt", time: "14:28", status: "success" },
  { id: 3, type: "reservation", message: "Neue Reservierung erstellt", time: "14:15", status: "success" },
  { id: 4, type: "error", message: "API Timeout bei externem Service", time: "13:45", status: "error" },
];

const Backoffice = () => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Placeholder: Would call /api/n8n/... endpoints
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: "Daten aktualisiert",
      description: "Die neuesten Daten wurden geladen.",
    });
    setIsRefreshing(false);
  };

  const handleNewRequest = () => {
    toast({
      title: "Neue Anfrage",
      description: "Anfrage-Formular wird geöffnet...",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "completed":
      case "success":
        return "bg-green-500/20 text-green-400";
      case "pending":
      case "processing":
        return "bg-yellow-500/20 text-yellow-400";
      case "error":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                <span className="text-gradient">Backoffice</span> Dashboard
              </h1>
              <p className="text-muted-foreground">
                Verwalten Sie Ihre Reservierungen, Bestellungen und KI-Logs.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
              <Button variant="default" onClick={handleNewRequest}>
                <Plus className="w-4 h-4" />
                Neue Anfrage
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Reservierungen heute", value: "12", icon: Calendar, change: "+3" },
              { label: "Offene Bestellungen", value: "8", icon: ShoppingCart, change: "-2" },
              { label: "KI-Anfragen heute", value: "156", icon: MessageSquare, change: "+24" },
              { label: "System Status", value: "Online", icon: Activity, status: "online" },
            ].map((stat, index) => (
              <div key={index} className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  {stat.change && (
                    <span className={`text-xs ${stat.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                      {stat.change}
                    </span>
                  )}
                  {stat.status === "online" && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Aktiv
                    </span>
                  )}
                </div>
                <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reservierungen */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Reservierungen
                </h2>
                <Button variant="ghost" size="sm">
                  Alle anzeigen
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {reservations.map((res) => (
                  <div key={res.id} className="bg-secondary/30 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{res.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {res.date} um {res.time} • {res.guests} Gäste
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(res.status)}`}>
                      {res.status === "confirmed" ? "Bestätigt" : "Ausstehend"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bestellungen */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Bestellungen
                </h2>
                <Button variant="ghost" size="sm">
                  Alle anzeigen
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {orders.map((order) => (
                  <div key={order.id} className="bg-secondary/30 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{order.customer}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.id} • {order.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{order.total}</p>
                      <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                        {order.status === "completed" ? "Abgeschlossen" : order.status === "processing" ? "In Bearbeitung" : "Ausstehend"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KI Logs */}
            <div className="glass rounded-xl p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  KI-Assistenten Logs
                </h2>
                <Button variant="ghost" size="sm">
                  Vollständige Logs
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="bg-secondary/30 rounded-lg p-4 flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="flex-1">
                      <p className="text-foreground">{log.message}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{log.time}</span>
                    <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(log.status)}`}>
                      {log.status === 'success' ? 'Erfolg' : 'Fehler'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* API Info */}
          <div className="mt-8 glass rounded-xl p-6">
            <h3 className="font-display text-lg font-semibold mb-4">API-Endpunkte (n8n Integration)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm">
                <span className="text-primary">GET</span> /api/n8n/reservations
              </div>
              <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm">
                <span className="text-primary">GET</span> /api/n8n/orders
              </div>
              <div className="bg-secondary/30 rounded-lg p-4 font-mono text-sm">
                <span className="text-primary">GET</span> /api/n8n/logs
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Backoffice;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Contact from "./pages/Contact";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import AGB from "./pages/AGB";
import NotFound from "./pages/NotFound";

// Portal Pages
import PortalAuth from "./pages/portal/Auth";
import PortalLayout from "./components/portal/PortalLayout";
import Dashboard from "./pages/portal/Dashboard";
import Calendar from "./pages/portal/Calendar";
import Reservations from "./pages/portal/Reservations";
import Analytics from "./pages/portal/Analytics";
import VoiceAgent from "./pages/portal/VoiceAgent";
import Documents from "./pages/portal/Documents";
import Notifications from "./pages/portal/Notifications";
import Profile from "./pages/portal/Profile";
import Subscriptions from "./pages/portal/Subscriptions";
import Support from "./pages/portal/Support";

// Admin & Sales Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import SalesDashboard from "./pages/sales/SalesDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/kontakt" element={<Contact />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/agb" element={<AGB />} />
            
            {/* Portal Routes */}
            <Route path="/portal/auth" element={<PortalAuth />} />
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="voice-agent" element={<VoiceAgent />} />
              <Route path="documents" element={<Documents />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="support" element={<Support />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Admin Dashboard */}
            <Route path="/admin" element={<AdminDashboard />} />

            {/* Sales Dashboard */}
            <Route path="/sales" element={<SalesDashboard />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

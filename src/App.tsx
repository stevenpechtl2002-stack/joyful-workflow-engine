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
import Appointments from "./pages/portal/Appointments";
import Documents from "./pages/portal/Documents";
import Notifications from "./pages/portal/Notifications";
import Profile from "./pages/portal/Profile";
import Subscriptions from "./pages/portal/Subscriptions";
import Workflows from "./pages/portal/Workflows";
import WorkflowSetup from "./pages/portal/WorkflowSetup";

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
              <Route path="appointments" element={<Appointments />} />
              <Route path="documents" element={<Documents />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="workflows" element={<Workflows />} />
              <Route path="workflow-setup" element={<WorkflowSetup />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

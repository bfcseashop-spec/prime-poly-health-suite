import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";
import OPD from "./pages/OPD";
import Prescriptions from "./pages/Prescriptions";
import Pharmacy from "./pages/Pharmacy";
import Expenses from "./pages/Expenses";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Shell = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Shell><Dashboard /></Shell>} />
              <Route path="/patients" element={<Shell><Patients /></Shell>} />
              <Route path="/patients/:id" element={<Shell><PatientProfile /></Shell>} />
              <Route path="/opd" element={<Shell><OPD /></Shell>} />
              <Route path="/prescriptions" element={<ProtectedRoute roles={["doctor"]}><AppLayout><Prescriptions /></AppLayout></ProtectedRoute>} />
              <Route path="/pharmacy" element={<ProtectedRoute roles={["pharmacist"]}><AppLayout><Pharmacy /></AppLayout></ProtectedRoute>} />
              <Route path="/lab" element={<Shell><ComingSoon title="Laboratory" /></Shell>} />
              <Route path="/xray" element={<Shell><ComingSoon title="X-Ray Department" /></Shell>} />
              <Route path="/ot" element={<Shell><ComingSoon title="Operation Theater" /></Shell>} />
              <Route path="/billing" element={<Shell><ComingSoon title="Billing & Invoices" /></Shell>} />
              <Route path="/expenses" element={<ProtectedRoute roles={["admin","accountant"]}><AppLayout><Expenses /></AppLayout></ProtectedRoute>} />
              <Route path="/reports" element={<Shell><ComingSoon title="Reports & Analytics" /></Shell>} />
              <Route path="/settings" element={<Shell><ComingSoon title="Settings" /></Shell>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

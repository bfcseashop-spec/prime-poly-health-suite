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
import POS from "./pages/POS";
import DueManagement from "./pages/DueManagement";
import Invoices from "./pages/Invoices";
import Expenses from "./pages/Expenses";
import Insurance from "./pages/Insurance";
import Laboratory from "./pages/Laboratory";
import XRay from "./pages/XRay";
import Services from "./pages/Services";
import Medicines from "./pages/Medicines";
import OperationTheater from "./pages/OperationTheater";
import Reports from "./pages/Reports";
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
              <Route path="/pos" element={<ProtectedRoute roles={["admin","pharmacist","receptionist","accountant"]}><AppLayout><POS /></AppLayout></ProtectedRoute>} />
              <Route path="/pharmacy" element={<ProtectedRoute roles={["admin","pharmacist","receptionist","accountant"]}><AppLayout><POS /></AppLayout></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute roles={["admin","accountant","receptionist","pharmacist"]}><AppLayout><Invoices /></AppLayout></ProtectedRoute>} />
              <Route path="/due-management" element={<ProtectedRoute roles={["admin","accountant","receptionist","pharmacist"]}><AppLayout><DueManagement /></AppLayout></ProtectedRoute>} />
              <Route path="/lab" element={<ProtectedRoute roles={["admin","doctor","nurse","lab_tech","receptionist"]}><AppLayout><Laboratory /></AppLayout></ProtectedRoute>} />
              <Route path="/xray" element={<ProtectedRoute roles={["admin","doctor","nurse","lab_tech","receptionist"]}><AppLayout><XRay /></AppLayout></ProtectedRoute>} />
              <Route path="/services" element={<ProtectedRoute roles={["admin","accountant","receptionist","pharmacist","nurse"]}><AppLayout><Services /></AppLayout></ProtectedRoute>} />
              <Route path="/medicines" element={<ProtectedRoute roles={["admin","pharmacist"]}><AppLayout><Medicines /></AppLayout></ProtectedRoute>} />
              <Route path="/ot" element={<ProtectedRoute roles={["admin","doctor","nurse","receptionist"]}><AppLayout><OperationTheater /></AppLayout></ProtectedRoute>} />
              <Route path="/billing" element={<Shell><ComingSoon title="Billing & Invoices" /></Shell>} />
              <Route path="/expenses" element={<ProtectedRoute roles={["admin","accountant"]}><AppLayout><Expenses /></AppLayout></ProtectedRoute>} />
              <Route path="/insurance" element={<ProtectedRoute roles={["admin","accountant","receptionist"]}><AppLayout><Insurance /></AppLayout></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute roles={["admin","accountant"]}><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
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

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BeneficiaryDashboard from "./pages/BeneficiaryDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminShopsPage from "./pages/AdminShopsPage";
import AdminQuotaSettings from "./pages/AdminQuotaSettings";
import ShopkeeperDashboard from "./pages/ShopkeeperDashboard";
import PurchasePage from "./pages/PurchasePage";
import DeliveryTracking from "./pages/DeliveryTracking";
import QuotaPage from "./pages/QuotaPage";
import OrdersPage from "./pages/OrdersPage";
import NotificationsPage from "./pages/NotificationsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Beneficiary */}
            <Route path="/beneficiary" element={<DashboardLayout><BeneficiaryDashboard /></DashboardLayout>} />
            <Route path="/beneficiary/quota" element={<DashboardLayout><QuotaPage /></DashboardLayout>} />
            <Route path="/beneficiary/purchase" element={<DashboardLayout><PurchasePage /></DashboardLayout>} />
            <Route path="/beneficiary/orders" element={<DashboardLayout><OrdersPage /></DashboardLayout>} />
            <Route path="/beneficiary/tracking" element={<DashboardLayout><DeliveryTracking /></DashboardLayout>} />
            <Route path="/beneficiary/notifications" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />

            {/* Shopkeeper */}
            <Route path="/shopkeeper" element={<DashboardLayout><ShopkeeperDashboard /></DashboardLayout>} />
            <Route path="/shopkeeper/stock" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />
            <Route path="/shopkeeper/orders" element={<DashboardLayout><OrdersPage /></DashboardLayout>} />
            <Route path="/shopkeeper/deliveries" element={<DashboardLayout><DeliveryTracking /></DashboardLayout>} />
            <Route path="/shopkeeper/notifications" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />

            {/* Admin */}
            <Route path="/admin" element={<DashboardLayout><AdminDashboard /></DashboardLayout>} />
            <Route path="/admin/users" element={<DashboardLayout><AdminUsersPage /></DashboardLayout>} />
            <Route path="/admin/shops" element={<DashboardLayout><AdminShopsPage /></DashboardLayout>} />
            <Route path="/admin/products" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />
            <Route path="/admin/distribution" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />
            <Route path="/admin/quota" element={<DashboardLayout><AdminQuotaSettings /></DashboardLayout>} />
            <Route path="/admin/notifications" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

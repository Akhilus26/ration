import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ShopRegistration from "./pages/ShopkeeperRegister";
import BeneficiaryDashboard from "./pages/BeneficiaryDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminShopsPage from "./pages/AdminShopsPage";
import AdminQuotaSettings from "./pages/AdminQuotaSettings";
import AdminSettings from "./pages/AdminSettings";
import ShopkeeperDashboard from "./pages/ShopkeeperDashboard";
import ShopkeeperStock from "./pages/ShopkeeperStock";
import ShopkeeperDeliveryBoys from "./pages/ShopkeeperDeliveryBoys";
import ShopkeeperDeliveries from "./pages/ShopkeeperDeliveries";
import ShopkeeperOrders from "./pages/ShopkeeperOrders";
import DeliveryBoyDashboard from "./pages/DeliveryBoyDashboard";
import PurchasePage from "./pages/PurchasePage";
import DeliveryTracking from "./pages/DeliveryTracking";
import QuotaPage from "./pages/QuotaPage";
import OrdersPage from "./pages/OrdersPage";
import NotificationsPage from "./pages/NotificationsPage";
import WalletPage from "./pages/WalletPage";
import ExtraShopsPage from "./pages/ExtraShopsPage";
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
            <Route path="/register/shopkeeper" element={<ShopRegistration />} />

            {/* Beneficiary */}
            <Route path="/beneficiary" element={<DashboardLayout><BeneficiaryDashboard /></DashboardLayout>} />
            <Route path="/beneficiary/quota" element={<DashboardLayout><QuotaPage /></DashboardLayout>} />
            <Route path="/beneficiary/purchase" element={<DashboardLayout><PurchasePage /></DashboardLayout>} />
            <Route path="/beneficiary/orders" element={<DashboardLayout><OrdersPage /></DashboardLayout>} />
            <Route path="/beneficiary/tracking" element={<DashboardLayout><DeliveryTracking /></DashboardLayout>} />
            <Route path="/beneficiary/wallet" element={<DashboardLayout><WalletPage /></DashboardLayout>} />
            <Route path="/beneficiary/extra-shops" element={<DashboardLayout><ExtraShopsPage /></DashboardLayout>} />
            <Route path="/beneficiary/notifications" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />

            {/* Shopkeeper */}
            <Route path="/shopkeeper" element={<DashboardLayout><ShopkeeperDashboard /></DashboardLayout>} />
            <Route path="/shopkeeper/stock" element={<DashboardLayout><ShopkeeperStock /></DashboardLayout>} />
            <Route path="/shopkeeper/delivery-boys" element={<DashboardLayout><ShopkeeperDeliveryBoys /></DashboardLayout>} />
            <Route path="/shopkeeper/delivery-assignment" element={<DashboardLayout><ShopkeeperDeliveries /></DashboardLayout>} />
            <Route path="/shopkeeper/orders" element={<DashboardLayout><ShopkeeperOrders /></DashboardLayout>} />
            <Route path="/shopkeeper/deliveries" element={<DashboardLayout><ShopkeeperDeliveries /></DashboardLayout>} />
            <Route path="/shopkeeper/notifications" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />

            {/* Delivery Boy */}
            <Route path="/delivery-boy" element={<DashboardLayout><DeliveryBoyDashboard /></DashboardLayout>} />
            <Route path="/delivery-boy/active" element={<DashboardLayout><DeliveryBoyDashboard /></DashboardLayout>} />
            <Route path="/delivery-boy/history" element={<DashboardLayout><OrdersPage /></DashboardLayout>} />
            <Route path="/delivery-boy/notifications" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />

            {/* Admin */}
            <Route path="/admin" element={<DashboardLayout><AdminDashboard /></DashboardLayout>} />
            <Route path="/admin/users" element={<DashboardLayout><AdminUsersPage /></DashboardLayout>} />
            <Route path="/admin/shops" element={<DashboardLayout><AdminShopsPage /></DashboardLayout>} />
            <Route path="/admin/products" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />
            <Route path="/admin/distribution" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />
            <Route path="/admin/quota" element={<DashboardLayout><AdminQuotaSettings /></DashboardLayout>} />
            <Route path="/admin/settings" element={<DashboardLayout><AdminSettings /></DashboardLayout>} />
            <Route path="/admin/notifications" element={<DashboardLayout><NotificationsPage /></DashboardLayout>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  ShoppingCart,
  MapPin,
  Bell,
  Package,
  Users,
  BarChart3,
  Settings,
  Truck,
  ClipboardList,
  LogOut,
  Wheat,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const roleMenus = {
  beneficiary: [
    { title: "Dashboard", url: "/beneficiary", icon: LayoutDashboard },
    { title: "My Quota", url: "/beneficiary/quota", icon: ClipboardList },
    { title: "Purchase", url: "/beneficiary/purchase", icon: ShoppingCart },
    { title: "My Orders", url: "/beneficiary/orders", icon: Package },
    { title: "Delivery Tracking", url: "/beneficiary/tracking", icon: MapPin },
    { title: "Notifications", url: "/beneficiary/notifications", icon: Bell },
  ],
  shopkeeper: [
    { title: "Dashboard", url: "/shopkeeper", icon: LayoutDashboard },
    { title: "Stock Management", url: "/shopkeeper/stock", icon: Package },
    { title: "Orders", url: "/shopkeeper/orders", icon: ClipboardList },
    { title: "Deliveries", url: "/shopkeeper/deliveries", icon: Truck },
    { title: "Notifications", url: "/shopkeeper/notifications", icon: Bell },
  ],
  admin: [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Users", url: "/admin/users", icon: Users },
    { title: "Manage Shops", url: "/admin/shops", icon: Package },
    { title: "Distribution", url: "/admin/distribution", icon: BarChart3 },
    { title: "Quota Settings", url: "/admin/quota", icon: Settings },
    { title: "Notifications", url: "/admin/notifications", icon: Bell },
  ],
};

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) {
    navigate("/login");
    return null;
  }

  const items = roleMenus[user.role];
  const roleLabel = user.role === "beneficiary" ? "Beneficiary" : user.role === "shopkeeper" ? "Shopkeeper" : "Admin";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r-0">
          <SidebarContent className="pt-4">
            {/* Logo */}
            <div className="px-4 pb-4 mb-2 border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg gradient-saffron flex items-center justify-center flex-shrink-0">
                  <Wheat className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-sidebar-foreground truncate">Smart Ration</p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">{roleLabel} Panel</p>
                </div>
              </div>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end
                          className="hover:bg-sidebar-accent/50 text-sidebar-foreground/70 transition-colors"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <item.icon className="mr-2.5 h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* User info + logout */}
            <div className="mt-auto px-4 py-4 border-t border-sidebar-border">
              <div className="mb-3">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate">{user.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { logout(); navigate("/login"); }}
                className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-screen">
          {/* Top bar */}
          <header className="h-14 border-b border-border flex items-center px-4 bg-card">
            <SidebarTrigger className="mr-4" />
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              <div className="w-8 h-8 rounded-full gradient-header flex items-center justify-center text-xs font-bold text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;

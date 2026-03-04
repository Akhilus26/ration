import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { sql, type Shop } from "@/lib/db";
import {
  Package,
  Truck,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Store,
  Users,
} from "lucide-react";

const anim = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const ShopkeeperDashboard = () => {
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id && user.role === "shopkeeper") {
      sql.getShopByShopkeeperId(user.id).then((s) => {
        setShop(s || null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  const stats = [
    { label: "Total Stock Items", value: "0", icon: Package, color: "text-primary" },
    { label: "Pending Orders", value: "0", icon: ClipboardList, color: "text-accent" },
    { label: "Active Deliveries", value: "0", icon: Truck, color: "text-indian-green" },
    { label: "Low Stock Alerts", value: "0", icon: AlertTriangle, color: "text-destructive" },
  ];

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shopkeeper Dashboard</h1>
          <p className="text-muted-foreground mt-1">Fair Price Shop management panel</p>
        </div>
        {shop && (
          <div className="bg-secondary/50 p-3 rounded-lg border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Store className="w-5 h-5 text-accent" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground leading-tight">{shop.name}</p>
                <Badge className="bg-emerald-500 text-[10px] h-4">READY</Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {shop.address}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {!shop && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">You are not currently assigned to any shop. Please contact the administrator.</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="show" variants={anim}>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1 text-foreground">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-card h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Orders</CardTitle>
                <Badge variant="outline" className="text-xs">Today</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">No orders yet</p>
                <p className="text-xs mt-1">Orders will appear here once placed for your shop</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Card className="shadow-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Update Stock", icon: Package, url: "/shopkeeper/stock" },
                  { label: "Delivery Boys", icon: Users, url: "/shopkeeper/delivery-boys" },
                  { label: "View Orders", icon: ClipboardList, url: "/shopkeeper/orders" },
                  { label: "Deliveries", icon: Truck, url: "/shopkeeper/deliveries" },
                  { label: "Sales Report", icon: TrendingUp, url: "/shopkeeper/notifications" },
                ].map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2 text-sm hover:bg-secondary/80"
                    onClick={() => window.location.href = action.url}
                  >
                    <action.icon className="w-5 h-5 text-muted-foreground" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ShopkeeperDashboard;

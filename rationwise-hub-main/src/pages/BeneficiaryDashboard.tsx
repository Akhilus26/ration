import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { sql, type Purchase } from "@/lib/db";
import {
  ShoppingCart,
  Package,
  MapPin,
  Bell,
  ArrowRight,
  Wheat,
  Droplets,
  Flame,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const categoryQuotas: Record<string, any> = {
  AAY: { Rice: 20, Wheat: 15, Sugar: 2, Kerosene: 5 },
  PHH: { Rice: 15, Wheat: 10, Sugar: 1, Kerosene: 3 },
  NPHH: { Rice: 10, Wheat: 5, Sugar: 1, Kerosene: 2 },
};

const itemMeta: Record<string, any> = {
  Rice: { icon: Wheat, unit: "kg", price: 3 },
  Wheat: { icon: Wheat, unit: "kg", price: 2 },
  Sugar: { icon: Droplets, unit: "kg", price: 13.5 },
  Kerosene: { icon: Flame, unit: "L", price: 32 },
};

const anim = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const BeneficiaryDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    if (user?.id) {
      sql.getPurchases(user.id).then(setPurchases);
    }
  }, [user]);

  const category = user?.category || "PHH";
  const quotas = categoryQuotas[category];

  const quotaItems = Object.keys(itemMeta).map(name => {
    const meta = itemMeta[name];
    const allocated = quotas[name] || 0;
    const used = purchases
      .filter(p => p.itemName === name)
      .reduce((sum, p) => sum + p.amount, 0);
    return { name, ...meta, allocated, used };
  });

  const totalAllocated = Object.values(quotas).reduce((a: any, b: any) => a + b, 0);
  const totalUsed = quotaItems.reduce((sum, item) => sum + item.used, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, {user?.name || "Beneficiary"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Ration Card: <span className="font-mono text-sm">{user?.rationCardNumber}</span> ·
          Category: <Badge variant="secondary" className="ml-1">{category}</Badge>
        </p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Monthly Quota", value: `${totalAllocated} items`, icon: Package, color: "text-accent" },
          { label: "Purchased", value: `${totalUsed} kg/L`, icon: ShoppingCart, color: "text-indian-green" },
          { label: "Active Orders", value: "0", icon: MapPin, color: "text-primary" },
          { label: "Notifications", value: "0", icon: Bell, color: "text-destructive" },
        ].map((stat, i) => (
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

      {/* Quota Overview */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Monthly Quota</CardTitle>
              <Badge variant="outline" className="text-xs">
                {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {quotaItems.map((item) => {
                const pct = item.allocated > 0 ? (item.used / item.allocated) * 100 : 0;
                return (
                  <div key={item.name} className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.used}/{item.allocated} {item.unit} · ₹{item.price}/{item.unit}
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
            <Button
              variant="outline"
              className="w-full mt-5"
              onClick={() => navigate("/beneficiary/purchase")}
              disabled={totalUsed >= totalAllocated}
            >
              {totalUsed >= totalAllocated ? "Quota Exhausted" : "Purchase Ration"}
              {!(totalUsed >= totalAllocated) && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default BeneficiaryDashboard;

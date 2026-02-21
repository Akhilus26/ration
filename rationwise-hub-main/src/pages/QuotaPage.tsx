import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { sql, type Purchase } from "@/lib/db";
import { Wheat, Droplets, Flame } from "lucide-react";

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

const QuotaPage = () => {
  const { user } = useAuth();
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

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">My Quota</h1>
        <p className="text-muted-foreground mt-1">
          Category: <Badge variant="secondary">{category}</Badge> · Monthly quota allocation
        </p>
      </motion.div>

      <div className="grid gap-4">
        {quotaItems.map((item, i) => {
          const pct = item.allocated > 0 ? (item.used / item.allocated) * 100 : 0;
          const remaining = Math.max(0, item.allocated - item.used);
          return (
            <motion.div key={item.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="shadow-card">
                <CardContent className="py-5 px-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        <span className="text-sm text-muted-foreground">₹{item.price}/{item.unit}</span>
                      </div>
                      <Progress value={pct} className="h-2 mb-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Used: {item.used} {item.unit}</span>
                        <span>Remaining: {remaining} {item.unit}</span>
                        <span>Allocated: {item.allocated} {item.unit}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default QuotaPage;

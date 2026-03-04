import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { sql, type Purchase } from "@/lib/db";
import { Wheat, Droplets, Flame } from "lucide-react";

const itemMeta: Record<string, any> = {
  Rice: { icon: Wheat },
  Wheat: { icon: Wheat },
  Sugar: { icon: Droplets },
  Kerosene: { icon: Flame },
};

const QuotaPage = () => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [allQuotas, setAllQuotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      Promise.all([
        sql.getPurchases(user.id),
        sql.getAllQuotas()
      ]).then(([purchasesData, quotasData]) => {
        setPurchases(purchasesData);
        setAllQuotas(quotasData);
        setLoading(false);
      });
    }
  }, [user]);

  const category = user?.category || "PHH";
  const userQuotas = allQuotas.filter(q => q.category === category);

  const quotaItems = userQuotas.map(q => {
    const meta = itemMeta[q.itemName] || { icon: Wheat };
    const allocated = q.amount;
    const used = purchases
      .filter(p => p.itemName === q.itemName)
      .reduce((sum, p) => sum + p.amount, 0);
    return { name: q.itemName, icon: meta.icon, unit: q.unit, price: q.price, allocated, used };
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

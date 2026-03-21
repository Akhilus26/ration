import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { sql } from "@/lib/db";
import { TrendingUp, Users, ShoppingCart, Truck, CheckCircle2, Clock } from "lucide-react";
import { Loader2 } from "lucide-react";

const anim = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalUsers: 0,
    totalOrders: 0,
    deliveredOrders: 0,
    pendingOrders: 0,
    revenue: 0,
    categories: { AAY: 0, PHH: 0, NPHH: 0 },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const users = await sql.getAllUsers();
        const orders = await sql.getAllOrders();

        const beneficiaries = users.filter((u) => u.role?.toLowerCase() === "beneficiary");
        const cats = {
            AAY: beneficiaries.filter((u: any) => u.category === "AAY").length,
            PHH: beneficiaries.filter((u: any) => u.category === "PHH").length,
            NPHH: beneficiaries.filter((u: any) => u.category === "NPHH").length,
        };
        const delivered = orders.filter((o) => o.status === "completed" || o.deliveryStatus === "delivered").length;
        const pending = orders.filter((o) => o.status === "pending" || o.deliveryStatus === "assigned").length;

        const totalRevenue = orders.reduce((acc, order) => {
          return acc + (order.totalAmount || 0);
        }, 0);

        setData({
          totalUsers: beneficiaries.length,
          totalOrders: orders.length,
          deliveredOrders: delivered,
          pendingOrders: pending,
          revenue: totalRevenue,
          categories: cats,
        });
      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { label: "Total Beneficiaries", value: data.totalUsers.toString(), icon: Users, color: "text-blue-500" },
    { label: "Total Orders", value: data.totalOrders.toString(), icon: ShoppingCart, color: "text-purple-500" },
    { label: "Delivered Orders", value: data.deliveredOrders.toString(), icon: CheckCircle2, color: "text-green-500" },
    { label: "Pending Orders", value: data.pendingOrders.toString(), icon: Clock, color: "text-amber-500" },
    { label: "Total Revenue", value: `₹${data.revenue.toFixed(2)}`, icon: TrendingUp, color: "text-indigo-500" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">System Analytics</h1>
        <p className="text-muted-foreground mt-1">Detailed overview of system distribution and orders</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="show" variants={anim}>
            <Card className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold mt-1 text-foreground">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-card h-full">
            <CardHeader>
              <CardTitle className="text-lg">Beneficiary Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.categories).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <Badge variant="outline" className="font-mono">{cat}</Badge>
                    <span className="text-lg font-bold text-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="shadow-card h-full bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Fulfillment Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-6">
              <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-8 border-primary/20">
                <div className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent animate-spin-slow opacity-20"></div>
                <div className="text-2xl font-bold text-primary">
                  {data.totalOrders > 0 ? Math.round((data.deliveredOrders / data.totalOrders) * 100) : 0}%
                </div>
              </div>
              <p className="mt-6 text-sm text-center text-muted-foreground max-w-xs">
                Percentage of all-time orders that have been successfully completed or delivered.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAnalytics;

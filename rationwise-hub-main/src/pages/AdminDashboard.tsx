import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { sql } from "@/lib/db";
import {
  Users,
  Package,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Wheat,
  IndianRupee,
} from "lucide-react";

const anim = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const AdminDashboard = () => {
  const [counts, setCounts] = useState({
    total: 0,
    AAY: 0,
    PHH: 0,
    NPHH: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      const users = await sql.getAllUsers();
      const beneficiaries = users.filter((u) => u.role === "beneficiary");
      const cats = await sql.getCategoryCounts();
      setCounts({
        total: beneficiaries.length,
        ...cats,
      });
    };
    fetchData();
  }, []);

  const stats = [
    { label: "Total Beneficiaries", value: counts.total.toString(), icon: Users, color: "text-primary" },
    { label: "Active FPS Shops", value: "1", icon: Package, color: "text-accent" },
    { label: "Monthly Distribution", value: "240kg", icon: BarChart3, color: "text-indian-green" },
    { label: "Low Stock Alerts", value: "0", icon: AlertTriangle, color: "text-destructive" },
  ];

  const categoryStats = [
    { name: "AAY", desc: "Antyodaya Anna Yojana", count: counts.AAY.toString() },
    { name: "PHH", desc: "Priority Household", count: counts.PHH.toString() },
    { name: "NPHH", desc: "Non-Priority Household", count: counts.NPHH.toString() },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">System overview and management</p>
      </motion.div>

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
        {/* Category Distribution */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="shadow-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Category-wise Beneficiaries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryStats.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <Badge variant="outline" className="font-mono">{cat.name}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{cat.desc}</p>
                    </div>
                    <span className="text-lg font-bold text-foreground">{cat.count}</span>
                  </div>
                ))}
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
                  { label: "Manage Shops", icon: Package, url: "/admin/shops" },
                  { label: "View Users", icon: Users, url: "/admin/users" },
                  { label: "Analytics", icon: TrendingUp, url: "/admin/distribution" },
                  { label: "Quota Config", icon: Wheat, url: "/admin/quota" },
                  { label: "Stock Report", icon: BarChart3, url: "/admin/distribution" },
                  { label: "Revenue", icon: IndianRupee, url: "/admin/distribution" },
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

export default AdminDashboard;

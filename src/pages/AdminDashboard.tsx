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
  Send,
  Loader2,
  Settings2,
} from "lucide-react";
import emailjs from '@emailjs/browser';
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

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
    activeShops: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      const users = await sql.getAllUsers();
      const beneficiaries = users.filter((u) => u.role === "beneficiary");
      const cats = await sql.getCategoryCounts();
      const shops = await sql.getAllShops();
      setCounts({
        total: beneficiaries.length,
        ...cats,
        activeShops: shops.filter(s => s.status === "ready").length,
      });
    };
    fetchData();
  }, []);

  const { toast } = useToast();
  const [broadcasting, setBroadcasting] = useState(false);

  const sendStockNotifications = async () => {
    setBroadcasting(true);
    try {
      const users = await sql.getAllUsers();
      const beneficiaries = users.filter(u => u.role === "beneficiary");
      const quotas = await sql.getAllQuotas();

      let sentCount = 0;
      for (const beneficiary of beneficiaries) {
        if (!beneficiary.email) continue;

        const beneficiaryQuotas = quotas.filter(q => q.category === beneficiary.category);
        const quotaLines = beneficiaryQuotas.map(q => `- ${q.itemName}: ${q.amount} ${q.unit} @ ₹${q.price}`).join("\n");

        const message = `Dear ${beneficiary.name},\n\nStock for the new distribution cycle has arrived. Your allocated monthly quota is:\n\n${quotaLines}\n\nLogin to the Smart Ration app to place your order.\n\nBest regards,\nSmart Ration Team`;

        // FOR TESTING: Simulation mode
        console.log(`SIMULATION: Sending to ${beneficiary.email}:\n${message}`);

        /*
        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const templateId = import.meta.env.VITE_EMAILJS_STOCK_TEMPLATE_ID; // New template for stock
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        if (serviceId && templateId && publicKey) {
          await emailjs.send(serviceId, templateId, {
            to_email: beneficiary.email,
            to_name: beneficiary.name,
            message: message,
            subject: "New Stock Arrival - Smart Ration"
          }, publicKey);
        }
        */
        sentCount++;
      }

      toast({
        title: "Broadcast Complete",
        description: `Notifications sent to ${sentCount} beneficiaries ${sentCount > 0 ? '(Simulation)' : ''}.`,
      });
      sonnerToast.success(`Successfully notified ${sentCount} beneficiaries`);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Broadcast Failed", description: error.message, variant: "destructive" });
    } finally {
      setBroadcasting(false);
    }
  };

  const stats = [
    { label: "Total Beneficiaries", value: counts.total.toString(), icon: Users, color: "text-primary" },
    { label: "Active FPS Shops", value: counts.activeShops.toString(), icon: Package, color: "text-accent" },
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
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card className="shadow-card">
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
                    { label: "System Settings", icon: Settings2, url: "/admin/settings" },
                    { label: "Stock Report", icon: BarChart3, url: "/admin/distribution" },
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

          {/* Broadcasting */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <Card className="shadow-card border-primary/20 bg-primary/5">
              <CardHeader className="pb-3 text-center">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                  <Send className="w-5 h-5 text-primary" /> Broadcasting
                </CardTitle>
                <p className="text-xs text-muted-foreground">Notify all beneficiaries about stock arrival</p>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full h-12 gradient-saffron text-accent-foreground font-bold shadow-lg"
                  onClick={sendStockNotifications}
                  disabled={broadcasting}
                >
                  {broadcasting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Broadcasting...
                    </>
                  ) : (
                    "Notify Stock Arrival"
                  )}
                </Button>
                <p className="text-[10px] text-center mt-3 text-muted-foreground">
                  This will send an email to all registered beneficiaries with their quota details.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

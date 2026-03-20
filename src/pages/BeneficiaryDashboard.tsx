import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { motion } from "framer-motion";
import { sql, type Purchase, type Shop } from "@/lib/db";
import {
  ShoppingCart,
  Package,
  MapPin,
  Bell,
  ArrowRight,
  Wheat,
  Droplets,
  Flame,
  Store,
  Wallet,
  Navigation,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const itemMeta: Record<string, any> = {
  Rice: { icon: Wheat },
  Wheat: { icon: Wheat },
  Sugar: { icon: Droplets },
  Kerosene: { icon: Flame },
};

const anim = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const BeneficiaryDashboard = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [nearbyShops, setNearbyShops] = useState<Shop[]>([]);
  const [availableRationShops, setAvailableRationShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [allQuotas, setAllQuotas] = useState<any[]>([]);

  const loadBeneficiaryData = async () => {
    if (!user?.id) return null;
    setLoading(true);

    const [purchaseData, shopsInRadiusData, allShopsData, quotasData] = await Promise.all([
      sql.getCurrentMonthPurchases(user.id),
      sql.findShopsByRadius(user.lat || 0, user.lng || 0, 10),
      sql.getAllShops(),
      sql.getAllQuotas()
    ]);

    setPurchases(purchaseData);
    setNearbyShops(shopsInRadiusData.filter(s => s.type === "extra"));
    const filteredRationShops = allShopsData.filter(s => s.type === "ration" && s.status === "ready");
    setAvailableRationShops(filteredRationShops);
    setAllQuotas(quotasData);

    let assignedShop = null;
    if (user.assignedShopId) {
      assignedShop = filteredRationShops.find(s => s.id === user.assignedShopId) || null;
      setCurrentShop(assignedShop);
    } else {
      setCurrentShop(null);
    }
    setLoading(false);
    
    return { purchaseData, quotasData };
  };

  useEffect(() => {
    const fetchDataAndRemind = async () => {
      const data = await loadBeneficiaryData();
      
      // Quota reminder logic
      if (user && data) {
        const { purchaseData, quotasData } = data;
        const now = new Date();
        const day = now.getDate();
        const month = now.getMonth();
        const year = now.getFullYear();

        if (day >= 25) {
          const notifications = await sql.getNotifications(user.id);
          const thisMonthReminder = notifications.find(n => 
            n.type === 'quota' && 
            new Date(n.date).getMonth() === month && 
            new Date(n.date).getFullYear() === year
          );

          if (!thisMonthReminder) {
            const category = user.category || "PHH";
            const userQuotas = quotasData.filter((q: any) => q.category === category);
            
            if (userQuotas.length > 0) {
              const riceQuota = userQuotas.find((q: any) => q.itemName === "Rice");
              const wheatQuota = userQuotas.find((q: any) => q.itemName === "Wheat");
              
              const riceUsed = purchaseData.filter((p: any) => p.itemName === "Rice").reduce((sum: number, p: any) => sum + p.amount, 0);
              const wheatUsed = purchaseData.filter((p: any) => p.itemName === "Wheat").reduce((sum: number, p: any) => sum + p.amount, 0);
              
              const remainingRice = riceQuota ? Math.max(0, riceQuota.amount - riceUsed) : 0;
              const remainingWheat = wheatQuota ? Math.max(0, wheatQuota.amount - wheatUsed) : 0;
              
              const lastDay = new Date(year, month + 1, 0).getDate();
              const message = `this many ${remainingRice} rice, this many ${remainingWheat} wheat are ther tobuy whichwill end on ${lastDay}th`;
              
              await sql.createNotification({
                id: crypto.randomUUID(),
                userId: user.id,
                title: "Quota Reminder",
                message,
                date: now.toISOString(),
                read: false,
                type: 'quota'
              });

              // Simulate email send
              console.log(`Sending email to ${user.email || user.name}: ${message}`);
              sonnerToast.info("Monthly quota reminder sent to your notifications and email.");
            }
          }
        }
      }
    };

    fetchDataAndRemind();
  }, [user]);

  const handleSelectShop = async (shopId: string) => {
    if (!user?.id) return;
    await sql.updateUser(user.id, { assignedShopId: shopId });
    await refreshUser();
    sonnerToast.success("Ration shop assigned successfully");
  };

  const category = user?.category || "PHH";
  const userQuotas = allQuotas.filter(q => q.category === category);

  const quotaItems = userQuotas.map(q => {
    const meta = itemMeta[q.itemName] || { icon: Package };
    const allocated = q.amount;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const used = purchases
      .filter(p => {
        const pDate = new Date(p.date);
        return p.itemName === q.itemName &&
          pDate.getMonth() === currentMonth &&
          pDate.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + p.amount, 0);
    return { name: q.itemName, icon: meta.icon, unit: q.unit, price: q.price, allocated, used };
  });

  const totalAllocated = userQuotas.reduce((sum, q) => sum + q.amount, 0);
  const totalUsed = quotaItems.reduce((sum, item) => sum + item.used, 0);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {user?.name || "Beneficiary"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Ration Card: <span className="font-mono text-sm">{user?.rationCardNumber}</span> ·
            Category: <Badge variant="secondary" className="ml-1">{category}</Badge>
          </p>
        </div>
        {currentShop && (
          <div className="bg-secondary/30 p-3 rounded-lg border border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-foreground leading-tight truncate">{currentShop.name}</p>
                <Badge variant={sql.isShopOpen(currentShop) ? "secondary" : "destructive"} className={`text-[7px] px-1 h-3 font-black ${sql.isShopOpen(currentShop) ? "bg-indian-green/20 text-indian-green border-indian-green/20" : ""}`}>
                  {sql.isShopOpen(currentShop) ? "OPEN" : "CLOSED"}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-2.5 h-2.5" /> {currentShop.address}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[8px] h-3.5 border-primary/20 bg-primary/5 text-primary">
                  <Clock className="w-2 h-2 mr-1" /> {currentShop.openingTime || "09:00"} - {currentShop.closingTime || "17:00"}
                </Badge>
                {currentShop.lunchTime && (
                  <Badge variant="outline" className="text-[8px] h-3.5 border-accent/20 bg-accent/5 text-accent">
                    Lunch: {currentShop.lunchTime}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 ml-1" onClick={() => setCurrentShop(null)}>
              Change
            </Button>
          </div>
        )}
      </motion.div>

      {/* Shop Selection if NO assigned shop OR user clicked Change */}
      {(!user?.assignedShopId || !currentShop) && availableRationShops.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3 text-center">
              <CardTitle className="text-lg">Select Your Ration Shop</CardTitle>
              <p className="text-sm text-muted-foreground">Available shops within 10km of your location. Please select one to proceed.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {availableRationShops.map(s => {
                  const isShopOpen = sql.isShopOpen(s);

                  return (
                    <Card key={s.id} className="hover:border-primary cursor-pointer transition-all border-dashed" onClick={() => handleSelectShop(s.id)}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Store className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm truncate">{s.name}</p>
                            <Badge variant={isShopOpen ? "secondary" : "destructive"} className={`text-[7px] px-1 h-3 font-black ${isShopOpen ? "bg-indian-green/20 text-indian-green border-indian-green/20" : ""}`}>
                              {isShopOpen ? "OPEN" : "CLOSED"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{s.address}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-[8px] h-3.5 border-primary/20 bg-primary/5 text-primary">
                              {s.openingTime || "09:00"} - {s.closingTime || "17:00"}
                            </Badge>
                            {s.lunchTime && (
                              <Badge variant="outline" className="text-[8px] h-3.5 border-accent/20 bg-accent/5 text-accent">
                                Lunch: {s.lunchTime}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[8px] h-3.5 border-muted bg-muted/20">
                              {(s as any).distance} km
                            </Badge>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Monthly Quota", value: `${totalAllocated} items`, icon: Package, color: "text-accent" },
          { label: "Purchased", value: `${totalUsed} kg/L`, icon: ShoppingCart, color: "text-indian-green" },
          { label: "Wallet Balance", value: `₹${(user?.balance || 0).toFixed(2)}`, icon: Wallet, color: "text-amber-500", onClick: () => navigate("/beneficiary/wallet") },
          { label: "Active Orders", value: "0", icon: MapPin, color: "text-primary" },
          { label: "Notifications", value: "0", icon: Bell, color: "text-destructive" },
        ].map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="show" variants={anim}>
            <Card
              className={`shadow-card hover:shadow-card-hover transition-shadow ${stat.onClick ? "cursor-pointer" : ""}`}
              onClick={stat.onClick}
            >
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

      {/* Nearby Stores */}
      {nearbyShops.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Store className="w-5 h-5 text-indian-green" /> Nearby Local Stores
            </h2>
            <span className="text-xs text-muted-foreground">Low-rate items in your area</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbyShops.map((shop) => (
              <Card key={shop.id} className="shadow-card border-indian-green/10 bg-indian-green/5">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-indian-green/20 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-indian-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{shop.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-indian-green" /> {shop.address}
                    </p>
                    <p className="text-[10px] font-bold text-indian-green mt-1 flex items-center gap-1">
                      <Navigation className="w-2.5 h-2.5" /> {(shop as any).distance} km away
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px] bg-indian-green/10 text-indian-green border-0 uppercase">
                        {shop.type === 'extra' ? 'Low Rate' : 'Ration'}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] py-0" onClick={() => navigate(`/beneficiary/purchase?shop=${shop.id}`)}>
                        Browse
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default BeneficiaryDashboard;

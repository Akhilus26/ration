import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Package, Truck, CheckCircle2, Clock, MapPin, IndianRupee } from "lucide-react";
import { sql, type Order } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      sql.getUserOrders(user.id).then(data => {
        setOrders(data || []);
        setLoading(false);
      });
    }
  }, [user]);

  const getStatusConfig = (order: Order) => {
    const status = order.deliveryStatus || order.status;
    switch (status) {
      case "pending": return { label: "Processing", icon: Clock, color: "text-amber-500 bg-amber-50 border-amber-200" };
      case "packed": return { label: "Packed", icon: Package, color: "text-blue-500 bg-blue-50 border-blue-200" };
      case "assigned": return { label: "Assigned", icon: Truck, color: "text-indigo-500 bg-indigo-50 border-indigo-200" };
      case "out_for_delivery": return { label: "Out for Delivery", icon: Truck, color: "text-purple-500 bg-purple-50 border-purple-200" };
      case "delivered": return { label: "Delivered", icon: CheckCircle2, color: "text-green-500 bg-green-50 border-green-200" };
      case "completed": return { label: "Completed", icon: CheckCircle2, color: "text-green-500 bg-green-50 border-green-200" };
      default: return { label: status, icon: Clock, color: "text-muted-foreground bg-secondary border-border" };
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
        <p className="text-muted-foreground mt-1">Track your ration purchases and deliveries</p>
      </motion.div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading your orders...</div>
      ) : orders.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Package className="w-12 h-12 mb-4 opacity-40" />
              <p className="text-base font-medium">No orders yet</p>
              <p className="text-sm mt-1">Your purchase history will appear here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order, idx) => {
            const config = getStatusConfig(order);
            const StatusIcon = config.icon;
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="shadow-card hover:shadow-card-hover transition-shadow overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="flex-1 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground">ID: {order.id.slice(0, 8)}</span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(order.date), "PPP p")}</span>
                        </div>
                        <Badge className={`${config.color} border flex items-center gap-1 py-0.5 shadow-none`}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-foreground line-clamp-1">{order.items}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          {order.deliveryType === "delivery" ? "Home Delivery" : "Store Pickup"}
                        </p>
                      </div>

                      {order.address && (
                        <div className="flex items-start gap-2 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{order.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="w-full sm:w-32 bg-secondary/30 p-5 flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l">
                      <p className="text-xs text-muted-foreground">Total Paid</p>
                      <p className="text-xl font-black text-foreground">₹{order.totalAmount?.toFixed(1) || "0.0"}</p>
                      {(order.deliveryCharge || 0) > 0 && (
                        <p className="text-[9px] text-muted-foreground mt-1 font-medium">Incl. ₹{order.deliveryCharge} fee</p>
                      )}
                      {(order.tipAmount || 0) > 0 && (
                        <p className="text-[9px] text-indian-green mt-0.5 font-bold">+ ₹{order.tipAmount} tip</p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;

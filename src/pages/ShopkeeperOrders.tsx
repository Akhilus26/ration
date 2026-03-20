import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { sql, Order, Shop } from "@/lib/db";
import { motion } from "framer-motion";
import { Package, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ShopkeeperOrders = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [shop, setShop] = useState<Shop | null>(null);
    const [view, setView] = useState<"pending" | "history">("pending");

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        const s = await sql.getShopByShopkeeperId(user!.id);
        if (s) {
            setShop(s);
            const allOrders = await sql.getOrdersByShop(s.id);
            
            let filteredOrders = [];
            if (view === "pending") {
                filteredOrders = allOrders
                    .filter(o => o.status === "pending" && o.deliveryType === "delivery")
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            } else {
                // History: packed or completed
                filteredOrders = allOrders
                    .filter(o => (o.status === "packed" || o.status === "completed") && o.deliveryType === "delivery")
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            }
            setOrders(filteredOrders);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (shop) loadData();
    }, [view]);

    const handlePack = async (orderId: string) => {
        try {
            await sql.updateOrderStatus(orderId, "packed");
            toast.success("Order marked as packed. It can now be assigned for delivery.");
            loadData();
        } catch (error) {
            toast.error("Failed to update order status");
        }
    };

    if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    return (
        <div className="space-y-6 max-w-5xl">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Manage Orders</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Review and pack orders for delivery (FIFO Order)</p>
                </div>
                <div className="flex bg-secondary/30 p-1 rounded-lg border border-border">
                    <Button 
                        variant={view === "pending" ? "secondary" : "ghost"} 
                        size="sm" 
                        className="h-8 px-3 text-xs"
                        onClick={() => setView("pending")}
                    >
                        Pending
                    </Button>
                    <Button 
                        variant={view === "history" ? "secondary" : "ghost"} 
                        size="sm" 
                        className="h-8 px-3 text-xs"
                        onClick={() => setView("history")}
                    >
                        History
                    </Button>
                </div>
            </motion.div>

            <div className="grid gap-4">
                {orders.length === 0 ? (
                    <Card className="py-12 text-center text-muted-foreground border-dashed">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>{view === "pending" ? "No new delivery orders to pack" : "No order history found"}</p>
                    </Card>
                ) : (
                    orders.map((order) => (
                        <Card key={order.id} className="shadow-sm overflow-hidden border-l-4 border-l-primary">
                            <CardContent className="p-5">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] font-mono">#{order.id.slice(0, 8)}</Badge>
                                            <Badge className={
                                                order.status === "pending" ? "bg-amber-500" :
                                                order.status === "packed" ? "bg-blue-500" :
                                                "bg-green-500"
                                            }>
                                                {order.status.toUpperCase()}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(order.date).toLocaleString()}
                                            </span>
                                        </div>

                                        <div>
                                            <p className="text-sm font-bold text-foreground mb-1">Items to Pack:</p>
                                            <p className="text-xs text-muted-foreground bg-secondary/20 p-3 rounded-lg border border-dashed border-primary/20">
                                                {order.items}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <Package className="w-3 h-3" />
                                            <span>Address: {order.address}</span>
                                        </div>
                                    </div>

                                    {order.status === "pending" && (
                                        <div className="md:w-48 flex flex-col justify-center">
                                            <Button
                                                onClick={() => handlePack(order.id)}
                                                className="w-full bg-indian-green hover:bg-indian-green/90 text-white font-bold h-12"
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                MARK AS PACKED
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default ShopkeeperOrders;

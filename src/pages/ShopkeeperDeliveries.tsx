import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { sql, Order, User, Shop, db } from "@/lib/db";
import { motion } from "framer-motion";
import { Truck, MapPin, Package, Clock, User as UserIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ShopkeeperDeliveries = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [deliveryBoys, setDeliveryBoys] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [shop, setShop] = useState<Shop | null>(null);

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
            // Fetch orders for this shop that are packed and require delivery
            const allOrders = await sql.getOrdersByShop(s.id);
            const deliveryOrders = allOrders.filter(o =>
                o.deliveryType === "delivery" &&
                o.status === "packed" &&
                o.deliveryStatus !== "delivered"
            );
            setOrders(deliveryOrders);

            // Fetch delivery boys
            const boys = await sql.getDeliveryBoysByShop(s.id);
            setDeliveryBoys(boys);
        }
        setLoading(false);
    };

    const handleAssign = async (orderId: string, deliveryBoyId: string) => {
        try {
            await sql.assignOrderToDeliveryBoy(orderId, deliveryBoyId);
            toast.success("Order assigned to delivery boy");
            loadData();
        } catch (error) {
            toast.error("Failed to assign order");
        }
    };

    if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    return (
        <div className="space-y-6 max-w-5xl">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl font-bold text-foreground">Delivery Assignments</h1>
                <p className="text-muted-foreground mt-1">Assign orders to your delivery personnel</p>
            </motion.div>

            <div className="grid gap-4">
                {orders.length === 0 ? (
                    <Card className="py-12 text-center text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No delivery orders pending</p>
                    </Card>
                ) : (
                    orders.map((order) => (
                        <Card key={order.id} className="shadow-sm overflow-hidden border-l-4 border-l-accent">
                            <CardContent className="p-5">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] font-mono">#{order.id.slice(0, 8)}</Badge>
                                            <Badge className={order.deliveryStatus === "assigned" ? "bg-blue-500" : "bg-amber-500"}>
                                                {order.deliveryStatus?.toUpperCase() || "PENDING"}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(order.date).toLocaleString()}
                                            </span>
                                        </div>

                                        <div>
                                            <p className="text-sm font-bold text-foreground mb-1">Items:</p>
                                            <p className="text-xs text-muted-foreground">{order.items}</p>
                                        </div>

                                        <div className="flex items-start gap-2 bg-secondary/30 p-2 rounded-md">
                                            <MapPin className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Delivery Address</p>
                                                <p className="text-xs">{order.address}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:w-64 border-l pl-4 flex flex-col justify-center">
                                        {order.deliveryStatus === "assigned" ? (
                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-muted-foreground">Assigned To:</p>
                                                <div className="flex items-center gap-2 p-2 rounded bg-accent/5 border border-accent/20">
                                                    <UserIcon className="w-4 h-4 text-accent" />
                                                    <p className="text-sm font-medium">
                                                        {deliveryBoys.find(b => b.id === order.deliveryBoyId)?.name || "Unknown"}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full text-[10px] h-7"
                                                    onClick={() => handleAssign(order.id, "")}
                                                >
                                                    Change Assignment
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-xs font-bold text-muted-foreground text-center">Assign Delivery Boy</p>
                                                {deliveryBoys.length > 0 ? (
                                                    <div className="grid gap-2">
                                                        {deliveryBoys.map(boy => (
                                                            <Button
                                                                key={boy.id}
                                                                variant="outline"
                                                                size="sm"
                                                                className="justify-start text-xs h-9 hover:border-accent hover:bg-accent/5"
                                                                onClick={() => handleAssign(order.id, boy.id)}
                                                            >
                                                                <Truck className="w-3 h-3 mr-2 text-accent" />
                                                                {boy.name}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-center text-destructive">No delivery boys available. Register them in the Personnel tab.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default ShopkeeperDeliveries;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { sql, Order, User, Shop, db } from "@/lib/db";
import { getDeliverySlot, clusterOrders, optimizeRoute } from "@/lib/deliveryLogic";
import { motion } from "framer-motion";
import { Truck, MapPin, Package, Clock, User as UserIcon, Loader2, Zap, LayoutGrid, List, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ShopkeeperDeliveries = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [deliveryBoys, setDeliveryBoys] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [shop, setShop] = useState<Shop | null>(null);
    const [viewMode, setViewMode] = useState<"batches" | "list">("batches");

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
            const deliveryOrders = allOrders.filter(o =>
                o.deliveryType === "delivery" &&
                o.status === "packed" &&
                o.deliveryStatus !== "delivered"
            );
            setOrders(deliveryOrders);

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

    const handleSmartDispatch = async (slotOrders: Order[]) => {
        if (deliveryBoys.length === 0) {
            toast.error("No delivery boys available for dispatch");
            return;
        }

        try {
            // Geographic split between boys
            const clusters = clusterOrders(slotOrders, deliveryBoys.length);
            
            for (let i = 0; i < clusters.length; i++) {
                const boy = deliveryBoys[i];
                const cluster = clusters[i];
                if (!boy || cluster.length === 0) continue;

                // Optimize route for this cluster
                const optimized = optimizeRoute(cluster, { lat: shop!.lat, lng: shop!.lng });
                
                // Assign in sequence (this is simplified as we just assign the ID, 
                // but the order is maintained in the boy's dashboard)
                for (const order of optimized) {
                    await sql.assignOrderToDeliveryBoy(order.id, boy.id);
                }
            }
            toast.success("Smart Dispatch completed! Orders grouped by area and assigned.");
            loadData();
        } catch (error) {
            toast.error("Failed to perform smart dispatch");
        }
    };

    // Group orders by hourly slots
    const orderBatches: Record<string, Order[]> = {};
    orders.forEach(order => {
        if (order.deliveryStatus === "assigned") return; // Only batch unassigned
        const slot = getDeliverySlot(order.date);
        const slotKey = `${slot.start} - ${slot.end}`;
        if (!orderBatches[slotKey]) orderBatches[slotKey] = [];
        orderBatches[slotKey].push(order);
    });

    if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    return (
        <div className="space-y-6 max-w-5xl">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-foreground font-display">Delivery Management</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Efficient dispatching using hourly batching and smart routing</p>
                </div>
                <div className="flex bg-secondary/30 p-1 rounded-lg border border-border">
                    <Button 
                        variant={viewMode === "batches" ? "secondary" : "ghost"} 
                        size="sm" 
                        className="h-8 px-3 text-xs"
                        onClick={() => setViewMode("batches")}
                    >
                        <LayoutGrid className="w-3.5 h-3.5 mr-1" /> Batches
                    </Button>
                    <Button 
                        variant={viewMode === "list" ? "secondary" : "ghost"} 
                        size="sm" 
                        className="h-8 px-3 text-xs"
                        onClick={() => setViewMode("list")}
                    >
                        <List className="w-3.5 h-3.5 mr-1" /> All Packed
                    </Button>
                </div>
            </motion.div>

            {viewMode === "batches" ? (
                <div className="space-y-8">
                    {Object.keys(orderBatches).length === 0 ? (
                        <Card className="py-16 text-center text-muted-foreground border-dashed">
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No batches ready for dispatch</p>
                        </Card>
                    ) : (
                        Object.entries(orderBatches).map(([slot, batchOrders]) => (
                            <div key={slot} className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                                        <Clock className="w-4 h-4" />
                                        Window: {parseInt(slot.split(":")[0])-1}:00 - {slot.split(":")[0]} (Delivery Slot) 
                                        <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none text-[10px]">
                                            {batchOrders.length} Orders
                                        </Badge>
                                    </h3>
                                    <Button 
                                        size="sm" 
                                        className="h-8 gradient-saffron text-xs font-bold"
                                        onClick={() => handleSmartDispatch(batchOrders)}
                                    >
                                        <Zap className="w-3.5 h-3.5 mr-1 text-white fill-white" />
                                        SMART DISPATCH
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {batchOrders.map(order => (
                                        <Card key={order.id} className="shadow-sm border-l-2 border-primary">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <Badge variant="outline" className="text-[10px] font-mono">#{order.id.slice(0, 8)}</Badge>
                                                    <span className="text-[10px] text-muted-foreground">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                                    <p className="text-[10px] line-clamp-2 leading-relaxed">{order.address}</p>
                                                </div>
                                                <div className="pt-2 border-t">
                                                <div className="pt-2 border-t text-center">
                                                    {deliveryBoys.length === 0 ? (
                                                        <p className="text-[9px] text-destructive">No boys available</p>
                                                    ) : deliveryBoys.length === 1 ? (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="w-full h-8 text-[10px] bg-accent/5 hover:bg-accent/10 border-accent/20"
                                                            onClick={() => handleAssign(order.id, deliveryBoys[0].id)}
                                                        >
                                                            Assign to {deliveryBoys[0].name.split(' ')[0]}
                                                        </Button>
                                                    ) : (
                                                        <select 
                                                            className="w-full text-[10px] bg-secondary/50 border rounded h-8 px-2 outline-none"
                                                            onChange={(e) => handleAssign(order.id, e.target.value)}
                                                            defaultValue=""
                                                        >
                                                            <option value="" disabled>Select Delivery Boy...</option>
                                                            {deliveryBoys.map(boy => (
                                                                <option key={boy.id} value={boy.id}>{boy.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
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
                                                <p className="text-xs text-muted-foreground leading-relaxed">{order.items}</p>
                                            </div>

                                            <div className="flex items-start gap-2 bg-secondary/30 p-3 rounded-xl border border-border/50">
                                                <MapPin className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                                                <p className="text-xs">{order.address}</p>
                                            </div>
                                        </div>

                                        <div className="md:w-64 md:border-l md:pl-4 flex flex-col justify-center">
                                            {order.deliveryStatus === "assigned" ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/5 border border-accent/20">
                                                        <UserIcon className="w-4 h-4 text-accent" />
                                                        <p className="text-sm font-semibold">
                                                            {deliveryBoys.find(b => b.id === order.deliveryBoyId)?.name || "Delivery Partner"}
                                                        </p>
                                                    </div>
                                                    <p className="text-[9px] text-center text-muted-foreground italic">Assignment is final once dispatched</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-bold text-muted-foreground text-center uppercase tracking-wider">Assign Delivery Boy</p>
                                                    {deliveryBoys.length === 0 ? (
                                                        <p className="text-[10px] text-center text-destructive bg-destructive/5 p-3 rounded-lg border border-destructive/10">No delivery boys available. Register them in the Personnel tab.</p>
                                                    ) : deliveryBoys.length === 1 ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full justify-start text-[10px] h-10 border-accent/40 bg-accent/5 hover:bg-accent/10 rounded-xl"
                                                            onClick={() => handleAssign(order.id, deliveryBoys[0].id)}
                                                        >
                                                            <Truck className="w-3.5 h-3.5 mr-2 text-accent" />
                                                            Assign to {deliveryBoys[0].name}
                                                        </Button>
                                                    ) : (
                                                        <div className="grid gap-2">
                                                            {deliveryBoys.map(boy => (
                                                                <Button
                                                                    key={boy.id}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="justify-start text-[10px] h-10 hover:border-accent hover:bg-accent/5 rounded-xl"
                                                                    onClick={() => handleAssign(order.id, boy.id)}
                                                                >
                                                                    <Truck className="w-3.5 h-3.5 mr-2 text-accent" />
                                                                    {boy.name}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full text-[10px] h-8 mt-2 text-destructive hover:bg-destructive/10"
                                                        onClick={() => {
                                                            const reason = window.prompt("Reason for cancellation?");
                                                            if (reason) {
                                                                sql.cancelOrder(order.id, reason, "shopkeeper").then(() => loadData());
                                                            }
                                                        }}
                                                    >
                                                        Cancel Order
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ShopkeeperDeliveries;

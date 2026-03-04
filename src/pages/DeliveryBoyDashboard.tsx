import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { sql, Order, Shop, db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, MapPin, Package, Navigation, CheckCircle2, Clock, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

// Haversine formula to calculate distance between two points in km
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const DeliveryBoyDashboard = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [shop, setShop] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);
    const [route, setRoute] = useState<Order[]>([]);
    const [isReady, setIsReady] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        if (user?.assignedShopId) {
            const s = await sql.getShopById(user.assignedShopId);
            setShop(s || null);

            const assignedOrders = await sql.getAssignedOrders(user.id);

            // 1-hour shift logic: 
            // Shop 9-7 means Delivery 10-8. 
            // Only show orders placed at least 1 hour before the current hour slot.
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

            const activeOrders = assignedOrders.filter(o => {
                if (o.status === "completed") return false;

                // If shop has hours, check delivery shift
                if (s?.openingTime && s?.closingTime) {
                    const [shopH] = s.openingTime.split(":").map(Number);
                    const [shopCloseH] = s.closingTime.split(":").map(Number);

                    const deliveryStartH = shopH + 1;
                    const deliveryEndH = shopCloseH + 1;

                    // Outside of delivery shift
                    if (currentHour < deliveryStartH || currentHour >= deliveryEndH) return false;

                    // Within shift, only show orders placed before the start of the current hour
                    const orderDate = new Date(o.date);
                    const orderH = orderDate.getHours();

                    // Specific requirement: 9-10am orders delivered at 10am+
                    // So if it's 10:30, orderH must be < 10
                    if (orderH >= currentHour) return false;
                }

                return true;
            });

            setOrders(activeOrders);

            if (s && activeOrders.length > 0) {
                calculateRoute(s, activeOrders);
            }
        }
        setLoading(false);
    };

    const calculateRoute = (shopInfo: Shop, pendingOrders: Order[]) => {
        let currentLat = shopInfo.lat;
        let currentLng = shopInfo.lng;
        const remaining = [...pendingOrders];
        const optimizedRoute: Order[] = [];

        while (remaining.length > 0) {
            let nearestIdx = 0;
            let minDistance = Infinity;

            for (let i = 0; i < remaining.length; i++) {
                const dist = getDistance(
                    currentLat,
                    currentLng,
                    remaining[i].lat || 0,
                    remaining[i].lng || 0
                );
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestIdx = i;
                }
            }

            const nextOrder = remaining.splice(nearestIdx, 1)[0];
            optimizedRoute.push(nextOrder);
            currentLat = nextOrder.lat || 0;
            currentLng = nextOrder.lng || 0;
        }

        setRoute(optimizedRoute);
    };

    useEffect(() => {
        if (isReady && mapRef.current && !mapInstance.current && shop && route.length > 0) {
            initMap();
        }
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [isReady, route, shop]);

    const initMap = async () => {
        const L = await import("leaflet");
        import("leaflet/dist/leaflet.css");

        // Fix marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
            iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        const map = L.map(mapRef.current!).setView([shop!.lat, shop!.lng], 13);
        mapInstance.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        // Shop marker
        L.marker([shop!.lat, shop!.lng])
            .addTo(map)
            .bindPopup(`<b>${shop!.name} (Start)</b>`)
            .openPopup();

        const points: [number, number][] = [[shop!.lat, shop!.lng]];

        // Delivery points
        route.forEach((order, idx) => {
            if (order.lat && order.lng) {
                points.push([order.lat, order.lng]);
                L.marker([order.lat, order.lng])
                    .addTo(map)
                    .bindPopup(`<b>Stop ${idx + 1}</b><br>${order.address}`);
            }
        });

        // Route line
        L.polyline(points, { color: "hsl(220, 55%, 18%)", weight: 3, dashArray: "8,8" }).addTo(map);

        // Fit bounds
        if (points.length > 1) {
            map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
        }
    };

    const updateStatus = async (orderId: string, status: "out_for_delivery" | "delivered") => {
        try {
            if (status === "delivered") {
                await sql.updateOrderStatus(orderId, "completed", "delivered" as any);
                toast.success("Order marked as delivered");
            } else {
                await sql.updateOrderStatus(orderId, "pending", "out_for_delivery" as any);
                toast.info("Order is now out for delivery");
            }
            loadData();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Delivery Partner Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Manage your delivery sequence optimally</p>
                </div>
                {shop && (
                    <Badge variant="outline" className="flex items-center gap-1.5 py-1.5 px-3">
                        <MapPin className="w-3.5 h-3.5 text-accent" />
                        <span className="font-bold">{shop.name}</span>
                    </Badge>
                )}
            </motion.div>

            {route.length === 0 ? (
                <Card className="py-16 text-center border-dashed">
                    <CardContent>
                        <Truck className="w-16 h-16 mx-auto mb-4 opacity-20 text-primary" />
                        <h3 className="text-lg font-bold">No Pending Deliveries</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                            You don't have any assigned orders at the moment. New assignments will appear here.
                        </p>
                    </CardContent>
                </Card>
            ) : !isReady ? (
                <Card className="bg-primary/5 border-primary/20 overflow-hidden">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                            <Package className="w-10 h-10 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold">Ready to start?</h2>
                            <p className="text-muted-foreground">You have {route.length} orders assigned. Click below to view your roadmap and start delivering.</p>
                        </div>
                        <div className="flex flex-col gap-3 max-w-xs mx-auto">
                            <Button size="lg" className="gradient-saffron text-accent-foreground font-bold h-14" onClick={() => setIsReady(true)}>
                                READY FOR DELIVERY
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="shadow-card overflow-hidden h-[500px]">
                            <div ref={mapRef} className="w-full h-full z-0" />
                        </Card>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">
                                <Navigation className="w-4 h-4" />
                                Delivery Roadmap
                            </div>

                            <div className="space-y-4">
                                {route.map((order, index) => {
                                    const distance = index === 0
                                        ? getDistance(shop?.lat || 0, shop?.lng || 0, order.lat || 0, order.lng || 0)
                                        : getDistance(route[index - 1].lat || 0, route[index - 1].lng || 0, order.lat || 0, order.lng || 0);

                                    const isNext = index === 0 || route[index - 1].deliveryStatus === 'delivered';
                                    const isCurrent = order.deliveryStatus === 'out_for_delivery';

                                    return (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                        >
                                            <Card className={`overflow-hidden border-l-4 ${isCurrent ? 'border-l-blue-500 bg-blue-50/30' : isNext ? 'border-l-primary' : 'border-l-muted opacity-60'}`}>
                                                <CardContent className="p-0">
                                                    <div className="flex flex-col sm:flex-row">
                                                        <div className="p-5 flex-1 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${isNext || isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                                        {index + 1}
                                                                    </div>
                                                                    <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                                                                </div>
                                                                <Badge className={order.deliveryStatus === 'out_for_delivery' ? 'bg-blue-500' : 'bg-amber-500'}>
                                                                    {order.deliveryStatus?.replace('_', ' ').toUpperCase() || "PENDING"}
                                                                </Badge>
                                                            </div>

                                                            <div className="flex items-start gap-3">
                                                                <MapPin className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
                                                                <div>
                                                                    <p className="text-sm font-medium leading-normal">{order.address}</p>
                                                                    <p className="text-[10px] text-muted-foreground font-bold mt-1">
                                                                        APPROX. {distance.toFixed(1)} KM FROM {index === 0 ? 'SHOP' : 'PREVIOUS STOP'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="bg-muted/30 p-4 sm:w-48 flex flex-col justify-center gap-2 border-t sm:border-t-0 sm:border-l">
                                                            {order.deliveryStatus !== 'out_for_delivery' ? (
                                                                <Button
                                                                    className="w-full h-12 gradient-saffron text-accent-foreground font-bold"
                                                                    onClick={() => updateStatus(order.id, "out_for_delivery")}
                                                                    disabled={!isNext}
                                                                >
                                                                    START DELIVERY
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    className="w-full h-12 bg-indian-green hover:bg-indian-green/90 text-white font-bold"
                                                                    onClick={() => updateStatus(order.id, "delivered")}
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                                                    MARK DONE
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <Card className="shadow-card sticky top-6">
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-lg">Delivery Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Total Stops</span>
                                    <span className="font-bold">{route.length}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Completed</span>
                                    <span className="font-bold">{route.filter(o => o.deliveryStatus === 'delivered').length}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Remaining</span>
                                    <span className="font-bold text-primary">{route.filter(o => o.deliveryStatus !== 'delivered').length}</span>
                                </div>
                                <div className="pt-4 border-t">
                                    <Button variant="outline" className="w-full" onClick={() => setIsReady(false)}>
                                        Pause / Exit View
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryBoyDashboard;

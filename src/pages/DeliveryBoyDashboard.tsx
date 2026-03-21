import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { sql, Order, Shop, db, calculateDistance } from "@/lib/db";
import { optimizeRoute, getDeliverySlot } from "@/lib/deliveryLogic";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, MapPin, Package, Navigation, CheckCircle2, Clock, Loader2, ArrowRight, IndianRupee, ClipboardList, History as HistoryIcon, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

const DeliveryBoyDashboard = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [shop, setShop] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);
    const [route, setRoute] = useState<Order[]>([]);
    const [isReady, setIsReady] = useState(false);
    const [isLunch, setIsLunch] = useState(false);
    const [view, setView] = useState<"active" | "history">("active");
    const [allAssignedOrders, setAllAssignedOrders] = useState<Order[]>([]);
    const [timeLeft, setTimeLeft] = useState<{ m: number, s: number } | null>(null);
    const location = useLocation();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    useEffect(() => {
        if (location.pathname.includes("/history")) setView("history");
        else setView("active");
    }, [location]);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            setTimeLeft({ m: 59 - minutes, s: 59 - seconds });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (user?.id) {
            loadData();

            // Real-time location tracking
            let watcher: number | null = null;
            if ("geolocation" in navigator) {
                watcher = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        sql.updateUserLocation(user.id, latitude, longitude);
                    },
                    (error) => console.error("Location tracking error:", error),
                    { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
                );
            }

            return () => {
                if (watcher !== null) navigator.geolocation.clearWatch(watcher);
            };
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        if (user?.assignedShopId) {
            const s = await sql.getShopById(user.assignedShopId);
            setShop(s || null);

            const assignedOrders = await sql.getAssignedOrders(user.id);
            setAllAssignedOrders(assignedOrders);

            // Filter for current delivery slot
            const now = new Date();
            const currentHour = now.getHours();

            const activeOrders = assignedOrders.filter(o => {
                if (o.status === "completed" || o.status === "cancelled") return false;

                // Deliver orders from Hour H in Hour H+1
                const orderDate = new Date(o.date);
                const orderHour = orderDate.getHours();
                
                // If it's 10:xx, we deliver 9:xx orders. 
                // orderHour (9) + 1 = currentHour (10)
                return (orderHour + 1) === currentHour;
            });

            // Lunch Shift Logic: 
            // If shop is at lunch (e.g., 1-2 PM), delivery is at lunch (2-3 PM)
            let lunchActive = false;
            if (s?.lunchTime) {
                const parts = s.lunchTime.split("-").map(p => p.trim());
                if (parts.length >= 2) {
                    const shopLunchStart = parseInt(parts[0].split(":")[0]);
                    const shopLunchEnd = parseInt(parts[1].split(":")[0]);
                    const deliveryLunchStart = shopLunchStart + 1;
                    const deliveryLunchEnd = shopLunchEnd + 1;
                    
                    if (currentHour >= deliveryLunchStart && currentHour < deliveryLunchEnd) {
                        lunchActive = true;
                    }
                }
            }

            setOrders(lunchActive ? [] : activeOrders);
            setIsLunch(lunchActive);

            if (s && activeOrders.length > 0 && !lunchActive) {
                const optimized = optimizeRoute(activeOrders, { lat: s.lat, lng: s.lng });
                setRoute(optimized);
            } else {
                setRoute([]);
            }
        }
        setLoading(false);
    };

    const totalEarnings = allAssignedOrders
        .filter(o => o.status === "completed")
        .reduce((sum, o) => sum + (o.deliveryCharge || 0) + (o.tipAmount || 0) + (o.petrolAllowance || 0), 0);

    const historyOrders = allAssignedOrders
        .filter(o => o.status === "completed" || o.status === "cancelled")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

        // 149. Fetch and draw road-based route
        const fetchRoute = async (points: [number, number][]) => {
            if (points.length < 2) return;
            const query = points.map(p => `${p[1]},${p[0]}`).join(";");
            try {
                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${query}?overview=full&geometries=geojson`);
                const data = await response.json();
                if (data.routes && data.routes[0]) {
                    const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
                    L.polyline(coords, { color: "hsl(220, 95%, 45%)", weight: 6, opacity: 0.8, lineJoin: "round" }).addTo(map);
                    // Add a dashed core for premium feel
                    L.polyline(coords, { color: "white", weight: 2, dashArray: "5, 10", opacity: 0.5 }).addTo(map);
                } else {
                    // Fallback to straight lines if API fails
                    L.polyline(points, { color: "hsl(220, 55%, 18%)", weight: 3, dashArray: "8,8" }).addTo(map);
                }
            } catch (err) {
                console.error("Routing error:", err);
                L.polyline(points, { color: "hsl(220, 55%, 18%)", weight: 3, dashArray: "8,8" }).addTo(map);
            }
        };

        fetchRoute(points);

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-indian-green/5 border-indian-green/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <IndianRupee className="w-12 h-12" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-xs font-bold text-indian-green uppercase tracking-wider mb-1">Total Earnings</p>
                        <p className="text-3xl font-black text-foreground">₹{totalEarnings.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-indian-green" /> {allAssignedOrders.filter(o => o.status === "completed").length} Deliveries Completed
                        </p>
                    </CardContent>
                </Card>

                <Card className={`relative overflow-hidden group border-primary/20 ${timeLeft && timeLeft.m < 10 ? 'bg-amber-50 animate-pulse border-amber-300' : 'bg-primary/5'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Clock className="w-12 h-12" />
                    </div>
                    <CardContent className="p-6">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Current Batch Slot</p>
                        <p className="text-3xl font-black text-foreground">
                            {(new Date().getHours() - 1).toString().padStart(2, '0')}:00 - {new Date().getHours().toString().padStart(2, '0')}:00
                        </p>
                        {timeLeft && (
                            <p className={`text-[10px] font-bold mt-2 flex items-center gap-1 ${timeLeft.m < 10 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                {timeLeft.m < 10 && <AlertTriangle className="w-3 h-3" />}
                                Next Batch In: {timeLeft.m}:{timeLeft.s.toString().padStart(2, '0')}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-accent/5 border-accent/20 cursor-pointer hover:bg-accent/10 transition-colors" onClick={() => setView(view === "active" ? "history" : "active")}>
                    <CardContent className="p-6 flex flex-col justify-center h-full">
                        <div className="flex items-center justify-between mb-2">
                             <p className="text-xs font-bold text-accent uppercase tracking-wider">Quick Actions</p>
                             {view === "active" ? <ClipboardList className="w-4 h-4 text-accent" /> : <Truck className="w-4 h-4 text-accent" />}
                        </div>
                        <p className="text-lg font-bold">
                            {view === "active" ? "View History" : "Back to Active"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {timeLeft && timeLeft.m < 5 && (
                 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-3 shadow-lg">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600 animate-bounce" />
                    </div>
                    <div>
                        <p className="font-bold">Batch Ending Soon!</p>
                        <p className="text-xs opacity-80">Finish current tasks and return to the shop for the <b>{new Date().getHours()+1}:00</b> batch.</p>
                    </div>
                 </motion.div>
            )}

            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                <Button 
                    variant={view === "active" ? "default" : "ghost"} 
                    className={view === "active" ? "gradient-saffron text-accent-foreground" : ""}
                    onClick={() => setView("active")}
                >
                    <Truck className="w-4 h-4 mr-2" /> Active Roadmap
                </Button>
                <Button 
                    variant={view === "history" ? "default" : "ghost"} 
                    className={view === "history" ? "gradient-saffron text-accent-foreground" : ""}
                    onClick={() => setView("history")}
                >
                    <HistoryIcon className="w-4 h-4 mr-2" /> History & Earnings
                </Button>
            </div>

            <AnimatePresence mode="wait">
            {view === "history" ? (
                <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Trip History</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-muted-foreground uppercase text-[10px]">
                                             <th className="text-left py-3 font-black">Date & Order</th>
                                             <th className="text-left py-3 font-black">Destination</th>
                                             <th className="text-center py-3 font-black">Status</th>
                                             <th className="text-right py-3 font-black">Earnings</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {historyOrders.map(o => (
                                            <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-4">
                                                    <p className="font-bold">#{o.id.slice(0, 8)}</p>
                                                    <p className="text-[10px] text-muted-foreground">{new Date(o.date).toLocaleDateString()} {new Date(o.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </td>
                                                <td className="py-4 max-w-[200px]">
                                                    <p className="text-[10px] line-clamp-1">{o.address}</p>
                                                </td>
                                                <td className="py-4 text-center">
                                                    <Badge variant={o.status === "completed" ? "secondary" : "destructive"} className={o.status === "completed" ? "bg-indian-green/20 text-indian-green border-none" : ""}>
                                                        {o.status.toUpperCase()}
                                                    </Badge>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <p className="font-black text-indian-green">₹{((o.deliveryCharge || 0) + (o.tipAmount || 0) + (o.petrolAllowance || 0)).toFixed(2)}</p>
                                                        <p className="text-[8px] text-muted-foreground">C:₹{o.deliveryCharge} + P:₹{o.petrolAllowance} + T:₹{o.tipAmount}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {historyOrders.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-12 text-center text-muted-foreground">No history records found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                             </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ) : isLunch ? (
                <Card className="py-16 text-center bg-amber-50/50 border-amber-200">
                    <CardContent>
                        <Clock className="w-16 h-16 mx-auto mb-4 text-amber-500 animate-pulse" />
                        <h3 className="text-xl font-bold text-amber-900 font-display">Lunch Break</h3>
                        <p className="text-sm text-amber-700 max-w-xs mx-auto mt-2 font-medium">
                            Your delivery shift is currently on lunch break (1 hour offset from shop lunch).
                            Deliveries will resume in the next hour slot.
                        </p>
                    </CardContent>
                </Card>
            ) : route.length === 0 ? (
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
                                        ? calculateDistance(shop?.lat || 0, shop?.lng || 0, order.lat || 0, order.lng || 0)
                                        : calculateDistance(route[index - 1].lat || 0, route[index - 1].lng || 0, order.lat || 0, order.lng || 0);

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
            </AnimatePresence>
        </div>
    );
};

export default DeliveryBoyDashboard;

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { MapPin, Navigation, Truck, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db, Order, sql } from "@/lib/db";
import "leaflet/dist/leaflet.css";

const DeliveryTracking = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!user?.id) return;
      const orders = await sql.getUserOrders(user.id);
      const latest = orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      setOrder(latest || null);
      setLoading(false);
    };
    fetchOrder();
  }, [user]);

  useEffect(() => {
    if (loading || !order || !mapRef.current || mapInstance.current) return;

    const initMap = async () => {
      const L = await import("leaflet");

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      const DefaultIcon = L.icon({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      L.Icon.Default.prototype.options = DefaultIcon.options;

      const map = L.map(mapRef.current).setView([order.lat || 28.6139, order.lng || 77.209], 13);
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Shop marker (Mocked shop location if not in order)
      const shopMarker = L.marker([28.6139, 77.209]).addTo(map);
      shopMarker.bindPopup("<b>Fair Price Shop</b>");

      // Delivery location
      if (order.lat && order.lng) {
        const deliveryMarker = L.marker([order.lat, order.lng]).addTo(map);
        deliveryMarker.bindPopup(`<b>Delivery Address</b><br>${order.address}`);
      }
    };

    initMap();
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [loading, order]);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Truck className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
        <h2 className="text-xl font-bold">No Active Deliveries</h2>
        <p className="text-muted-foreground mt-2">Placed orders with home delivery will appear here for tracking.</p>
      </div>
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "delivered": return "bg-indian-green";
      case "out_for_delivery": return "bg-blue-500";
      case "assigned": return "bg-accent";
      default: return "gradient-saffron";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Delivery Tracking</h1>
        <p className="text-muted-foreground mt-1">Track your ration delivery in real-time</p>
      </motion.div>

      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                <Truck className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">Order #{order.id.slice(0, 8).toUpperCase()}</CardTitle>
                <p className="text-xs text-muted-foreground">{order.items}</p>
              </div>
            </div>
            <Badge className={getStatusColor(order.deliveryStatus)}>
              {order.deliveryStatus?.replace('_', ' ').toUpperCase() || "PENDING"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
              <MapPin className="w-5 h-5 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pickup Point</p>
                <p className="text-sm font-medium">Assigned Ration Shop</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
              <Navigation className="w-5 h-5 text-indian-green" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Destination</p>
                <p className="text-sm font-medium truncate max-w-[200px]">{order.address || "Fetching address..."}</p>
              </div>
            </div>
          </div>
          <div ref={mapRef} className="h-[450px] relative">
            <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-border shadow-md max-w-[200px]">
              <p className="text-xs font-bold text-muted-foreground mb-1 uppercase">Live Updates</p>
              <p className="text-sm font-medium">
                {order.deliveryStatus === 'out_for_delivery' ? "Vehicle is moving towards your location" :
                  order.deliveryStatus === 'assigned' ? "Order assigned to delivery personnel" :
                    order.deliveryStatus === 'delivered' ? "Order has been delivered" : "Awaiting assignment"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryTracking;

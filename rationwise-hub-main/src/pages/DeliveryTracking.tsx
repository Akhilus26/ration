import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { MapPin, Navigation, Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import "leaflet/dist/leaflet.css";

const DeliveryTracking = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const movingMarkerRef = useRef<any>(null);
  const { user } = useAuth();
  const [status, setStatus] = useState("In Transit");

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapInstance.current) return;
      const L = await import("leaflet");

      // Fix marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      const DefaultIcon = L.icon({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      L.Icon.Default.prototype.options = DefaultIcon.options;

      const map = L.map(mapRef.current).setView([28.6139, 77.209], 13);
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Shop marker
      const shopMarker = L.marker([28.6139, 77.209]).addTo(map);
      shopMarker.bindPopup("<b>Fair Price Shop</b><br>Connaught Place, Delhi");

      // Delivery location (User Address)
      const deliveryMarker = L.marker([28.6329, 77.2195]).addTo(map);
      deliveryMarker.bindPopup(`<b>Delivery Address</b><br>${user?.address || "Civil Lines, Delhi"}`);

      // Route line
      const routePoints: [number, number][] = [
        [28.6139, 77.209],
        [28.618, 77.212],
        [28.6239, 77.216],
        [28.6329, 77.2195],
      ];

      L.polyline(routePoints, { color: "hsl(220, 55%, 18%)", weight: 3, dashArray: "8,8" }).addTo(map);

      // Moving Truck Marker
      const truckIcon = L.divIcon({
        html: '<div class="bg-accent p-1 rounded-full shadow-lg border-2 border-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-3v10a1 1 0 0 0 1 1Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>',
        className: "custom-truck-icon",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const movingMarker = L.marker(routePoints[0], { icon: truckIcon }).addTo(map);
      movingMarkerRef.current = movingMarker;

      let step = 0;
      const interval = setInterval(() => {
        if (step >= routePoints.length - 1) {
          clearInterval(interval);
          setStatus("Delivered");
          return;
        }
        step++;
        movingMarker.setLatLng(routePoints[step]);
      }, 3000);

      const refreshInterval = interval;
    };

    initMap();
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [user]);

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
                <CardTitle className="text-lg">Order #RW-2025-0842</CardTitle>
                <p className="text-sm text-muted-foreground">Estimated arrival: 15 mins</p>
              </div>
            </div>
            <Badge className={status === "Delivered" ? "bg-indian-green" : "gradient-saffron"}>
              {status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
              <MapPin className="w-5 h-5 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pickup Point</p>
                <p className="text-sm font-medium">FPS - Connaught Place Shop</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
              <Navigation className="w-5 h-5 text-indian-green" />
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Destination</p>
                <p className="text-sm font-medium truncate max-w-[200px]">{user?.address || "Fetching address..."}</p>
              </div>
            </div>
          </div>
          <div ref={mapRef} className="h-[450px] relative">
            <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-border shadow-md max-w-[200px]">
              <p className="text-xs font-bold text-muted-foreground mb-1 uppercase">Live Updates</p>
              <p className="text-sm font-medium animate-pulse">Vehicle is moving towards {user?.name?.split(' ')[0] || "your"} location</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeliveryTracking;

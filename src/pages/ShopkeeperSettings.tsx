import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Navigation, Save, Store, Clock, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { sql, type Shop } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ShopkeeperSettings = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [shop, setShop] = useState<Shop | null>(null);
    const [form, setForm] = useState({
        name: "",
        address: "",
        serviceAreas: "",
        lat: 28.6139,
        lng: 77.2090,
        openingTime: "09:00",
        closingTime: "17:00",
        lunchTime: "13:00 - 14:00",
    });

    const updateField = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

    useEffect(() => {
        const fetchShop = async () => {
            if (user?.id) {
                const s = await sql.getShopByShopkeeperId(user.id);
                if (s) {
                    setShop(s);
                    setForm({
                        name: s.name || "",
                        address: s.address || "",
                        serviceAreas: s.serviceAreas?.join(", ") || "",
                        lat: s.lat || 28.6139,
                        lng: s.lng || 77.2090,
                        openingTime: s.openingTime || "09:00",
                        closingTime: s.closingTime || "17:00",
                        lunchTime: s.lunchTime || "13:00 - 14:00",
                    });
                }
                setFetching(false);
            }
        };
        fetchShop();
    }, [user]);

    useEffect(() => {
        if (!fetching && mapRef.current && !mapInstance.current) {
            const DefaultIcon = L.icon({
                iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
                iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
            });
            L.Icon.Default.prototype.options = DefaultIcon.options;

            const map = L.map(mapRef.current).setView([form.lat, form.lng], 13);
            mapInstance.current = map;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            }).addTo(map);

            const marker = L.marker([form.lat, form.lng], { draggable: true }).addTo(map);
            markerRef.current = marker;

            marker.on("dragend", () => {
                const pos = marker.getLatLng();
                updateField("lat", pos.lat);
                updateField("lng", pos.lng);
            });

            map.on("click", (e: L.LeafletMouseEvent) => {
                const { lat, lng } = e.latlng;
                marker.setLatLng([lat, lng]);
                updateField("lat", lat);
                updateField("lng", lng);
            });
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
                markerRef.current = null;
            }
        };
    }, [fetching]);

    const handleUpdate = async () => {
        if (!shop?.id) return;
        setIsLoading(true);
        try {
            const serviceAreasArray = form.serviceAreas.split(",").map(s => s.trim()).filter(s => s !== "");
            
            await sql.updateShop(shop.id, {
                name: form.name,
                address: form.address,
                serviceAreas: serviceAreasArray,
                lat: form.lat,
                lng: form.lng,
                openingTime: form.openingTime,
                closingTime: form.closingTime,
                lunchTime: form.lunchTime,
            });

            toast({ 
                title: "Shop Updated", 
                description: "Successfully updated your shop details." 
            });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    if (fetching) return <div className="p-12 text-center text-muted-foreground">Loading settings...</div>;

    if (!shop) return (
        <div className="p-12 text-center">
            <h2 className="text-xl font-bold">No Shop Assigned</h2>
            <p className="text-muted-foreground mt-2">You don't have a shop assigned to your account yet.</p>
        </div>
    );

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl font-bold text-foreground">Shop Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your store details and operating hours</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 shadow-card">
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>Update your store's public profile</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Shop Name</Label>
                            <div className="relative">
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="pl-10" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="serviceAreas">Service Areas (Comma separated Pincodes/Areas)</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input id="serviceAreas" value={form.serviceAreas} onChange={(e) => updateField("serviceAreas", e.target.value)} className="pl-10" placeholder="110001, 110002" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Shop Location (Select or Drag on Map)</Label>
                            <div className="h-[300px] w-full rounded-lg overflow-hidden border border-border relative">
                                <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
                                <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="shadow-md"
                                        onClick={() => {
                                            navigator.geolocation.getCurrentPosition((pos) => {
                                                const { latitude, longitude } = pos.coords;
                                                updateField("lat", latitude);
                                                updateField("lng", longitude);
                                                markerRef.current?.setLatLng([latitude, longitude]);
                                                mapInstance.current?.setView([latitude, longitude], 13);
                                            });
                                        }}
                                    >
                                        <Navigation className="w-4 h-4 mr-2" /> Current Location
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Full Shop Address</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Textarea id="address" value={form.address} onChange={(e) => updateField("address", e.target.value)} className="pl-10 min-h-[80px]" />
                            </div>
                        </div>

                        <Button onClick={handleUpdate} className="w-full gradient-indian-green text-white font-semibold" disabled={isLoading}>
                            {isLoading ? "Updating..." : "Save Shop Changes"} <Save className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="shadow-card border-accent/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Clock className="w-4 h-4 text-accent" />
                                Operating Hours
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="openingTime">Opening Time</Label>
                                <Input id="openingTime" type="time" value={form.openingTime} onChange={(e) => updateField("openingTime", e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="closingTime">Closing Time</Label>
                                <Input id="closingTime" type="time" value={form.closingTime} onChange={(e) => updateField("closingTime", e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lunchTime">Lunch Break</Label>
                                <Input id="lunchTime" value={form.lunchTime} onChange={(e) => updateField("lunchTime", e.target.value)} placeholder="13:00 - 14:00" />
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">
                                Note: Shop status (Open/Closed) is controlled manually by you on the dashboard.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-card border-primary/20 bg-primary/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" />
                                Map Context
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground space-y-2">
                            <p>Updating your shop's map location helps beneficiaries find you more easily.</p>
                            <p className="font-semibold text-foreground">Ensure the pointer is placed exactly at your shop's entrance.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ShopkeeperSettings;

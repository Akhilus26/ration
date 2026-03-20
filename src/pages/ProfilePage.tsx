import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Navigation, Save, User, Mail, CreditCard, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { sql } from "@/lib/db";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ProfilePage = () => {
    const { user, refreshUser } = useAuth();
    const { toast } = useToast();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [form, setForm] = useState({
        name: user?.name || "",
        email: user?.email || "",
        address: user?.address || "",
        pincode: user?.pincode || "",
        lat: user?.lat || 28.6139,
        lng: user?.lng || 77.2090,
    });

    const updateField = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

    const fetchPincode = async (lat: number, lng: number) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await response.json();

            const pincodeRegex = /(\d{6})/g;
            const matches = data.display_name?.match(pincodeRegex);
            const regexPincode = matches ? matches[matches.length - 1] : null;

            const address = data.address || {};
            const apiPincode = address.postcode;
            const displayAddress = data.display_name || "";

            const finalPincode = regexPincode || apiPincode;

            if (finalPincode) {
                updateField("pincode", finalPincode);
            }
            
            if (!form.address || displayAddress.length > form.address.length) {
                updateField("address", displayAddress);
            }
        } catch (error) {
            console.error("Reverse geocoding error:", error);
        }
    };

    useEffect(() => {
        if (mapRef.current && !mapInstance.current) {
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
                fetchPincode(pos.lat, pos.lng);
            });

            map.on("click", (e: L.LeafletMouseEvent) => {
                const { lat, lng } = e.latlng;
                marker.setLatLng([lat, lng]);
                updateField("lat", lat);
                updateField("lng", lng);
                fetchPincode(lat, lng);
            });
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
                markerRef.current = null;
            }
        };
    }, []);

    const handleUpdate = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            // Find nearby shops based on new location
            const matchedShops = await sql.findShopsByRadius(form.lat, form.lng, 10);
            
            if (matchedShops.length === 0) {
                toast({
                    title: "No Stores Found",
                    description: "We couldn't find any ration shops within 10km of your new location. Your assigned shop will remain unchanged.",
                    variant: "destructive"
                });
                return;
            }

            const rationShop = matchedShops.find(s => s.type === "ration");
            const newAssignedShopId = rationShop ? rationShop.id : matchedShops[0].id;

            await sql.updateUser(user.id, {
                name: form.name,
                email: form.email,
                address: form.address,
                pincode: form.pincode,
                lat: form.lat,
                lng: form.lng,
                assignedShopId: newAssignedShopId
            });

            await refreshUser();
            toast({ 
                title: "Profile Updated", 
                description: `Successfully updated your location. New assigned shop: ${rationShop ? rationShop.name : matchedShops[0].name}` 
            });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your personal information and delivery location</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 shadow-card">
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Update your basic account details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="pl-10" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input id="email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="pl-10" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Delivery Location (Select or Drag on Map)</Label>
                            <div className="h-[300px] w-full rounded-lg overflow-hidden border border-border relative">
                                <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="absolute bottom-2 right-2 z-[1000] shadow-md"
                                    onClick={() => {
                                        navigator.geolocation.getCurrentPosition((pos) => {
                                            const { latitude, longitude } = pos.coords;
                                            updateField("lat", latitude);
                                            updateField("lng", longitude);
                                            markerRef.current?.setLatLng([latitude, longitude]);
                                            mapInstance.current?.setView([latitude, longitude], 13);
                                            fetchPincode(latitude, longitude);
                                        });
                                    }}
                                >
                                    <Navigation className="w-4 h-4 mr-2" /> Current Location
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Click or drag the marker to set your precise delivery point</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pincode">Area / Ward / Pincode</Label>
                            <div className="relative">
                                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input id="pincode" value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} className="pl-10" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Full Delivery Address</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                <Textarea id="address" value={form.address} onChange={(e) => updateField("address", e.target.value)} className="pl-10 min-h-[80px]" />
                            </div>
                        </div>

                        <Button onClick={handleUpdate} className="w-full gradient-saffron text-accent-foreground font-semibold" disabled={isLoading}>
                            {isLoading ? "Updating..." : "Save Profile Changes"} <Save className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="shadow-card border-accent/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Shield className="w-4 h-4 text-accent" />
                                Account Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Ration Card Number</p>
                                <p className="text-sm font-mono">{user?.rationCardNumber || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Category</p>
                                <p className="text-sm">{user?.category || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Aadhaar Number</p>
                                <p className="text-sm font-mono">{user?.aadhaar || "N/A"}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-card border-primary/20 bg-primary/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-primary" />
                                Location Note
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground space-y-2">
                            <p>Updating your location will automatically re-assign you to the nearest ration shop within a 10km radius.</p>
                            <p className="font-semibold text-foreground">Ensure your map marker is placed correctly for accurate shop assignment.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;

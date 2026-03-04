import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Navigation, ArrowLeft, ArrowRight, Store, User, Mail, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { sql } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

const ShopRegistration = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const navigate = useNavigate();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
        shopName: "",
        shopType: "ration",
        address: "",
        pincodes: "",
        lat: 28.6139,
        lng: 77.2090,
    });

    const updateField = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

    const fetchPincode = async (lat: number, lng: number) => {
        try {
            // zoom=18 provides house-level precision
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await response.json();

            // 1. Try to extract 6-digit PIN code from display_name using regex 
            // This is often more accurate than the postcode field in Nominatim for India
            const pincodeRegex = /(\d{6})/g;
            const matches = data.display_name?.match(pincodeRegex);
            const regexPincode = matches ? matches[matches.length - 1] : null;

            // 2. Fallback to address fields
            const address = data.address || {};
            const apiPincode = address.postcode;
            const area = address.suburb || address.neighbourhood || address.city_district || address.village || address.town;
            const displayAddress = data.display_name || "";

            // Priority: Regex match > API Postcode field
            const finalPincode = regexPincode || apiPincode;

            if (finalPincode) {
                updateField("pincodes", finalPincode);
                toast({
                    title: "Pincode Detected",
                    description: `Location: ${area || "Nearby area"} (${finalPincode})`
                });
            } else if (area) {
                updateField("pincodes", area);
                toast({ title: "Area Detected", description: `Using area name: ${area}` });
            }

            // Update address if significantly more detailed
            if (!form.address || displayAddress.length > form.address.length + 10) {
                updateField("address", displayAddress);
            }
        } catch (error) {
            console.error("Reverse geocoding error:", error);
            toast({ title: "Geocoding Error", description: "Failed to detect area details.", variant: "destructive" });
        }
    };

    useEffect(() => {
        if (step === 2 && mapRef.current && !mapInstance.current) {
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
            if (step !== 2 && mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
                markerRef.current = null;
            }
        };
    }, [step]);

    // Sync marker if coordinates changed via geolocation
    useEffect(() => {
        if (markerRef.current && mapInstance.current) {
            markerRef.current.setLatLng([form.lat, form.lng]);
            mapInstance.current.setView([form.lat, form.lng]);
        }
    }, [form.lat, form.lng]);

    const handleRegister = async () => {
        if (!form.email || !form.shopName || !form.pincodes) {
            toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            // Check for duplicate Gmail
            const existenceError = await sql.checkUserExistence({ email: form.email });
            if (existenceError) {
                toast({
                    title: "Registration Error",
                    description: existenceError,
                    variant: "destructive"
                });
                return;
            }
            const userId = crypto.randomUUID();
            const shopId = `shop-${Date.now()}`;

            // Create Shopkeeper User
            await sql.insertUser({
                id: userId,
                name: form.name,
                email: form.email,
                role: "shopkeeper",
                assignedShopId: shopId,
            });

            // Create Shop in Pending Status
            await sql.insertShop({
                id: shopId,
                name: form.shopName,
                address: form.address,
                lat: form.lat,
                lng: form.lng,
                serviceAreas: form.pincodes.split(",").map(s => s.trim()).filter(Boolean),
                shopkeeperId: userId,
                status: "pending",
                type: form.shopType as any,
                gmail: form.email,
            });

            toast({
                title: "Application Submitted",
                description: "Your shop registration is pending admin approval.",
            });
            navigate("/login");
        } catch (error: any) {
            toast({ title: "Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate("/login")} className="p-2 rounded-lg hover:bg-muted transition-colors">
                        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg gradient-header flex items-center justify-center">
                            <Store className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <span className="font-semibold text-foreground">Shop Registration</span>
                    </div>
                </div>

                <div className="flex gap-2 mb-6">
                    {[1, 2].map((s) => (
                        <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
                    ))}
                </div>

                <Card className="border-0 shadow-card">
                    <CardHeader>
                        <CardTitle>{step === 1 ? "Shop & Manager Details" : "Location & Service Area"}</CardTitle>
                        <CardDescription>
                            {step === 1 ? "Enter shop information and manager details" : "Set shop location and areas served"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {step === 1 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Manager Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input placeholder="Your Name" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="pl-10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Manager Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input type="email" placeholder="your@email.com" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="pl-10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Shop Name</Label>
                                    <div className="relative">
                                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input placeholder="Retail Store Name" value={form.shopName} onChange={(e) => updateField("shopName", e.target.value)} className="pl-10" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Shop Type</Label>
                                    <Select value={form.shopType} onValueChange={(v) => updateField("shopType", v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ration">Fair Price Ration Shop</SelectItem>
                                            <SelectItem value="extra">Low-Rate Extra Shop (Locality Store)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={async () => {
                                        setIsLoading(true);
                                        try {
                                            const existenceError = await sql.checkUserExistence({ email: form.email });
                                            if (existenceError) {
                                                toast({
                                                    title: "Validation Error",
                                                    description: existenceError,
                                                    variant: "destructive"
                                                });
                                                return;
                                            }
                                            setStep(2);
                                        } catch (error: any) {
                                            toast({ title: "Error", description: error.message, variant: "destructive" });
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    className="w-full gradient-header text-primary-foreground font-semibold"
                                    disabled={isLoading || !form.name || !form.email || !form.shopName}
                                >
                                    {isLoading ? "Checking..." : "Next: Shop Location"} <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Shop Location (Select or Drag)</Label>
                                    <div className="h-[200px] w-full rounded-lg overflow-hidden border border-border relative">
                                        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
                                        <Button size="sm" variant="secondary" className="absolute bottom-2 right-2 z-[1000]" onClick={() => {
                                            if (!navigator.geolocation) {
                                                toast({ title: "Error", description: "Geolocation is not supported by your browser", variant: "destructive" });
                                                return;
                                            }

                                            toast({ title: "Locating...", description: "Fetching your current position." });

                                            navigator.geolocation.getCurrentPosition(
                                                (pos) => {
                                                    updateField("lat", pos.coords.latitude);
                                                    updateField("lng", pos.coords.longitude);
                                                    fetchPincode(pos.coords.latitude, pos.coords.longitude);
                                                    toast({ title: "Success", description: "Location updated successfully." });
                                                },
                                                (err) => {
                                                    console.error("Geolocation error:", err);
                                                    toast({
                                                        title: "Location Error",
                                                        description: err.code === 1 ? "Please enable location permissions." : "Could not determine your location.",
                                                        variant: "destructive"
                                                    });
                                                },
                                                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                                            );
                                        }}>
                                            <Navigation className="w-4 h-4 mr-2" /> Current Location
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Full Address</Label>
                                    <Textarea placeholder="Shop address" value={form.address} onChange={(e) => updateField("address", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Service Areas (Pincodes / Wards)</Label>
                                    <Input placeholder="110001, 110002 (comma separated)" value={form.pincodes} onChange={(e) => updateField("pincodes", e.target.value)} />
                                    <p className="text-[10px] text-muted-foreground">Beneficiaries in these areas will be mapped to your shop.</p>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                                    <Button onClick={handleRegister} className="flex-1 gradient-header text-primary-foreground font-semibold" disabled={isLoading || !form.pincodes}>
                                        {isLoading ? "Submitting..." : "Submit Application"}
                                        {!isLoading && <ShieldCheck className="w-4 h-4 ml-2" />}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div >
    );
};

export default ShopRegistration;

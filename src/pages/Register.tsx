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
import { MapPin, Navigation, ArrowLeft, ArrowRight, Wheat, User, CreditCard, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { sql } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
const Register = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    rationCard: "",
    aadhaar: "",
    category: "",
    email: "",
    address: "",
    pincode: "",
    lat: 28.6139,
    lng: 77.2090,
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
      const area = address.suburb || address.neighbourhood || address.city_district || address.village || address.town;
      const displayAddress = data.display_name || "";

      const finalPincode = regexPincode || apiPincode;

      if (finalPincode) {
        updateField("pincode", finalPincode);
        toast({
          title: "Pincode Detected",
          description: `Location: ${area || "Nearby area"} (${finalPincode})`
        });
      } else if (area) {
        updateField("pincode", area);
        toast({ title: "Area Detected", description: `Using area name: ${area}` });
      }

      if (!form.address || displayAddress.length > form.address.length + 10) {
        updateField("address", displayAddress);
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
  };

  useEffect(() => {
    if (step === 3 && mapRef.current && !mapInstance.current) {
      // Fix marker icons
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
      if (step !== 3 && mapInstance.current) {
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/login")} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-saffron flex items-center justify-center">
              <Wheat className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-semibold text-foreground">Beneficiary Registration</span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-accent" : "bg-muted"}`} />
          ))}
        </div>

        <Card className="border-0 shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">
              {step === 1 && "Personal Details"}
              {step === 2 && "Identity & Category"}
              {step === 3 && "Contact Information"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Enter your name and basic information"}
              {step === 2 && "Provide your ration card and Aadhaar details"}
              {step === 3 && "Enter your email and delivery address"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="name" placeholder="Enter your full name" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="pl-10" />
                  </div>
                </div>
                <Button onClick={() => setStep(2)} className="w-full gradient-saffron text-accent-foreground font-semibold" disabled={!form.name}>
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rationCard">Ration Card Number</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="rationCard" placeholder="e.g., 1234567890" maxLength={10} value={form.rationCard} onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); updateField("rationCard", v); }} className="pl-10" />
                    {form.rationCard.length > 0 && form.rationCard.length < 10 && (
                      <p className="text-sm text-destructive mt-1">Ration Card Number must be exactly 10 digits</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aadhaar">Aadhaar Number</Label>
                  <Input id="aadhaar" placeholder="XXXX-XXXX-XXXX" maxLength={14} value={form.aadhaar} onChange={(e) => updateField("aadhaar", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ration Category</Label>
                  <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AAY">AAY – Antyodaya Anna Yojana</SelectItem>
                      <SelectItem value="PHH">PHH – Priority Household</SelectItem>
                      <SelectItem value="NPHH">NPHH – Non-Priority Household</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        const existenceError = await sql.checkUserExistence({
                          aadhaar: form.aadhaar,
                          rationCardNumber: form.rationCard
                        });

                        if (existenceError && (existenceError.includes("Aadhaar") || existenceError.includes("Ration"))) {
                          toast({
                            title: "Validation Error",
                            description: existenceError,
                            variant: "destructive"
                          });
                          return;
                        }
                        setStep(3);
                      } catch (error: any) {
                        toast({ title: "Error", description: error.message, variant: "destructive" });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="flex-1 gradient-saffron text-accent-foreground font-semibold"
                    disabled={isLoading || form.rationCard.length !== 10 || !form.category}
                  >
                    {isLoading ? "Checking..." : "Continue"} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="your.email@gmail.com" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Delivery Location (Select or Drag on Map)</Label>
                  <div className="h-[200px] w-full rounded-lg overflow-hidden border border-border relative">
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
                    <Input id="pincode" placeholder="e.g. 110001 or Dwarka" value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Full Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Textarea id="address" placeholder="Enter house number, colony, etc." value={form.address} onChange={(e) => updateField("address", e.target.value)} className="pl-10 min-h-[60px]" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                  <Button
                    onClick={async () => {
                      if (!form.pincode) {
                        toast({ title: "Error", description: "Please enter your Pincode or Area.", variant: "destructive" });
                        return;
                      }

                      setIsLoading(true);
                      try {
                        // Check for duplicate Email, Aadhaar, or Ration Card
                        const existenceError = await sql.checkUserExistence({
                          email: form.email,
                          aadhaar: form.aadhaar,
                          rationCardNumber: form.rationCard
                        });

                        if (existenceError) {
                          toast({
                            title: "Registration Error",
                            description: existenceError,
                            variant: "destructive"
                          });
                          return;
                        }

                        // Check for ANY shop within 10km radius
                        const matchedShops = await sql.findShopsByRadius(form.lat, form.lng, 10);

                        if (matchedShops.length === 0) {
                          toast({
                            title: "No Stores Found within 10km",
                            description: "Unfortunately, we don't have any ration or extra shops within 10km of your location yet.",
                            variant: "destructive"
                          });
                          return;
                        }

                        // Prioritize Ration Shop for official assignment, otherwise use Extra Shop
                        const rationShop = matchedShops.find(s => s.type === "ration");
                        const assignedShop = rationShop || matchedShops[0];

                        const id = crypto.randomUUID();
                        await sql.insertUser({
                          id,
                          name: form.name,
                          email: form.email,
                          role: 'beneficiary',
                          rationCardNumber: form.rationCard,
                          category: form.category as any,
                          address: form.address,
                          pincode: form.pincode,
                          assignedShopId: assignedShop.id,
                          aadhaar: form.aadhaar,
                          lat: form.lat,
                          lng: form.lng
                        });

                        toast({
                          title: "Registration Successful",
                          description: `Assigned to: ${assignedShop.name} (${assignedShop.type.toUpperCase()})`
                        });
                        navigate("/login");
                      } catch (error: any) {
                        toast({ title: "Failed", description: error.message, variant: "destructive" });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="flex-1 gradient-saffron text-accent-foreground font-semibold"
                    disabled={!form.email || !form.address || !form.pincode}
                  >
                    Register
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;

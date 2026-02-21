import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Minus, Plus, IndianRupee, MapPin, CheckCircle2, CreditCard, ArrowRight } from "lucide-react";
import { sql, type Purchase } from "@/lib/db";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

interface CartItem {
  name: string;
  price: number;
  unit: string;
  max: number;
  qty: number;
}

const categoryQuotas: Record<string, any> = {
  AAY: { Rice: 20, Wheat: 15, Sugar: 2, Kerosene: 5 },
  PHH: { Rice: 15, Wheat: 10, Sugar: 1, Kerosene: 3 },
  NPHH: { Rice: 10, Wheat: 5, Sugar: 1, Kerosene: 2 },
};

const PurchasePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "location" | "payment" | "success">("cart");
  const [deliveryLoc, setDeliveryLoc] = useState({ lat: user?.lat || 28.6139, lng: user?.lng || 77.2090, address: user?.address || "" });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      const category = user.category || "PHH";
      const quotas = categoryQuotas[category];
      sql.getPurchases(user.id).then(prevPurchases => {
        const initialCart = Object.keys(quotas).map(name => {
          const used = prevPurchases.filter(p => p.itemName === name).reduce((sum, p) => sum + p.amount, 0);
          return {
            name,
            price: name === "Rice" ? 3 : name === "Wheat" ? 2 : name === "Sugar" ? 13.5 : 32,
            unit: name === "Kerosene" ? "L" : "kg",
            max: Math.max(0, quotas[name] - used),
            qty: 0
          };
        });
        setCart(initialCart);
      });
    }
  }, [user]);

  const updateQty = (index: number, delta: number) => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, qty: Math.max(0, Math.min(item.max, item.qty + delta)) } : item
      )
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemsInCart = cart.filter(m => m.qty > 0);

  const handleFinalOrder = async () => {
    setProcessing(true);
    try {
      for (const item of itemsInCart) {
        await sql.insertPurchase({
          id: crypto.randomUUID(),
          userId: user?.id || "",
          itemName: item.name,
          amount: item.qty,
          unit: item.unit,
          price: item.price,
          date: new Date().toISOString()
        });
      }
      setCheckoutStep("success");
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  if (checkoutStep === "success") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <CheckCircle2 className="w-20 h-20 text-indian-green animate-bounce" />
        <h2 className="text-3xl font-bold text-foreground">Payment Successful!</h2>
        <p className="text-muted-foreground">Your order has been placed and is being processed.</p>
        <Button onClick={() => navigate("/beneficiary")} className="gradient-saffron text-accent-foreground">Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {checkoutStep === "cart" && (
          <motion.div key="cart" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <h1 className="text-2xl font-bold">Purchase Ration</h1>
            <div className="grid gap-4">
              {cart.map((item, index) => (
                <Card key={item.name} className="shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">₹{item.price}/{item.unit} · Remaining Quota: {item.max} {item.unit}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQty(index, -1)} disabled={item.qty === 0}><Minus className="w-3" /></Button>
                      <span className="w-6 text-center font-bold">{item.qty}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQty(index, 1)} disabled={item.qty >= item.max}><Plus className="w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="p-4 flex items-center justify-between bg-muted/30">
              <span className="text-xl font-bold">Total: ₹{total.toFixed(1)}</span>
              <Button onClick={() => setCheckoutStep("location")} disabled={itemsInCart.length === 0} className="gradient-saffron text-accent-foreground font-bold">
                Confirm Items <ArrowRight className="ml-2 w-4" />
              </Button>
            </Card>
          </motion.div>
        )}

        {checkoutStep === "location" && (
          <motion.div key="loc" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            <h2 className="text-2xl font-bold">Confirm Delivery Location</h2>
            <Card className="p-4 space-y-4">
              <div className="h-[300px] rounded-lg overflow-hidden border">
                <MapContainer center={[deliveryLoc.lat, deliveryLoc.lng]} zoom={13} style={{ height: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[deliveryLoc.lat, deliveryLoc.lng]} />
                  <MapEventsHandler setLoc={setDeliveryLoc} />
                </MapContainer>
              </div>
              <p className="text-xs text-muted-foreground italic text-center">Click on the map to change delivery point if needed</p>
              <div className="space-y-2">
                <label className="text-sm font-bold">Address Details</label>
                <textarea
                  className="w-full p-3 rounded-md border text-sm"
                  value={deliveryLoc.address}
                  onChange={e => setDeliveryLoc(p => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setCheckoutStep("cart")} className="flex-1">Back</Button>
                <Button onClick={() => setCheckoutStep("payment")} className="flex-1 gradient-saffron text-accent-foreground font-bold">Go to Payment</Button>
              </div>
            </Card>
          </motion.div>
        )}

        {checkoutStep === "payment" && (
          <motion.div key="pay" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold">Mockup Payment</h2>
            <Card className="max-w-md mx-auto overflow-hidden shadow-xl">
              <div className="bg-primary/10 p-6 flex flex-col items-center border-b">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg mb-4">
                  <IndianRupee className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Payable Amount</p>
                <p className="text-4xl font-black text-foreground">₹{total.toFixed(1)}</p>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Select Payment Method</p>
                  <div className="grid gap-3">
                    <div className="p-4 border rounded-xl flex items-center justify-between cursor-pointer border-primary bg-primary/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded border flex items-center justify-center shadow-sm">UPI</div>
                        <span className="font-semibold text-sm">UPI (Google Pay, PhonePe)</span>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="p-4 border rounded-xl flex items-center gap-3 opacity-50 cursor-not-allowed">
                      <div className="w-10 h-10 bg-white rounded border flex items-center justify-center shadow-sm"><CreditCard className="w-5 h-5" /></div>
                      <span className="font-semibold text-sm">Credit / Debit Card</span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleFinalOrder}
                  className="w-full h-14 text-lg font-bold gradient-saffron text-accent-foreground shadow-lg"
                  disabled={processing}
                >
                  {processing ? "Processing..." : "PAY NOW"}
                </Button>
                <Button variant="ghost" onClick={() => setCheckoutStep("location")} className="w-full">Cancel</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MapEventsHandler = ({ setLoc }: { setLoc: any }) => {
  useMapEvents({
    click(e) {
      setLoc((p: any) => ({ ...p, lat: e.latlng.lat, lng: e.latlng.lng }));
    }
  });
  return null;
};

export default PurchasePage;

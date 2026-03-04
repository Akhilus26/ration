import React, { useState, useEffect, Component } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Minus,
  Plus,
  IndianRupee,
  MapPin,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  Wallet,
  Store,
  Navigation,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";
import { sql, db, calculateDistance, type Purchase, type Shop, type User } from "@/lib/db";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useToast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet
if (L.Icon.Default) {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

const MapEventsHandler = ({ setLoc }: { setLoc: any }) => {
  useMapEvents({
    click(e) {
      setLoc((p: any) => ({ ...p, lat: e.latlng.lat, lng: e.latlng.lng }));
    }
  });
  return null;
};

interface CartItem {
  name: string;
  price: number;
  unit: string;
  max: number;
  qty: number;
}

// Basic Error Boundary for Map stability
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-muted rounded-lg border border-dashed m-4">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive opacity-50" />
          <p className="text-sm font-bold text-destructive">Dashboard Error</p>
          <p className="text-[10px] text-muted-foreground mb-4">The map or another component failed to load.</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PurchasePage = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "location" | "payment" | "success">("cart");
  const [deliveryLoc, setDeliveryLoc] = useState({
    lat: Number(user?.lat) || 28.6139,
    lng: Number(user?.lng) || 77.2090,
    address: user?.address || ""
  });
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "wallet">("wallet");
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [shop, setShop] = useState<Shop | null>(null);
  const [allQuotas, setAllQuotas] = useState<any[]>([]);
  const [availableBoys, setAvailableBoys] = useState<User[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "simulating" | "success">("idle");
  const [deliveryCharge, setDeliveryCharge] = useState(10);
  const [tipAmount, setTipAmount] = useState(0);

  useEffect(() => {
    sql.getSystemSettings().then(s => {
      if (s?.deliveryCharge !== undefined) setDeliveryCharge(Number(s.deliveryCharge) || 0);
    });
  }, []);

  const targetShopId = searchParams.get("shop") || user?.assignedShopId;

  const isShopCurrentlyOpen = () => {
    if (!shop) return true;
    if (shop.isManualOpen === false) return false;

    if (shop.openingTime && shop.closingTime) {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const currentTime = `${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;

      return currentTime >= shop.openingTime && currentTime <= shop.closingTime;
    }

    return true;
  };

  const isOpen = isShopCurrentlyOpen();

  useEffect(() => {
    if (targetShopId) {
      sql.getShopById(targetShopId).then(setShop);
    }
  }, [targetShopId]);

  useEffect(() => {
    if (user?.id && shop) {
      const category = user.category || "PHH";

      Promise.all([
        sql.getPurchases(user.id),
        sql.getShopStock(shop.id),
        sql.getAllQuotas(),
        sql.getDeliveryBoysByShop(shop.id)
      ]).then(([prevPurchases, shopStock, quotasData, boys]) => {
        setAllQuotas(quotasData);
        setAvailableBoys(boys);
        let initialCart: CartItem[] = [];

        if (shop.type === "extra") {
          // Extra shops use items from their own stock
          initialCart = shopStock.map(stock => {
            const used = prevPurchases.filter(p => p.itemName === stock.itemName).reduce((sum, p) => sum + p.amount, 0);
            const limit = stock.limitPerCard || 999;
            return {
              name: stock.itemName,
              price: stock.price || 0,
              unit: stock.unit,
              max: Math.max(0, Math.min(stock.quantity, limit - used)),
              qty: 0
            };
          });
        } else {
          // Ration shops use government quotas from database but respect shop stock
          const userQuotas = quotasData.filter(q => q.category === category);
          initialCart = userQuotas.map(q => {
            const name = q.itemName;
            const stockItem = shopStock.find(s => s.itemName === name);
            const used = prevPurchases.filter(p => p.itemName === name).reduce((sum, p) => sum + p.amount, 0);

            // Limit is minimum of database quota amount and any custom shop limit
            let quotaAmount = q.amount;
            if (stockItem?.limitPerCard) {
              quotaAmount = Math.min(quotaAmount, stockItem.limitPerCard);
            }

            return {
              name,
              price: stockItem?.price || q.price || 0,
              unit: q.unit,
              max: Math.max(0, Math.min(stockItem?.quantity || 0, quotaAmount - used)),
              qty: 0
            };
          });
        }
        setCart(initialCart);
      });
    }
  }, [user, shop]);

  const updateQty = (index: number, delta: number) => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, qty: Math.max(0, Math.min(item.max, item.qty + delta)) } : item
      )
    );
  };

  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("pickup");
  const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = itemsTotal + (deliveryType === "delivery" ? deliveryCharge : 0) + tipAmount;
  const itemsInCart = cart.filter(m => m.qty > 0);

  const handleFinalOrder = async () => {
    setProcessing(true);
    try {
      if (paymentMethod === "upi") {
        setPaymentStatus("simulating");
        await new Promise(r => setTimeout(r, 2000)); // Simulate payment processing
        setPaymentStatus("success");
      }

      if (paymentMethod === "wallet") {
        if ((user?.balance || 0) < total) {
          toast({
            title: "Insufficient Balance",
            description: "Please top up your wallet or use another payment method.",
            variant: "destructive"
          });
          setProcessing(false);
          return;
        }
        await sql.updateBalance(user!.id, -total);
      }

      const orderId = crypto.randomUUID();
      const orderItems = itemsInCart.map(i => `${i.name} (${i.qty}${i.unit})`).join(", ");

      // Create Order record
      await sql.createOrder({
        id: orderId,
        userId: user?.id || "",
        shopId: targetShopId || "",
        type: shop?.type || "ration",
        status: deliveryType === "delivery" ? "pending" : "completed",
        date: new Date().toISOString(),
        items: orderItems,
        deliveryType: deliveryType,
        deliveryStatus: deliveryType === "delivery" ? "pending" : undefined,
        lat: deliveryType === "delivery" ? deliveryLoc.lat : undefined,
        lng: deliveryType === "delivery" ? deliveryLoc.lng : undefined,
        address: deliveryType === "delivery" ? deliveryLoc.address : undefined,
        deliveryCharge: deliveryType === "delivery" ? deliveryCharge : 0,
        tipAmount: tipAmount,
        totalAmount: total
      });

      for (const item of itemsInCart) {
        await sql.insertPurchase({
          id: crypto.randomUUID(),
          userId: user?.id || "",
          shopId: targetShopId || "",
          itemName: item.name,
          amount: item.qty,
          unit: item.unit,
          price: item.price,
          date: new Date().toISOString()
        });
        await sql.decrementStock(targetShopId || "", item.name, item.qty);
      }
      await refreshUser();
      setCheckoutStep("success");
    } catch (e) {
      console.error(e);
      toast({ title: "Order Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (!targetShopId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <Store className="w-20 h-20 text-muted-foreground opacity-20" />
        <h2 className="text-2xl font-bold text-foreground">No Shop Selected</h2>
        <p className="text-muted-foreground">Please select a ration shop from the dashboard first to view available items.</p>
        <Button onClick={() => navigate("/beneficiary")} className="gradient-saffron text-accent-foreground">Go to Dashboard</Button>
      </div>
    );
  }

  if (checkoutStep === "success" || paymentStatus === "success") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <CheckCircle2 className="w-20 h-20 text-indian-green animate-bounce" />
        <h2 className="text-3xl font-bold text-foreground">Payment Successful!</h2>
        <p className="text-muted-foreground">Your order has been placed and is being processed.</p>
        <Button onClick={() => navigate("/beneficiary")} className="gradient-saffron text-accent-foreground">Back to Dashboard</Button>
      </div>
    );
  }

  if (paymentStatus === "simulating") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
        <div className="relative">
          <Loader2 className="w-20 h-20 text-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <IndianRupee className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold">Processing Payment</h2>
          <p className="text-muted-foreground">Please do not refresh or close the page...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-4xl mx-auto">
        {checkoutStep === "cart" && (
          <motion.div key="cart" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Purchase Ration</h1>
              {shop && (
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <Badge variant={isOpen ? "secondary" : "destructive"} className={isOpen ? "bg-indian-green/20 text-indian-green border-indian-green/20" : ""}>
                      {isOpen ? "Shop Open" : "Shop Closed"}
                    </Badge>
                    <p className="text-sm font-bold text-primary">{shop.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{shop.address}</p>
                  {shop.openingTime && (
                    <p className="text-[9px] text-muted-foreground">Hours: {shop.openingTime} - {shop.closingTime}</p>
                  )}
                  {user?.lat && user?.lng && (
                    <p className="text-[9px] font-bold text-indian-green flex items-center justify-end gap-1 mt-0.5">
                      <Navigation className="w-2 h-2" /> {Math.round(calculateDistance(user.lat, user.lng, shop.lat, shop.lng) * 100) / 100} km from home
                    </p>
                  )}
                </div>
              )}
            </div>

            {!isOpen && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <p className="font-semibold">This shop is currently closed. You can browse items but cannot place an order right now.</p>
              </div>
            )}
            <div className="grid gap-4">
              {cart.map((item, index) => (
                <Card key={item.name} className="shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{item.name}</p>
                        {item.max === 0 && (
                          <Badge variant="outline" className="text-[8px] h-4 text-destructive border-destructive px-1 uppercase font-black">
                            {item.name} Empty
                          </Badge>
                        )}
                        {item.max > 0 && item.max < 2 && (
                          <Badge variant="outline" className="text-[8px] h-4 text-orange-500 border-orange-500 px-1 uppercase">
                            Limited Stock
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">₹{item.price}/{item.unit} · Available: {item.max} {item.unit}</p>
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
              <span className="text-xl font-bold">Items Total: ₹{itemsTotal.toFixed(1)}</span>
              <Button onClick={() => setCheckoutStep("location")} disabled={itemsInCart.length === 0 || !isOpen} className="gradient-saffron text-accent-foreground font-bold">
                Confirm Items <ArrowRight className="ml-2 w-4" />
              </Button>
            </Card>
          </motion.div>
        )}

        {checkoutStep === "location" && (
          <motion.div key="loc" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <h2 className="text-2xl font-bold">Delivery Options</h2>
            <Card className="p-4 space-y-4">
              <div className="flex gap-4 mb-4">
                <Button
                  variant={deliveryType === "pickup" ? "default" : "outline"}
                  className={`flex-1 ${deliveryType === "pickup" ? "gradient-saffron text-accent-foreground" : ""}`}
                  onClick={() => setDeliveryType("pickup")}
                >
                  Store Pickup
                </Button>
                <Button
                  variant={deliveryType === "delivery" ? "default" : "outline"}
                  className={`flex-1 ${deliveryType === "delivery" ? "gradient-saffron text-accent-foreground" : ""}`}
                  onClick={() => setDeliveryType("delivery")}
                >
                  Home Delivery
                </Button>
              </div>

              {deliveryType === "delivery" && (
                <>
                  {(!availableBoys || availableBoys.length === 0) ? (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex flex-col items-center gap-2 text-center">
                      <AlertCircle className="w-8 h-8 opacity-50" />
                      <div>
                        <p className="font-bold">Home Delivery Unavailable</p>
                        <p className="text-[10px] opacity-80">No delivery partners are currently assigned to this shop. Please choose "Store Pickup" instead.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-indian-green/5 border border-indian-green/20 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indian-green/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-indian-green" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-indian-green">Delivery Service Available</p>
                        <p className="text-[10px] text-muted-foreground">{availableBoys.length} partners ready for {shop?.name || "this shop"}</p>
                      </div>
                    </div>
                  )}

                  <div className="h-[300px] rounded-lg overflow-hidden border mt-4 relative bg-muted">
                    {(() => {
                      const isValidLoc = typeof deliveryLoc.lat === 'number' && typeof deliveryLoc.lng === 'number' &&
                        !isNaN(deliveryLoc.lat) && !isNaN(deliveryLoc.lng);

                      if (!isValidLoc) {
                        return (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-muted text-muted-foreground text-center">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-xs">Location coordinates are invalid. Please check your profile or select on map.</p>
                          </div>
                        );
                      }

                      return (
                        <MapContainer
                          center={[deliveryLoc.lat, deliveryLoc.lng]}
                          zoom={13}
                          style={{ height: "100%", width: "100%" }}
                          scrollWheelZoom={false}
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Marker position={[deliveryLoc.lat, deliveryLoc.lng]} />
                          <MapEventsHandler setLoc={setDeliveryLoc} />
                        </MapContainer>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground italic text-center">Click on the map to change delivery point if needed</p>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Address Details</label>
                    <textarea
                      className="w-full p-3 rounded-md border text-sm"
                      value={deliveryLoc.address}
                      onChange={e => setDeliveryLoc(p => ({ ...p, address: e.target.value }))}
                      placeholder="Enter your full address..."
                    />
                  </div>
                </>
              )}

              {deliveryType === "pickup" && (
                <div className="py-8 text-center bg-secondary/20 rounded-lg border border-dashed">
                  <Store className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-sm font-medium">You will pick up your items from:</p>
                  <p className="text-xs text-muted-foreground mt-1">{shop?.name || "Selected Shop"}<br />{shop?.address || "Store Address"}</p>
                </div>
              )}

              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setCheckoutStep("cart")} className="flex-1">Back</Button>
                <Button
                  onClick={() => setCheckoutStep("payment")}
                  disabled={deliveryType === "delivery" && (!availableBoys || availableBoys.length === 0)}
                  className="flex-1 gradient-saffron text-accent-foreground font-bold"
                >
                  Go to Payment
                </Button>
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
                {deliveryType === "delivery" && (
                  <p className="text-[10px] text-muted-foreground mt-1 text-center">
                    Items: ₹{itemsTotal.toFixed(1)} + Delivery: ₹{deliveryCharge} {tipAmount > 0 && `+ Tip: ₹${tipAmount}`}
                  </p>
                )}
              </div>
              <CardContent className="p-6 space-y-6">
                {deliveryType === "delivery" && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Add Tip for Delivery Boy (Optional)</p>
                    <div className="flex gap-2">
                      {[10, 20, 50].map((amt) => (
                        <Button
                          key={amt}
                          type="button"
                          variant={tipAmount === amt ? "default" : "outline"}
                          className={`flex-1 h-9 ${tipAmount === amt ? "gradient-saffron text-accent-foreground border-none" : ""}`}
                          onClick={() => setTipAmount(tipAmount === amt ? 0 : amt)}
                        >
                          ₹{amt}
                        </Button>
                      ))}
                      <Input
                        type="number"
                        placeholder="Custom"
                        className="w-20 h-9"
                        onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Select Payment Method</p>
                  <div className="grid gap-3">
                    <div
                      className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${paymentMethod === 'wallet' ? "border-indian-green bg-indian-green/5 ring-1 ring-indian-green" : "border-muted hover:border-indian-green/50"}`}
                      onClick={() => setPaymentMethod('wallet')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded border flex items-center justify-center shadow-sm">
                          <Wallet className={`w-5 h-5 ${paymentMethod === 'wallet' ? "text-indian-green" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Ration Wallet</p>
                          <p className="text-[10px] text-muted-foreground">Balance: ₹{(user?.balance || 0).toFixed(2)}</p>
                        </div>
                      </div>
                      {paymentMethod === 'wallet' && <CheckCircle2 className="w-5 h-5 text-indian-green" />}
                    </div>

                    <div
                      className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${paymentMethod === 'upi' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-muted hover:border-primary/50"}`}
                      onClick={() => setPaymentMethod('upi')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded border flex items-center justify-center shadow-sm text-[10px] font-bold">UPI</div>
                        <span className="font-semibold text-sm">UPI (GPay, PhonePe)</span>
                      </div>
                      {paymentMethod === 'upi' && <CheckCircle2 className="w-5 h-5 text-primary" />}
                    </div>

                    <div className="p-4 border rounded-xl flex items-center gap-3 opacity-50 cursor-not-allowed bg-muted/20">
                      <div className="w-10 h-10 bg-white rounded border flex items-center justify-center shadow-sm"><CreditCard className="w-5 h-5 text-muted-foreground" /></div>
                      <span className="font-semibold text-sm text-muted-foreground">Credit / Debit Card</span>
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
      </div>
    </ErrorBoundary>
  );
};



export default PurchasePage;

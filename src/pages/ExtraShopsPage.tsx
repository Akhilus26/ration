import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { sql, type Shop } from "@/lib/db";
import { Store, MapPin, Search, ShoppingBag, ArrowRight, Loader2, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

const ExtraShopsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const loadShops = async () => {
            if (!user?.lat || !user?.lng) return;
            setLoading(true);
            const allShops = await sql.findShopsByRadius(user.lat, user.lng, 10);
            setShops(allShops.filter(s => s.type === "extra"));
            setLoading(false);
        };
        loadShops();
    }, [user]);

    const filteredShops = shops.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-indian-green" />
                        Nearby Extra Shops
                    </h1>
                    <p className="text-muted-foreground mt-1">Browse and buy low-rate items from local stores within 10km of your location.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search shops..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {filteredShops.length === 0 ? (
                <Card className="p-12 text-center border-dashed">
                    <Store className="w-12 h-12 mx-auto mb-4 opacity-20 text-muted-foreground" />
                    <h3 className="text-lg font-bold">No Extra Shops Found</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                        There are currently no extra shops registered in your pincode area.
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredShops.map((shop, i) => (
                        <motion.div
                            key={shop.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="h-full hover:shadow-card-hover transition-all border-indian-green/10 flex flex-col overflow-hidden group">
                                <div className="h-32 bg-indian-green/5 flex items-center justify-center relative overflow-hidden">
                                    <Store className="w-12 h-12 text-indian-green/20 group-hover:scale-110 transition-transform duration-500" />
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        <Badge className="bg-indian-green text-white border-0">LOW RATE</Badge>
                                        {(() => {
                                            const isShopOpen = shop.isManualOpen !== false && (!shop.openingTime || !shop.closingTime || (() => {
                                                const now = new Date();
                                                const current = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                                                return current >= shop.openingTime && current <= shop.closingTime;
                                            })());
                                            return (
                                                <Badge variant={isShopOpen ? "secondary" : "destructive"} className={`text-[8px] h-5 border-0 ${isShopOpen ? "bg-indian-green text-white" : "bg-destructive text-white"}`}>
                                                    {isShopOpen ? "OPEN" : "CLOSED"}
                                                </Badge>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg leading-tight">{shop.name}</CardTitle>
                                    <div className="flex flex-col gap-1 mt-1">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {shop.address}
                                        </p>
                                        <p className="text-[10px] font-bold text-indian-green flex items-center gap-1">
                                            <Navigation className="w-2.5 h-2.5" /> {(shop as any).distance} km away
                                        </p>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col justify-end pt-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">FLOUR</Badge>
                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">PULSES</Badge>
                                        <Badge variant="outline" className="text-[10px] text-muted-foreground">OILS</Badge>
                                    </div>
                                    <Button
                                        className="w-full bg-indian-green hover:bg-indian-green/90 text-white font-bold"
                                        onClick={() => navigate(`/beneficiary/purchase?shop=${shop.id}`)}
                                    >
                                        View Items & Shop
                                        <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ExtraShopsPage;

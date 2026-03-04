import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { sql, type Stock, type Shop } from "@/lib/db";
import { Package, Plus, Search, AlertCircle, Save, Trash2, Wheat, Droplets, Flame, Sparkles, Clock, Power } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ITEMS = [
    { name: "Rice", unit: "kg", icon: Wheat },
    { name: "Wheat", unit: "kg", icon: Wheat },
    { name: "Sugar", unit: "kg", icon: Droplets },
    { name: "Kerosene", unit: "L", icon: Flame },
    { name: "Mustard Oil", unit: "L", icon: Droplets },
    { name: "Salt", unit: "kg", icon: Droplets },
    { name: "Lentils", unit: "kg", icon: Wheat },
];

const ShopkeeperStock = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [shop, setShop] = useState<Shop | null>(null);
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [form, setForm] = useState({
        itemName: "Rice",
        customItemName: "",
        quantity: "",
        limitPerCard: "",
        price: "",
        unit: "kg"
    });
    const [quotaItems, setQuotaItems] = useState<string[]>([]);
    const [isCustomItem, setIsCustomItem] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const fetchData = async () => {
        if (!user?.id) return;
        setLoading(true);
        const myShop = await sql.getShopByShopkeeperId(user.id);
        if (myShop) {
            setShop(myShop);
            const inventory = await sql.getShopStock(myShop.id);
            setStocks(inventory);

            // Fetch quota items
            const allQuotas = await sql.getAllQuotas();
            const uniqueItems = Array.from(new Set(allQuotas.map((q: any) => q.itemName))) as string[];
            setQuotaItems(uniqueItems);

            // Set default item based on available items
            const availableItems = myShop.type === "ration"
                ? ITEMS.filter(i => uniqueItems.includes(i.name))
                : ITEMS;

            if (availableItems.length > 0) {
                setForm(p => ({ ...p, itemName: availableItems[0].name }));
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleAddStock = async () => {
        if (!shop || !form.quantity) return;

        try {
            const finalItemName = isCustomItem ? form.customItemName : form.itemName;
            if (!finalItemName) {
                toast({ title: "Error", description: "Item name is required", variant: "destructive" });
                return;
            }

            const item = ITEMS.find(i => i.name === finalItemName);
            const unit = isCustomItem ? form.unit : (item?.unit || "kg");

            const data: any = {
                id: `stock-${shop.id}-${finalItemName}`,
                shopId: shop.id,
                itemName: finalItemName,
                quantity: parseFloat(form.quantity),
                unit: unit,
            };

            if (form.limitPerCard) data.limitPerCard = parseFloat(form.limitPerCard);
            if (form.price) data.price = parseFloat(form.price);

            await sql.updateOrInsertStock(data);

            toast({ title: "Stock Updated", description: `${finalItemName} inventory updated.` });
            setIsAddModalOpen(false);
            setForm(p => ({ ...p, quantity: "", limitPerCard: "", price: "", customItemName: "" }));
            setIsCustomItem(false);
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleUpdateShopStatus = async (updates: Partial<Shop>) => {
        if (!shop) return;
        setIsUpdatingStatus(true);
        try {
            await sql.updateShop(shop.id, updates);
            setShop({ ...shop, ...updates });
            toast({ title: "Status Updated", description: "Shop operational status updated successfully." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleDeleteStock = async (stockId: string) => {
        await sql.deleteStock(stockId);
        fetchData();
        toast({ title: "Item Removed", description: "Item removed from your shop inventory." });
    };

    const filteredStocks = stocks.filter(s =>
        s.itemName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const availableItems = shop?.type === "ration"
        ? ITEMS.filter(i => quotaItems.includes(i.name))
        : ITEMS;

    if (loading) return <div className="p-8 text-center">Loading inventory...</div>;
    if (!shop) return <div className="p-8 text-center text-destructive">No shop assigned to your account.</div>;

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Stock Management</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-muted-foreground">Manage items available at <span className="text-primary font-semibold">{shop.name}</span></p>
                        <Badge variant={shop.type === "ration" ? "default" : "secondary"} className="text-[10px]">
                            {shop.type.toUpperCase()} SHOP
                        </Badge>
                    </div>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="gradient-header text-primary-foreground font-semibold">
                    <Plus className="w-4 h-4 mr-2" /> Add/Update Item
                </Button>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Inventory Table */}
                <Card className="md:col-span-2 shadow-card overflow-hidden">
                    <CardHeader className="bg-secondary/20 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary" />
                                Current Inventory
                            </CardTitle>
                            <div className="relative w-48">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search items..."
                                    className="pl-8 h-8 text-xs"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Item Name</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Limit/Card</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStocks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            {searchQuery ? "No matching items found" : "Your inventory is empty. Add items to start selling."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStocks.map((stock) => {
                                        const meta = ITEMS.find(i => i.name === stock.itemName);
                                        const Icon = meta?.icon || Package;
                                        return (
                                            <TableRow key={stock.id} className="group">
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                                                            <Icon className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <span className="font-medium">{stock.itemName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-mono">{stock.quantity} {stock.unit}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs">{stock.limitPerCard ? `${stock.limitPerCard} ${stock.unit}` : "No Limit"}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs font-semibold">{stock.price ? `₹${stock.price}` : "--"}</span>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteStock(stock.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Info / Trends */}
                <div className="space-y-6">
                    <Card className="shadow-card border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                Shop Operational Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-secondary">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${shop.isManualOpen !== false ? "bg-indian-green/20 text-indian-green" : "bg-destructive/20 text-destructive"}`}>
                                        <Power className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold">{shop.isManualOpen !== false ? "Shop is OPEN" : "Shop is CLOSED"}</p>
                                        <p className="text-[10px] text-muted-foreground">Manual Override</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant={shop.isManualOpen !== false ? "destructive" : "default"}
                                    className="h-7 text-[10px]"
                                    disabled={isUpdatingStatus}
                                    onClick={() => handleUpdateShopStatus({ isManualOpen: shop.isManualOpen === false })}
                                >
                                    {shop.isManualOpen !== false ? "Close Shop" : "Open Shop"}
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Working Hours</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Opens At</Label>
                                        <Input
                                            type="time"
                                            className="h-8 text-xs"
                                            value={shop.openingTime || "09:00"}
                                            onChange={(e) => handleUpdateShopStatus({ openingTime: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px]">Closes At</Label>
                                        <Input
                                            type="time"
                                            className="h-8 text-xs"
                                            value={shop.closingTime || "17:00"}
                                            onChange={(e) => handleUpdateShopStatus({ closingTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <p className="text-[9px] text-muted-foreground italic">
                                    Beneficiaries can only place orders during these hours unless manually closed.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-card border-primary/20 bg-primary/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                Store Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold">Shop Type: {shop.type === "ration" ? "Ration Store" : "Extra Store"}</p>
                                <p className="text-[10px] text-muted-foreground">
                                    {shop.type === "ration"
                                        ? "Restricted to government approved quota items only."
                                        : "Can stock all listed commodities and extra items."}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span>Inventory Utilization</span>
                                    <span>{Math.min(stocks.length * 15, 100)}%</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${Math.min(stocks.length * 15, 100)}%` }} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-card">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-accent" />
                                Items Note
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground space-y-2">
                            {shop.type === "ration" ? (
                                <>
                                    <p className="font-semibold text-foreground text-accent">Ration Shop Restriction Active:</p>
                                    <p>You can only manage stock for basic ration items (Rice, Wheat, Sugar, etc.) as defined by government quota.</p>
                                </>
                            ) : (
                                <>
                                    <p>Extra shops (Low-rate stores) can list additional commodities like oils, pulses, etc.</p>
                                    <p className="font-semibold text-foreground">Ensure your stock reflects actual availability for beneficiaries.</p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add / Update Item Stock</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {shop.type === "ration" && (
                            <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-800 flex items-start gap-2">
                                <AlertCircle className="w-3 h-3 mt-0.5" />
                                <p>Ration stores are restricted to quota-approved items only.</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Item Type</Label>
                            <div className="flex gap-4 items-center">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="radio" checked={!isCustomItem} onChange={() => setIsCustomItem(false)} />
                                    Premade List
                                </label>
                                {shop.type === "extra" && (
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="radio" checked={isCustomItem} onChange={() => setIsCustomItem(true)} />
                                        Custom Item
                                    </label>
                                )}
                            </div>
                        </div>

                        {!isCustomItem ? (
                            <div className="space-y-2">
                                <Label>Select Item</Label>
                                <Select value={form.itemName} onValueChange={(v) => setForm(p => ({ ...p, itemName: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {availableItems.map(i => (
                                            <SelectItem key={i.name} value={i.name}>{i.name} ({i.unit})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label>Item Name</Label>
                                    <Input
                                        placeholder="e.g. Red Chilli Powder"
                                        value={form.customItemName}
                                        onChange={(e) => setForm(p => ({ ...p, customItemName: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unit</Label>
                                    <Select value={form.unit} onValueChange={(v) => setForm(p => ({ ...p, unit: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="kg">kilogram (kg)</SelectItem>
                                            <SelectItem value="L">Liter (L)</SelectItem>
                                            <SelectItem value="packet">packet</SelectItem>
                                            <SelectItem value="unit">unit</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        <div className={shop.type === "extra" ? "grid grid-cols-2 gap-4" : "w-full"}>
                            {shop.type === "extra" && (
                                <div className="space-y-2">
                                    <Label>Price (₹)</Label>
                                    <Input
                                        type="number"
                                        placeholder="Price per unit"
                                        value={form.price}
                                        onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))}
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Stock Amount</Label>
                                <Input
                                    type="number"
                                    placeholder="Quantity"
                                    value={form.quantity}
                                    onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))}
                                />
                            </div>
                        </div>

                        {shop.type === "extra" && (
                            <div className="space-y-2">
                                <Label>Per Card Purchase Limit (Optional)</Label>
                                <Input
                                    type="number"
                                    placeholder="Max units per card"
                                    value={form.limitPerCard}
                                    onChange={(e) => setForm(p => ({ ...p, limitPerCard: e.target.value }))}
                                />
                                <p className="text-[10px] text-muted-foreground italic">Restricts how many units a single card holder can buy.</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button className="gradient-header text-primary-foreground" onClick={handleAddStock}>
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ShopkeeperStock;

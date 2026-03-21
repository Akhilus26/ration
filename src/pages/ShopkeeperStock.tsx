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
    DialogDescription,
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
import { sql, type Stock, type Shop, type StockDelivery, type StockRequest, type Quota } from "@/lib/db";
import { Package, Plus, Search, AlertCircle, Save, Trash2, Wheat, Droplets, Flame, Clock, Power, Inbox, CheckCircle, ClipboardList, Send, Milk } from "lucide-react";
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

const getItemIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("rice") || n.includes("wheat") || n.includes("lentils")) return Wheat;
    if (n.includes("sugar") || n.includes("oil") || n.includes("salt")) return Droplets;
    if (n.includes("kerosene") || n.includes("fuel")) return Flame;
    if (n.includes("milk")) return Milk;
    return Package;
};

const ShopkeeperStock = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [shop, setShop] = useState<Shop | null>(null);
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [pendingDeliveries, setPendingDeliveries] = useState<StockDelivery[]>([]);
    const [myRequests, setMyRequests] = useState<StockRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [form, setForm] = useState({
        itemName: "Rice",
        customItemName: "",
        quantity: "",
        limitPerCard: "",
        price: "",
        unit: "kg"
    });
    const [quotas, setQuotas] = useState<Quota[]>([]);
    const [isCustomItem, setIsCustomItem] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [requestForm, setRequestForm] = useState({
        itemName: "Rice",
        quantity: "50",
        unit: "kg"
    });

    const fetchData = async () => {
        if (!user?.id) return;
        setLoading(true);
        const myShop = await sql.getShopByShopkeeperId(user.id);
        if (myShop) {
            setShop(myShop);
            const inventory = await sql.getShopStock(myShop.id);
            setStocks(inventory);
            
            const pending = await sql.getPendingStockDeliveries(myShop.id);
            setPendingDeliveries(pending);

            const requests = await sql.getShopStockRequests(myShop.id);
            setMyRequests(requests.sort((a, b) => b.date.localeCompare(a.date)));

            // Fetch quota items
            const allQuotas = await sql.getAllQuotas();
            setQuotas(allQuotas);

            // Set default item based on available items
            const dynamicAvailableItems = myShop.type === "ration"
                ? Array.from(new Set(allQuotas.map(q => q.itemName as string))).map(name => {
                    const quota = allQuotas.find(q => q.itemName === name);
                    const meta = ITEMS.find(i => i.name === name);
                    return {
                        name,
                        unit: (meta?.unit || quota?.unit || "kg") as string,
                        icon: meta?.icon || getItemIcon(name)
                    };
                })
                : ITEMS;

            if (dynamicAvailableItems.length > 0) {
                setForm(p => ({ ...p, itemName: dynamicAvailableItems[0].name as string }));
                setRequestForm(p => ({ 
                    ...p, 
                    itemName: dynamicAvailableItems[0].name as string,
                    unit: dynamicAvailableItems[0].unit as string
                }));
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

            // Notify nearby beneficiaries
            if (shop.lat && shop.lng) {
                await sql.notifyNearbyUsers(
                    shop.lat,
                    shop.lng,
                    10,
                    "New Stock Alert",
                    `new stock is added in this ${shop.name} shop: ${finalItemName}`,
                    'stock'
                );
            }

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

    const handleAcceptDelivery = async (delivery: StockDelivery) => {
        if (!shop) return;
        setIsUpdatingStatus(true);
        try {
            await sql.acceptStockDelivery(delivery.id, shop.id, delivery.items);
            
            if (shop.lat && shop.lng) {
                const itemsList = (delivery.items as any[]).map(i => i.itemName).join(", ");
            await sql.notifyNearbyUsers(
                shop.lat, 
                shop.lng, 
                10, 
                "Stock Reached! 🚛", 
                `Great news! New stock of ${itemsList} has just arrived at ${shop.name}. Visit soon to get your quota.`,
                'stock'
            );
            }

            // Notify Admin(s)
            const allUsers = await sql.getAllUsers();
            const admins = allUsers.filter(u => u.role === "admin");
            for (const admin of admins) {
                await sql.createNotification({
                    id: crypto.randomUUID(),
                    userId: admin.id,
                    title: "Stock Received",
                    message: `Stock has successfully reached ${shop.name}.`,
                    date: new Date().toISOString(),
                    read: false,
                    type: "system"
                });
            }
            
            toast({ title: "Stock Accepted", description: "Inventory has been updated and beneficiaries/admin notified successfully." });
            fetchData();
        } catch (error: any) {
             toast({ title: "Acceptance Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleRequestStock = async () => {
        if (!shop || !requestForm.quantity) return;
        setIsUpdatingStatus(true);
        try {
            const requestId = crypto.randomUUID();
            const request: StockRequest = {
                id: requestId,
                shopId: shop.id,
                shopName: shop.name,
                items: [{
                    itemName: requestForm.itemName,
                    quantity: parseFloat(requestForm.quantity),
                    unit: requestForm.unit
                }],
                status: "pending",
                date: new Date().toISOString()
            };

            await sql.createStockRequest(request);

            // Notify Admins
            const admins = (await sql.getAllUsers()).filter(u => u.role === "admin");
            for (const admin of admins) {
                await sql.createNotification({
                    id: crypto.randomUUID(),
                    userId: admin.id,
                    title: "New Stock Request",
                    message: `${shop.name} has requested ${requestForm.quantity} ${requestForm.unit} of ${requestForm.itemName}.`,
                    date: new Date().toISOString(),
                    read: false,
                    type: "stock"
                });
            }

            toast({ title: "Request Sent", description: "Your stock request has been sent to the admin for review." });
            setIsRequestModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast({ title: "Request Failed", description: error.message, variant: "destructive" });
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
        ? Array.from(new Set(quotas.map(q => q.itemName))).map(name => {
            const quota = quotas.find(q => q.itemName === name);
            const meta = ITEMS.find(i => i.name === name);
            const itemName = name as string;
            return {
                name: itemName,
                unit: (meta?.unit || quota?.unit || "kg") as string,
                icon: meta?.icon || getItemIcon(itemName)
            };
        })
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
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsRequestModalOpen(true)} className="border-primary text-primary hover:bg-primary/10">
                        <ClipboardList className="w-4 h-4 mr-2" /> Request Stock
                    </Button>
                    {shop.type !== "ration" && (
                        <Button onClick={() => setIsAddModalOpen(true)} className="gradient-header text-primary-foreground font-semibold">
                            <Plus className="w-4 h-4 mr-2" /> Add/Update Item
                        </Button>
                    )}
                </div>
            </motion.div>

            {pendingDeliveries.length > 0 && (
                <div className="space-y-4">
                    {pendingDeliveries.map(delivery => (
                        <Card key={delivery.id} className="border-blue-500 bg-blue-50/50 shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-blue-800 flex items-center gap-2 text-lg">
                                    <Inbox className="w-5 h-5" /> Incoming Stock Delivery from Admin
                                </CardTitle>
                                <CardDescription className="text-blue-600/80">
                                    Assigned on {new Date(delivery.date).toLocaleDateString()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex flex-wrap gap-2">
                                        {delivery.items.map((item, i) => (
                                            <Badge key={i} variant="outline" className="bg-white text-blue-800 border-blue-200">
                                                {item.quantity} {item.unit} {item.itemName}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-sm font-medium text-blue-800">Did the stock reach you?</p>
                                        <Button 
                                            onClick={() => handleAcceptDelivery(delivery)}
                                            disabled={isUpdatingStatus}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" /> Yes, Confirm Receipt
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

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
                                         const Icon = getItemIcon(stock.itemName);
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

                            <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
                                <div className={`p-2 rounded-full ${sql.isShopOpen(shop) ? "bg-indian-green/20 text-indian-green" : "bg-destructive/20 text-destructive"}`}>
                                    <Power className="w-4 h-4" />
                                </div>
                                    <div>
                                        <p className="text-xs font-bold">{sql.isShopOpen(shop) ? "Shop is OPEN" : "Shop is CLOSED"}</p>
                                        <p className="text-[10px] text-muted-foreground">Manual Control Only</p>
                                    </div>
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
                                <div className="space-y-1 mt-2">
                                    <Label className="text-[10px]">Lunch Break</Label>
                                    <Input
                                        placeholder="e.g. 13:00 - 14:00"
                                        className="h-8 text-xs"
                                        value={shop.lunchTime || ""}
                                        onChange={(e) => handleUpdateShopStatus({ lunchTime: e.target.value })}
                                    />
                                </div>
                                <p className="text-[9px] text-muted-foreground italic mt-2">
                                    Display only. Opening and closing is managed manually by you.
                                </p>
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

                    {myRequests.length > 0 && (
                        <Card className="shadow-card overflow-hidden">
                            <CardHeader className="bg-secondary/10 pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4 text-primary" />
                                    My Recent Requests
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableBody>
                                        {myRequests.slice(0, 5).map((req) => (
                                            <TableRow key={req.id} className="text-[10px]">
                                                <TableCell className="py-2">
                                                    {req.items.map(i => `${i.itemName} (${i.quantity}${i.unit})`).join(", ")}
                                                </TableCell>
                                                <TableCell className="py-2 text-right">
                                                    <Badge className="text-[8px] px-1 h-4" variant={
                                                        req.status === "approved" ? "default" :
                                                        req.status === "rejected" ? "destructive" :
                                                        req.status === "modified" ? "secondary" : "outline"
                                                    }>
                                                        {req.status.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
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

            <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Request Stock from Admin</DialogTitle>
                        <DialogDescription>
                            Submit a request for items you need based on current demand.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Item Name</Label>
                            <Select value={requestForm.itemName} onValueChange={(v) => setRequestForm(p => ({ ...p, itemName: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                     {availableItems.map(item => (
                                         <SelectItem key={item.name} value={item.name}>
                                             {item.name}
                                         </SelectItem>
                                     ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Quantity</Label>
                                <Input
                                    type="number"
                                    value={requestForm.quantity}
                                    onChange={(e) => setRequestForm(p => ({ ...p, quantity: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit</Label>
                                <Select value={requestForm.unit} onValueChange={(v) => setRequestForm(p => ({ ...p, unit: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kg">kg</SelectItem>
                                        <SelectItem value="L">L</SelectItem>
                                        <SelectItem value="packet">packet</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRequestModalOpen(false)}>Cancel</Button>
                        <Button className="gradient-header text-primary-foreground" onClick={handleRequestStock} disabled={isUpdatingStatus}>
                            <Send className="w-4 h-4 mr-2" /> Submit Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ShopkeeperStock;

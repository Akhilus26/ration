import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sql, type Shop, type User } from "@/lib/db";
import { Store, MapPin, Users, Plus, Globe, Settings2, Trash2, CheckCircle2, XCircle, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AdminShopsPage = () => {
    const { toast } = useToast();
    const [shops, setShops] = useState<Shop[]>([]);
    const [shopkeepers, setShopkeepers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShop, setEditingShop] = useState<Shop | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        address: "",
        pincodes: "",
        shopkeeperId: "",
        type: "ration" as "ration" | "extra",
        gmail: "",
        shopkeeperName: "",
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [allShops, allUsers] = await Promise.all([
                sql.getAllShops(),
                sql.getAllUsers()
            ]);
            setShops(allShops || []);
            setShopkeepers((allUsers || []).filter(u => u.role === "shopkeeper"));
        } catch (error: any) {
            console.error("Data fetching error:", error);
            toast({ title: "Error", description: "Failed to load shops data.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openAddModal = () => {
        setEditingShop(null);
        setFormData({ name: "", address: "", pincodes: "", shopkeeperId: "", type: "ration", gmail: "", shopkeeperName: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (shop: Shop) => {
        setEditingShop(shop);
        const sk = shopkeepers.find(u => u.id === shop.shopkeeperId);
        setFormData({
            name: shop.name,
            address: shop.address,
            pincodes: shop.serviceAreas.join(", "),
            shopkeeperId: shop.shopkeeperId || "none",
            type: shop.type,
            gmail: shop.gmail || "",
            shopkeeperName: shop.shopkeeperName || (sk ? sk.name : ""),
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.address || !formData.pincodes || !formData.gmail || !formData.shopkeeperName) {
            toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        const serviceAreas = formData.pincodes.split(",").map(s => s.trim()).filter(Boolean);

        try {
            // 1. Find or Create Shopkeeper User
            let shopkeeperId = "";
            const existingUser = await sql.getUserByEmail(formData.gmail, "shopkeeper");

            if (existingUser) {
                shopkeeperId = existingUser.id;
                // Update user name if it changed
                if (existingUser.name !== formData.shopkeeperName) {
                    await sql.updateUser(shopkeeperId, { name: formData.shopkeeperName });
                }
            } else {
                shopkeeperId = crypto.randomUUID();
                await sql.insertUser({
                    id: shopkeeperId,
                    name: formData.shopkeeperName,
                    email: formData.gmail,
                    role: "shopkeeper",
                    password: "password123" // Default password
                });
            }

            const status = "ready";

            if (editingShop) {
                // If shopkeeper changed, clean up old shopkeeper
                if (editingShop.shopkeeperId && editingShop.shopkeeperId !== shopkeeperId) {
                    await sql.updateUser(editingShop.shopkeeperId, { assignedShopId: undefined });
                }

                await sql.updateShop(editingShop.id, {
                    name: formData.name,
                    address: formData.address,
                    serviceAreas,
                    shopkeeperId,
                    status,
                    type: formData.type,
                    gmail: formData.gmail,
                    shopkeeperName: formData.shopkeeperName
                });

                // Update shopkeeper's assignedShopId
                await sql.updateUser(shopkeeperId, { assignedShopId: editingShop.id });

                toast({ title: "Success", description: "Shop and Manager updated." });
            } else {
                const newShopId = `shop-${Date.now()}`;
                await sql.insertShop({
                    id: newShopId,
                    name: formData.name,
                    address: formData.address,
                    lat: 28.6139 + (Math.random() - 0.5) * 0.1,
                    lng: 77.2090 + (Math.random() - 0.5) * 0.1,
                    serviceAreas,
                    shopkeeperId,
                    status,
                    type: formData.type,
                    gmail: formData.gmail,
                    shopkeeperName: formData.shopkeeperName
                });

                // Update shopkeeper's assignedShopId
                await sql.updateUser(shopkeeperId, { assignedShopId: newShopId });

                toast({ title: "Success", description: "New shop registered." });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast({ title: "Failed", description: error.message, variant: "destructive" });
        }
    };

    const handleDeleteShop = async () => {
        if (!shopToDelete) return;
        try {
            // Unassign shopkeeper if any
            if (shopToDelete.shopkeeperId) {
                await sql.updateUser(shopToDelete.shopkeeperId, { assignedShopId: undefined });
            }
            await sql.deleteShop(shopToDelete.id);
            toast({ title: "Shop Deleted", description: `${shopToDelete.name} has been removed.` });
            setIsDeleteModalOpen(false);
            setShopToDelete(null);
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleApproveShop = async (shopId: string) => {
        try {
            await sql.approveShop(shopId);
            toast({ title: "Shop Approved", description: "The shop is now active and ready for assignment." });
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleRejectShop = async (shopId: string) => {
        try {
            await sql.rejectShop(shopId);
            toast({ title: "Shop Rejected", description: "The application has been moved to the rejected list.", variant: "destructive" });
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const getShopkeeperName = (id?: string) => {
        if (!id || id === "none") return "Unassigned";
        const sk = shopkeepers.find(u => u.id === id);
        return sk ? sk.name : "Unknown";
    };

    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Shop Management</h1>
                    <p className="text-muted-foreground mt-1">Manage Fair Price Shops and their service areas</p>
                </div>
                <Button onClick={openAddModal} className="gradient-saffron text-accent-foreground font-semibold">
                    <Plus className="w-4 h-4 mr-2" /> Add New Shop
                </Button>
            </motion.div>

            <Tabs defaultValue="approved" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
                    <TabsTrigger value="approved">Approved & Active</TabsTrigger>
                    <TabsTrigger value="pending">
                        Pending Approvals
                        {shops.filter(s => s.status === "pending").length > 0 && (
                            <Badge className="ml-2 bg-primary text-primary-foreground h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                {shops.filter(s => s.status === "pending").length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>

                <TabsContent value="approved" className="mt-6">
                    <Card className="shadow-card overflow-hidden">
                        <CardHeader className="bg-secondary/20 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Store className="w-5 h-5 text-primary" />
                                Active Ration Shops ({shops.filter(s => s.status !== "pending" && s.status !== "rejected").length})
                            </CardTitle>
                            <CardDescription>Approved distribution centers and extra stores</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="pl-6">Shop Details</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Service Areas</TableHead>
                                        <TableHead>Shopkeeper</TableHead>
                                        <TableHead className="text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                                    Loading shops...
                                                </motion.div>
                                            </TableCell>
                                        </TableRow>
                                    ) : shops.filter(s => s.status !== "pending" && s.status !== "rejected").length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No shops configured</TableCell>
                                        </TableRow>
                                    ) : (
                                        shops.filter(s => s.status !== "pending" && s.status !== "rejected").map((shop, i) => (
                                            <TableRow key={shop.id} className="group hover:bg-secondary/10">
                                                <TableCell className="pl-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{shop.name}</span>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                            <MapPin className="w-3 h-3" /> {shop.address}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={shop.type === "ration" ? "default" : "outline"} className="text-[10px]">
                                                        {shop.type === "ration" ? "RATION" : "EXTRA"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {shop.serviceAreas.map(area => (
                                                            <Badge key={area} variant="outline" className="text-[10px] py-0 bg-background/50 border-primary/20 text-primary font-mono">{area}</Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                                                <Users className="w-3.5 h-3.5 text-primary" />
                                                            </div>
                                                            <span className="text-sm font-medium">{shop.shopkeeperName || getShopkeeperName(shop.shopkeeperId)}</span>
                                                        </div>
                                                        <Badge
                                                            variant={shop.status === "ready" ? "default" : "secondary"}
                                                            className={shop.status === "ready" ? "bg-emerald-500 text-white hover:bg-emerald-600 w-fit text-[10px]" : "w-fit text-[10px]"}
                                                        >
                                                            {shop.status.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => openEditModal(shop)}>
                                                            <Settings2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { setShopToDelete(shop); setIsDeleteModalOpen(true); }}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pending" className="mt-6">
                    <Card className="shadow-card overflow-hidden">
                        <CardHeader className="bg-amber-500/10 border-b border-amber-500/20 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
                                <Shield className="w-5 h-5" />
                                Pending Applications ({shops.filter(s => s.status === "pending").length})
                            </CardTitle>
                            <CardDescription>Review and approve new shop registration requests</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="pl-6">Shop Details</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Service Areas</TableHead>
                                        <TableHead>Applicant</TableHead>
                                        <TableHead className="text-right pr-6">Approvals</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shops.filter(s => s.status === "pending").length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No pending applications</TableCell>
                                        </TableRow>
                                    ) : (
                                        shops.filter(s => s.status === "pending").map((shop) => (
                                            <TableRow key={shop.id} className="group hover:bg-secondary/10">
                                                <TableCell className="pl-6">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-foreground">{shop.name}</span>
                                                            <Badge variant={shop.type === "ration" ? "default" : "outline"} className="text-[10px] scale-90 origin-left">
                                                                {shop.type === "ration" ? "RATION" : "EXTRA"}
                                                            </Badge>
                                                        </div>
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                            <MapPin className="w-3 h-3" /> {shop.address}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        {shop.type === "ration" ? "RATION" : "EXTRA"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {shop.serviceAreas.map(area => (
                                                            <Badge key={area} variant="outline" className="text-[10px]">{area}</Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <Users className="w-3.5 h-3.5 text-primary" />
                                                        </div>
                                                        <span className="text-sm font-medium">{shop.shopkeeperName || getShopkeeperName(shop.shopkeeperId)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"
                                                            onClick={() => handleApproveShop(shop.id)}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" /> Approve
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-destructive hover:bg-destructive/10 gap-1"
                                                            onClick={() => handleRejectShop(shop.id)}
                                                        >
                                                            <XCircle className="w-4 h-4" /> Reject
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="rejected" className="mt-6">
                    <Card className="shadow-card overflow-hidden">
                        <CardHeader className="bg-destructive/10 border-b border-destructive/20 pb-4">
                            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                                <XCircle className="w-5 h-5" />
                                Rejected Applications ({shops.filter(s => s.status === "rejected").length})
                            </CardTitle>
                            <CardDescription>Archive of rejected registration requests</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="pl-6">Shop Details</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Applicant</TableHead>
                                        <TableHead className="text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shops.filter(s => s.status === "rejected").length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No rejected applications</TableCell>
                                        </TableRow>
                                    ) : (
                                        shops.filter(s => s.status === "rejected").map((shop) => (
                                            <TableRow key={shop.id} className="group hover:bg-secondary/10">
                                                <TableCell className="pl-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-foreground">{shop.name}</span>
                                                        <span className="text-xs text-muted-foreground">{shop.address}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px] uppercase">{shop.type}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-medium">{getShopkeeperName(shop.shopkeeperId)}</span>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => handleApproveShop(shop.id)} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                                            Re-consider
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setShopToDelete(shop); setIsDeleteModalOpen(true); }}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingShop ? "Edit Shop Details" : "Register New Shop"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Shop Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g. South Delhi Ration Center"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address *</Label>
                            <Textarea
                                id="address"
                                placeholder="Full address of the shop"
                                value={formData.address}
                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pincodes">Service Areas (Pincodes) *</Label>
                            <Input
                                id="pincodes"
                                placeholder="110001, 110002, ward-5 (comma separated)"
                                value={formData.pincodes}
                                onChange={(e) => setFormData(prev => ({ ...prev, pincodes: e.target.value }))}
                            />
                            <p className="text-[10px] text-muted-foreground">List all areas covered by this shop, separated by commas.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shopkeeperName">Shopkeeper/Manager Name *</Label>
                            <Input
                                id="shopkeeperName"
                                placeholder="e.g. Anoop Kumar"
                                value={formData.shopkeeperName}
                                onChange={(e) => setFormData(prev => ({ ...prev, shopkeeperName: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gmail">Manager/Shop Email (for Login) *</Label>
                            <Input
                                id="gmail"
                                type="email"
                                placeholder="manager.official@gmail.com"
                                value={formData.gmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, gmail: e.target.value }))}
                            />
                            <p className="text-[10px] text-muted-foreground">This email will be used for shop manager login.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button className="gradient-saffron text-accent-foreground font-semibold" onClick={handleSubmit}>
                            {editingShop ? "Update Shop" : "Save Shop"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Confirm Shop Deletion</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete <span className="font-bold text-foreground">"{shopToDelete?.name}"</span>?
                            This will also unassign any shopkeeper currently mapped to this shop.
                        </p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteShop}>Confirm Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="py-4 flex items-start gap-3">
                    <Globe className="w-5 h-5 text-primary mt-0.5" />
                    <div className="text-sm">
                        <p className="font-semibold text-primary">Area Matching Note</p>
                        <p className="text-primary/70">
                            When a beneficiary enters their Pincode or Ward during registration, the system searches these "Service Areas" to find a match.
                            Multiple pincodes can be assigned to a single shop.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminShopsPage;

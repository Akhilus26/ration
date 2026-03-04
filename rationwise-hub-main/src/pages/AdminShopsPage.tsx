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
import { sql, type Shop, type User } from "@/lib/db";
import { Store, MapPin, Users, Plus, Globe, Settings2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const AdminShopsPage = () => {
    const { toast } = useToast();
    const [shops, setShops] = useState<Shop[]>([]);
    const [shopkeepers, setShopkeepers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShop, setEditingShop] = useState<Shop | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        pincodes: "",
        shopkeeperId: "",
    });

    const fetchData = async () => {
        setLoading(true);
        const [allShops, allUsers] = await Promise.all([
            sql.getAllShops(),
            sql.getAllUsers()
        ]);
        setShops(allShops);
        setShopkeepers(allUsers.filter(u => u.role === "shopkeeper"));
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openAddModal = () => {
        setEditingShop(null);
        setFormData({ name: "", address: "", pincodes: "", shopkeeperId: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (shop: Shop) => {
        setEditingShop(shop);
        setFormData({
            name: shop.name,
            address: shop.address,
            pincodes: shop.serviceAreas.join(", "),
            shopkeeperId: shop.shopkeeperId || "none",
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.address || !formData.pincodes) {
            toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        const serviceAreas = formData.pincodes.split(",").map(s => s.trim()).filter(Boolean);
        const shopkeeperId = formData.shopkeeperId === "none" ? undefined : formData.shopkeeperId;

        try {
            if (editingShop) {
                await sql.updateShop(editingShop.id, {
                    name: formData.name,
                    address: formData.address,
                    serviceAreas,
                    shopkeeperId,
                });
                toast({ title: "Success", description: "Shop updated successfully." });
            } else {
                await sql.insertShop({
                    id: `shop-${Date.now()}`,
                    name: formData.name,
                    address: formData.address,
                    lat: 28.6139 + (Math.random() - 0.5) * 0.1, // Random nearby lat
                    lng: 77.2090 + (Math.random() - 0.5) * 0.1, // Random nearby lng
                    serviceAreas,
                    shopkeeperId,
                });
                toast({ title: "Success", description: "New shop added." });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast({ title: "Failed", description: error.message, variant: "destructive" });
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

            <Card className="shadow-card overflow-hidden">
                <CardHeader className="bg-secondary/20 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Store className="w-5 h-5 text-primary" />
                        Active Ration Shops ({shops.length})
                    </CardTitle>
                    <CardDescription>All configured distribution centers</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6">Shop Details</TableHead>
                                <TableHead>Service Areas</TableHead>
                                <TableHead>Shopkeeper</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                            Loading shops...
                                        </motion.div>
                                    </TableCell>
                                </TableRow>
                            ) : shops.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No shops configured</TableCell>
                                </TableRow>
                            ) : (
                                shops.map((shop, i) => (
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
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {shop.serviceAreas.map(area => (
                                                    <Badge key={area} variant="outline" className="text-[10px] py-0 bg-background/50 border-primary/20 text-primary font-mono">{area}</Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Users className="w-3.5 h-3.5 text-primary" />
                                                </div>
                                                <span className="text-sm font-medium">{getShopkeeperName(shop.shopkeeperId)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => openEditModal(shop)}>
                                                    <Settings2 className="w-4 h-4" />
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
                            <Label>Assign Shopkeeper</Label>
                            <Select
                                value={formData.shopkeeperId}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, shopkeeperId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a shopkeeper" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Unassigned</SelectItem>
                                    {shopkeepers.map((sk) => (
                                        <SelectItem key={sk.id} value={sk.id}>{sk.name} ({sk.email})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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

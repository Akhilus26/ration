import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { sql, User, Shop } from "@/lib/db";
import { toast } from "sonner";
import { UserPlus, Users, Loader2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const ShopkeeperDeliveryBoys = () => {
    const { user } = useAuth();
    const [shop, setShop] = useState<Shop | null>(null);
    const [deliveryBoys, setDeliveryBoys] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phoneNumber: "",
    });

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        const s = await sql.getShopByShopkeeperId(user!.id);
        if (s) {
            setShop(s);
            const boys = await sql.getDeliveryBoysByShop(s.id);
            setDeliveryBoys(boys);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shop) return;
        setSubmitting(true);

        try {
            const newUser: User = {
                id: crypto.randomUUID(),
                name: formData.name,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                role: "delivery_boy",
                assignedShopId: shop.id,
            };

            await sql.insertUser(newUser);
            toast.success("Delivery partner registered successfully");
            setFormData({ name: "", email: "", phoneNumber: "" });
            loadData();
        } catch (error) {
            toast.error("Failed to register delivery boy");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to remove this delivery boy?")) {
            await sql.deleteUser(id);
            toast.success("Delivery boy removed");
            loadData();
        }
    };

    if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    return (
        <div className="space-y-6 max-w-5xl">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl font-bold text-foreground">Manage Delivery Boys</h1>
                <p className="text-muted-foreground mt-1">Register and manage delivery personnel for {shop?.name}</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 shadow-card">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-accent" />
                            Register New
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input
                                    id="name"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email address (Gmail)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@gmail.com"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    required
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    placeholder="+91 98765 43210"
                                    autoComplete="off"
                                />
                            </div>
                            <Button type="submit" className="w-full gradient-saffron" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Delivery Boy
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 shadow-card">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            Active Personnel
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {deliveryBoys.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No delivery boys registered yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {deliveryBoys.map((boy) => (
                                    <div key={boy.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
                                        <div>
                                            <p className="font-bold text-foreground">{boy.name}</p>
                                            <p className="text-xs text-muted-foreground">{boy.email} • {boy.phoneNumber}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(boy.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ShopkeeperDeliveryBoys;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Wheat, Info, Save, RotateCcw, Settings2, Plus, Trash2, Droplets, Flame, Milk } from "lucide-react";
import { sql, type Quota } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

const AdminQuotaSettings = () => {
    const { toast } = useToast();
    const [quotas, setQuotas] = useState<Quota[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [tempQuotas, setTempQuotas] = useState<Quota[]>([]);

    const fetchData = async () => {
        setLoading(true);
        const allQuotas = await sql.getAllQuotas();
        setQuotas(allQuotas);
        // Sync these with the ITEMS list in ShopkeeperStock.tsx if needed
        setLoading(false);
    };

    const getItemIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes("rice") || n.includes("wheat") || n.includes("lentils")) return Wheat;
        if (n.includes("sugar") || n.includes("oil") || n.includes("salt")) return Droplets;
        if (n.includes("kerosene") || n.includes("fuel")) return Flame;
        if (n.includes("milk")) return Milk;
        return Info;
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openEditModal = (category: string) => {
        const categoryQuotas = quotas.filter(q => q.category === category);
        setEditingCategory(category);
        setTempQuotas(JSON.parse(JSON.stringify(categoryQuotas))); // Deep copy
        setIsModalOpen(true);
    };

    const handleUpdateTemp = (id: string, field: keyof Quota, value: any) => {
        setTempQuotas(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const saveChanges = async () => {
        try {
            // Identify deleted items
            const originalCategoryQuotas = quotas.filter(q => q.category === editingCategory);
            const deletedIds = originalCategoryQuotas
                .filter(oq => !tempQuotas.some(tq => tq.id === oq.id))
                .map(dq => dq.id);

            // Perfrom deletions
            for (const id of deletedIds) {
                await sql.deleteQuota(id);
            }

            // Perform updates and insertions
            await Promise.all(tempQuotas.map(q => {
                const isNew = !originalCategoryQuotas.some(oq => oq.id === q.id);
                return isNew ? sql.insertQuota(q) : sql.updateQuota(q.id, q);
            }));

            toast({ title: "Success", description: `Quota rules for ${editingCategory} updated.` });
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const categories = ["AAY", "PHH", "NPHH"];
    const categoryNames: Record<string, string> = {
        AAY: "Antyodaya Anna Yojana",
        PHH: "Priority Household",
        NPHH: "Non-Priority Household"
    };

    const colors: Record<string, string> = {
        AAY: "bg-accent/10 border-accent text-accent-foreground",
        PHH: "bg-primary/10 border-primary text-primary",
        NPHH: "bg-muted border-muted-foreground/30 text-muted-foreground"
    };

    const resetToDefaults = async () => {
        try {
            await sql.resetQuotasToDefault();
            toast({ title: "Quotas Reset", description: "All rules have been restored to defaults." });
            setIsResetModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6 max-w-5xl">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl font-bold text-foreground">Quota Configuration</h1>
                <p className="text-muted-foreground mt-1">Configure monthly ration allocations for each category</p>
            </motion.div>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading allocation rules...</div>
                ) : categories.map((cat, idx) => {
                    const catQuotas = quotas.filter(q => q.category === cat);
                    return (
                        <motion.div
                            key={cat}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card className={`shadow-card overflow-hidden border-l-4 ${cat === 'AAY' ? 'border-l-accent' : cat === 'PHH' ? 'border-l-primary' : 'border-l-muted-foreground/30'}`}>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={colors[cat]}>{cat}</Badge>
                                                <CardTitle className="text-lg">{categoryNames[cat]}</CardTitle>
                                            </div>
                                            <CardDescription className="mt-1">Default monthly allocation per card/person</CardDescription>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => openEditModal(cat)}>
                                            <Settings2 className="w-4 h-4 mr-2" /> Edit Rules
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {catQuotas.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic col-span-4">No rules defined for this category.</p>
                                        ) : catQuotas.map((item) => (
                                            <div key={item.id} className="p-3 rounded-lg bg-secondary/40 border border-border/50 group hover:border-primary/30 transition-colors">
                                                 <div className="flex items-center gap-2 mb-2">
                                                     <div className="p-1 rounded bg-background/50">
                                                        {(() => {
                                                            const Icon = getItemIcon(item.itemName);
                                                            return <Icon className="w-4 h-4 text-accent" />;
                                                        })()}
                                                     </div>
                                                     <span className="text-sm font-semibold">{item.itemName}</span>
                                                 </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">Allocation:</span>
                                                        <span className="font-bold text-foreground">{item.amount} {item.unit}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">Price:</span>
                                                        <span className="font-medium">₹{item.price}/{item.unit.split('/')[0]}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Quota Rules: {editingCategory}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                        {tempQuotas.map((q) => {
                            const Icon = getItemIcon(q.itemName);
                            return (
                                <div key={q.id} className="p-4 rounded-lg bg-secondary/20 border border-border flex flex-col gap-3 group relative">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="p-1.5 rounded bg-background">
                                                <Icon className="w-4 h-4 text-primary" />
                                            </div>
                                            <Input 
                                                className="h-8 font-bold border-none bg-transparent p-0 focus-visible:ring-0 w-32"
                                                value={q.itemName}
                                                onChange={(e) => handleUpdateTemp(q.id, "itemName", e.target.value)}
                                                placeholder="Item Name"
                                            />
                                            <Input 
                                                className="h-7 text-[10px] w-16 bg-background/50"
                                                value={q.unit}
                                                onChange={(e) => handleUpdateTemp(q.id, "unit", e.target.value)}
                                                placeholder="Unit (kg)"
                                            />
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                            onClick={() => setTempQuotas(prev => prev.filter(t => t.id !== q.id))}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Allocation</Label>
                                            <Input
                                                type="number"
                                                value={q.amount}
                                                onChange={(e) => handleUpdateTemp(q.id, "amount", parseFloat(e.target.value))}
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Price (₹)</Label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={q.price}
                                                onChange={(e) => handleUpdateTemp(q.id, "price", parseFloat(e.target.value))}
                                                className="h-9"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <Button 
                            variant="outline" 
                            className="w-full border-dashed border-2 hover:border-primary/50 hover:bg-primary/5"
                            onClick={() => {
                                setTempQuotas(prev => [
                                    ...prev, 
                                    { 
                                        id: crypto.randomUUID(), 
                                        category: editingCategory!, 
                                        itemName: "", 
                                        amount: 0, 
                                        unit: "kg", 
                                        price: 0 
                                    }
                                ]);
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add New Item to Quota
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button className="gradient-saffron text-accent-foreground font-semibold" onClick={saveChanges}>
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-primary" />
                    <p className="text-sm text-primary/80">Changes to global quotas will take effect from the next distribution cycle.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="ghost" className="text-muted-foreground" onClick={() => setIsResetModalOpen(true)}><RotateCcw className="w-4 h-4 mr-2" /> Reset Defaults</Button>
                    <Button className="gradient-saffron text-accent-foreground font-semibold" onClick={fetchData}><RotateCcw className="w-4 h-4 mr-2" /> Refresh View</Button>
                </div>
            </div>
            <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reset to System Defaults</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to reset all quota rules to system defaults? This will overwrite all custom prices and allocation amounts.
                        </p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsResetModalOpen(false)}>Cancel</Button>
                        <Button className="gradient-saffron text-accent-foreground font-semibold" onClick={resetToDefaults}>Confirm Reset</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminQuotaSettings;

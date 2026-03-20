import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Settings2, Save, RotateCcw, Truck } from "lucide-react";
import { sql } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";

const AdminSettings = () => {
    const { toast } = useToast();
    const [settings, setSettings] = useState({ deliveryCharge: 10, petrolAllowance: 50 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const data = await sql.getSystemSettings();
            if (data) setSettings(data as { deliveryCharge: number, petrolAllowance: number });
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await sql.updateSystemSettings(settings);
            toast({ title: "Settings Saved", description: "Global configuration has been updated." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-muted-foreground">Loading system settings...</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
                <p className="text-muted-foreground mt-1">Configure global application parameters</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-card border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="w-5 h-5 text-primary" /> Delivery Configuration
                        </CardTitle>
                        <CardDescription>Set global charges for home delivery services</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="deliveryCharge">Standard Delivery Charge (₹)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                                <Input
                                    id="deliveryCharge"
                                    type="number"
                                    className="pl-7"
                                    value={settings.deliveryCharge}
                                    onChange={(e) => setSettings({ ...settings, deliveryCharge: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">
                                This amount will be automatically added to orders when "Home Delivery" is selected.
                            </p>
                        </div>

                        <div className="space-y-2 mt-4">
                            <Label htmlFor="petrolAllowance">Petrol Allowance (₹/km)</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                                <Input
                                    id="petrolAllowance"
                                    type="number"
                                    className="pl-7"
                                    value={settings.petrolAllowance}
                                    onChange={(e) => setSettings({ ...settings, petrolAllowance: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">
                                This distance-based allowance will be added to delivery boy earnings.
                            </p>
                        </div>

                        <Button
                            className="w-full h-11 gradient-saffron text-accent-foreground font-bold shadow-lg mt-4"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Update Charge</>}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="shadow-card opacity-60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="w-5 h-5 text-muted-foreground" /> Other Parameters
                        </CardTitle>
                        <CardDescription>Future platform settings</CardDescription>
                    </CardHeader>
                    <CardContent className="py-8 text-center border-dashed border-2 rounded-lg mx-6 mb-6">
                        <p className="text-xs text-muted-foreground italic">Additional system-wide configurations will appear here.</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end pt-4">
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Refresh System Cache
                </Button>
            </div>
        </div>
    );
};

export default AdminSettings;

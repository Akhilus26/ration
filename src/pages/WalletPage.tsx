import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { sql } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Plus, ArrowUpRight, History, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

const WalletPage = () => {
    const { user, refreshUser } = useAuth();
    const { toast } = useToast();
    const [topUpAmount, setTopUpAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleTopUp = async () => {
        const amount = parseFloat(topUpAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({
                title: "Invalid Amount",
                description: "Please enter a valid amount to top up.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            await sql.updateBalance(user!.id, amount);
            await refreshUser();
            setTopUpAmount("");
            toast({
                title: "Top-up Successful",
                description: `₹${amount} has been added to your wallet.`,
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <Wallet className="w-8 h-8 text-indian-green" /> My Wallet
                </h1>
                <p className="text-muted-foreground mt-1 text-lg">Manage your digital balance for quick payments</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance Card */}
                <Card className="md:col-span-2 shadow-lg border-indian-green/20 bg-gradient-to-br from-white to-indian-green/5 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Wallet className="w-32 h-32" />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-muted-foreground">Current Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col">
                            <span className="text-5xl font-black text-foreground">₹{(user?.balance || 0).toFixed(2)}</span>
                            <div className="flex items-center gap-2 mt-4 text-indian-green">
                                <ArrowUpRight className="w-4 h-4" />
                                <span className="text-sm font-semibold uppercase tracking-wider">Ready for payments</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Up Form */}
                <Card className="shadow-lg border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-lg">Add Funds</CardTitle>
                        <CardDescription>Instant wallet top-up</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (₹)</Label>
                            <div className="relative">
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={topUpAmount}
                                    onChange={(e) => setTopUpAmount(e.target.value)}
                                    className="pl-8 text-xl font-bold"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[100, 500, 1000].map(amt => (
                                <Button
                                    key={amt}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setTopUpAmount(amt.toString())}
                                    className="text-xs"
                                >
                                    +{amt}
                                </Button>
                            ))}
                        </div>
                        <Button
                            className="w-full gradient-header text-primary-foreground font-bold h-12"
                            onClick={handleTopUp}
                            disabled={isLoading}
                        >
                            {isLoading ? "Processing..." : (
                                <div className="flex items-center gap-2">
                                    <Plus className="w-5 h-5" /> Add Funds
                                </div>
                            )}
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
                            <CreditCard className="w-3 h-3" /> Secure payment processing
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction History Placeholder */}
            <Card className="shadow-md border-muted">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <History className="w-5 h-5 text-muted-foreground" /> Recent Transactions
                        </CardTitle>
                        <Button variant="ghost" size="sm" className="text-primary text-xs">View All</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indian-green/10 flex items-center justify-center">
                                    <Plus className="w-5 h-5 text-indian-green" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Wallet Top-up</p>
                                    <p className="text-xs text-muted-foreground">Today, 10:30 AM</p>
                                </div>
                            </div>
                            <span className="font-bold text-indian-green text-sm">+₹{(user?.balance || 0).toFixed(2)}</span>
                        </div>
                        <div className="text-center py-8 text-muted-foreground italic text-sm">
                            Real transaction history will appear here.
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default WalletPage;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Package } from "lucide-react";

const OrdersPage = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-muted-foreground mt-1">View and manage your ration orders</p>
      </motion.div>

      <Card className="shadow-card">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Package className="w-12 h-12 mb-4 opacity-40" />
            <p className="text-base font-medium">No orders yet</p>
            <p className="text-sm mt-1">Your purchase history will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersPage;

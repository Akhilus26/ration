import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { sql } from "@/lib/db";
import { Package, Layers, Wheat, AlertTriangle } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StockAgg {
  itemName: string;
  totalQuantity: number;
  unit: string;
}

const AdminStockReport = () => {
  const [loading, setLoading] = useState(true);
  const [stockSummary, setStockSummary] = useState<StockAgg[]>([]);
  const [allRawStock, setAllRawStock] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState("all");
  const [lowStockAlerts, setLowStockAlerts] = useState(0);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const shopsData = await sql.getAllShops();
        setShops(shopsData);

        const stockData = await sql.getAllStock();
        setAllRawStock(stockData);
      } catch (error) {
        console.error("Failed to load stock data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStockData();
  }, []);

  useEffect(() => {
    const aggregated: Record<string, StockAgg> = {};
    let lowStockCount = 0;

    const filteredStock = selectedShop === "all" 
      ? allRawStock 
      : allRawStock.filter((s: any) => s.shopId === selectedShop);

    filteredStock.forEach((s: any) => {
      const key = `${s.itemName}-${s.unit}`;
      if (!aggregated[key]) {
        aggregated[key] = { itemName: s.itemName, totalQuantity: 0, unit: s.unit };
      }
      aggregated[key].totalQuantity += s.quantity;

      if (s.quantity < 50) { // arbitrary threshold for UI
        lowStockCount++;
      }
    });

    setStockSummary(Object.values(aggregated));
    setLowStockAlerts(lowStockCount);
  }, [allRawStock, selectedShop]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">System Stock Report</h1>
          <p className="text-muted-foreground mt-1">
            {selectedShop === "all" ? "Aggregated stock across all FPS shops" : "Stock details for selected FPS shop"}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="w-full sm:w-72">
          <Select value={selectedShop} onValueChange={setSelectedShop}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Select a Shop" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shops (Aggregated)</SelectItem>
              {shops.map(shop => (
                <SelectItem key={shop.id} value={shop.id}>{shop.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Layers className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Stock Items</p>
                <h3 className="text-2xl font-bold">{stockSummary.length} Categories</h3>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-card border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <Package className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{selectedShop === "all" ? "Active FPS Shops" : "Selected Shop"}</p>
                <h3 className="text-2xl font-bold">{selectedShop === "all" ? shops.length : 1} {selectedShop === "all" ? "Shops" : "Shop"}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-full">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock Warnings</p>
                <h3 className="text-2xl font-bold">{lowStockAlerts} Alerts</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wheat className="w-5 h-5 text-primary" /> Stock Distribution
            </CardTitle>
            <CardDescription>
              {selectedShop === "all" ? "Consolidated physical inventory available for distribution" : "Physical inventory available in this shop"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 rounded-t-lg">
                  <tr>
                    <th scope="col" className="px-6 py-3 rounded-tl-lg">Item Name</th>
                    <th scope="col" className="px-6 py-3">Total Quantity Available</th>
                    <th scope="col" className="px-6 py-3 rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stockSummary.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                        No stock data available yet.
                      </td>
                    </tr>
                  ) : (
                    stockSummary.map((item, idx) => (
                      <tr 
                        key={`${item.itemName}-${idx}`} 
                        className="bg-card border-b border-border/50 hover:bg-secondary/20 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {item.itemName.charAt(0)}
                          </div>
                          {item.itemName}
                        </td>
                        <td className="px-6 py-4 font-mono text-base">
                          {item.totalQuantity.toLocaleString()} {item.unit}
                        </td>
                        <td className="px-6 py-4">
                          {item.totalQuantity < 50 ? (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">Low Stock</Badge>
                          ) : item.totalQuantity > 1000 ? (
                            <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/10">Abundant</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">Optimal</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminStockReport;

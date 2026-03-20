import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { sql, type StockRequest, type Stock } from "@/lib/db";
import { Loader2, Package, Send, Plus, Trash2, ClipboardList, CheckCircle, XCircle, Edit3, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

const AdminDistribution = () => {
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [items, setItems] = useState<{ itemName: string; quantity: number; unit: string }[]>([
    { itemName: "Rice", quantity: 100, unit: "kg" }
  ]);
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingRequest, setEditingRequest] = useState<StockRequest | null>(null);
  const [viewingShopStock, setViewingShopStock] = useState<{ name: string; items: Stock[] } | null>(null);
  const [shopsStock, setShopsStock] = useState<Record<string, Stock[]>>({});
  const [editQuantity, setEditQuantity] = useState("");
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [shopsData, requestsData, allStock] = await Promise.all([
        sql.getAllShops(),
        sql.getAllStockRequests(),
        sql.getAllStock()
      ]);
      const activeShops = shopsData.filter((s: any) => s.status === "ready");
      setShops(activeShops);
      
      const pendingRequests = requestsData.filter(r => r.status === "pending");
      
      // Organize stock by shopId
      const stockMap: Record<string, Stock[]> = {};
      allStock.forEach((s: any) => {
          if (!stockMap[s.shopId]) stockMap[s.shopId] = [];
          stockMap[s.shopId].push(s);
      });
      setShopsStock(stockMap);

      // Sort requests by priority (Lowest stock of the requested item first)
      const sortedRequests = pendingRequests.sort((a, b) => {
          const itemA = a.items[0].itemName;
          const itemB = b.items[0].itemName;
          const qtyA = stockMap[a.shopId]?.find(s => s.itemName === itemA)?.quantity || 0;
          const qtyB = stockMap[b.shopId]?.find(s => s.itemName === itemB)?.quantity || 0;
          return qtyA - qtyB; // Lower stock comes first
      });

      setRequests(sortedRequests);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { itemName: "Wheat", quantity: 50, unit: "kg" }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!selectedShop) {
      sonnerToast.error("Please select a shop first");
      return;
    }

    if (items.length === 0) {
      sonnerToast.error("Please add at least one item to deliver");
      return;
    }

    setSubmitting(true);
    try {
      const shop = shops.find(s => s.id === selectedShop);
      if (!shop) throw new Error("Shop not found");

      // Create Stock Delivery
      const deliveryId = crypto.randomUUID();
      await sql.createStockDelivery({
        id: deliveryId,
        shopId: shop.id,
        items,
        status: "pending",
        date: new Date().toISOString()
      });

      // Send notification to shopkeeper
      if (shop.shopkeeperId) {
        await sql.createNotification({
          id: crypto.randomUUID(),
          userId: shop.shopkeeperId,
          title: "New Stock Delivery",
          message: "Admin has assigned new stock to your shop. Please confirm receipt to update your inventory.",
          date: new Date().toISOString(),
          read: false,
          type: "stock"
        });
      }

      toast({
        title: "Stock Dispatched",
        description: "Delivery assigned successfully. The shopkeeper has been notified."
      });
      sonnerToast.success("Stock assigned to shop");
      setItems([{ itemName: "Rice", quantity: 100, unit: "kg" }]);
      setSelectedShop("");
    } catch (error: any) {
      console.error(error);
      sonnerToast.error("Failed to assign stock: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (request: StockRequest) => {
    setSubmitting(true);
    try {
      // 1. Create Stock Delivery
      const deliveryId = crypto.randomUUID();
      await sql.createStockDelivery({
        id: deliveryId,
        shopId: request.shopId,
        items: request.items,
        status: "pending",
        date: new Date().toISOString()
      });

      // 2. Update Request Status
      await sql.updateStockRequestStatus(request.id, "approved");

      // 3. Notify Shopkeeper
      const shop = shops.find(s => s.id === request.shopId);
      if (shop?.shopkeeperId) {
        await sql.createNotification({
          id: crypto.randomUUID(),
          userId: shop.shopkeeperId,
          title: "Stock Request Approved",
          message: `Your request for ${request.items[0].itemName} has been approved and dispatched.`,
          date: new Date().toISOString(),
          read: false,
          type: "stock"
        });
      }

      toast({ title: "Approved", description: "Request approved and stock dispatched." });
      fetchData();
    } catch (error: any) {
      sonnerToast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (request: StockRequest) => {
    setSubmitting(true);
    try {
      await sql.updateStockRequestStatus(request.id, "rejected");
      
      const shop = shops.find(s => s.id === request.shopId);
      if (shop?.shopkeeperId) {
        await sql.createNotification({
          id: crypto.randomUUID(),
          userId: shop.shopkeeperId,
          title: "Stock Request Rejected",
          message: `Your request for ${request.items[0].itemName} was unfortunately rejected by the admin.`,
          date: new Date().toISOString(),
          read: false,
          type: "stock"
        });
      }

      toast({ title: "Rejected", description: "Stock request rejected." });
      fetchData();
    } catch (error: any) {
      sonnerToast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleModify = async () => {
    if (!editingRequest || !editQuantity) return;
    setSubmitting(true);
    try {
      const modifiedItems = [{
        ...editingRequest.items[0],
        quantity: parseFloat(editQuantity)
      }];

      // 1. Create Stock Delivery with modified quantity
      const deliveryId = crypto.randomUUID();
      await sql.createStockDelivery({
        id: deliveryId,
        shopId: editingRequest.shopId,
        items: modifiedItems,
        status: "pending",
        date: new Date().toISOString()
      });

      // 2. Update Request Status to 'modified'
      await sql.updateStockRequestStatus(editingRequest.id, "modified", modifiedItems);

      // 3. Notify Shopkeeper
      const shop = shops.find(s => s.id === editingRequest.shopId);
      if (shop?.shopkeeperId) {
        await sql.createNotification({
          id: crypto.randomUUID(),
          userId: shop.shopkeeperId,
          title: "Stock Request Modified",
          message: `Your request for ${editingRequest.items[0].itemName} was modified to ${editQuantity} ${editingRequest.items[0].unit} and dispatched.`,
          date: new Date().toISOString(),
          read: false,
          type: "stock"
        });
      }

      toast({ title: "Modified & Dispatched", description: "Request quantity updated and dispatched." });
      setEditingRequest(null);
      fetchData();
    } catch (error: any) {
      sonnerToast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Stock Distribution</h1>
        <p className="text-muted-foreground mt-1">Review shop requests or manually push stock deliveries</p>
      </motion.div>

      {requests.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-amber-200 bg-amber-50/20 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5" /> Pending Stock Requests
              </CardTitle>
              <CardDescription className="text-amber-700/70">
                Action required on {requests.length} incoming supply requests from shops
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-amber-200">
                    <TableHead className="text-amber-900/60 pl-6">Priority / Shop</TableHead>
                    <TableHead className="text-amber-900/60">Currently Holds</TableHead>
                    <TableHead className="text-amber-900/60">Requested Supply</TableHead>
                    <TableHead className="text-amber-900/60 text-right pr-6">Decision & Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req, idx) => {
                    const shopStock = shopsStock[req.shopId] || [];
                    const reqItem = req.items[0].itemName;
                    const currentQty = shopStock.find(s => s.itemName === reqItem)?.quantity || 0;
                    
                    return (
                      <TableRow key={req.id} className="border-amber-100 hover:bg-amber-100/30 transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-amber-900">{req.shopName}</span>
                            <span className="text-[10px] text-amber-700/60">#{idx + 1} in priority queue</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                                <span className={`text-xs font-mono font-bold ${currentQty < 20 ? "text-destructive" : "text-amber-800"}`}>
                                    {currentQty} {req.items[0].unit} {reqItem}
                                </span>
                                <Button 
                                    size="sm" 
                                    variant="link" 
                                    className="h-auto p-0 text-[10px] text-primary flex items-center gap-1 justify-start"
                                    onClick={() => setViewingShopStock({ name: req.shopName, items: shopStock })}
                                >
                                    <Eye className="w-3 h-3" /> View All Stock
                                </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {req.items.map((it, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white border-amber-400 text-amber-900 shadow-sm">
                              {it.quantity}{it.unit} {it.itemName}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell className="text-right pr-6 space-x-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-amber-700 hover:bg-amber-200 hover:text-amber-900"
                            onClick={() => {
                              setEditingRequest(req);
                              setEditQuantity(req.items[0].quantity.toString());
                            }}
                          >
                            <Edit3 className="w-4 h-4 mr-1" /> Modify
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleReject(req)}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-8 bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => handleApprove(req)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-card border-l-4 border-l-primary/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Assign New Stock
            </CardTitle>
            <CardDescription>
              Select a recipient shop and list the items to be delivered. The shopkeeper will be required to confirm receipt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Shop</label>
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger className="w-full bg-secondary/20">
                  <SelectValue placeholder="Select a target shop..." />
                </SelectTrigger>
                <SelectContent>
                  {shops.map(shop => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name} <span className="text-xs text-muted-foreground">({shop.address})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Delivery Items</label>
                <Button size="sm" variant="outline" onClick={handleAddItem} className="h-8 gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-3 bg-secondary/10 p-3 rounded-lg border border-border/40">
                  <div className="grid grid-cols-12 gap-3 w-full">
                    <div className="col-span-12 sm:col-span-5">
                      <Select 
                        value={item.itemName} 
                        onValueChange={(val) => handleItemChange(index, "itemName", val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rice">Rice</SelectItem>
                          <SelectItem value="Wheat">Wheat</SelectItem>
                          <SelectItem value="Sugar">Sugar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-8 sm:col-span-4">
                      <Input 
                        type="number" 
                        min="1"
                        value={item.quantity} 
                        onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                        className="bg-background"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-3">
                      <Select 
                        value={item.unit} 
                        onValueChange={(val) => handleItemChange(index, "unit", val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="liters">liters</SelectItem>
                          <SelectItem value="packets">pkts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button 
              className="w-full h-12 gap-2 mt-4 gradient-saffron text-black font-bold shadow-lg" 
              onClick={handleSubmit}
              disabled={submitting || !selectedShop}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Dispatch Delivery to Shop
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modify Request Quantity</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="p-3 bg-secondary/20 rounded-lg text-sm">
                <p><strong>Shop:</strong> {editingRequest?.shopName}</p>
                <p><strong>Asked:</strong> {editingRequest?.items[0].quantity} {editingRequest?.items[0].unit} {editingRequest?.items[0].itemName}</p>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Approved Quantity ({editingRequest?.items[0].unit})</label>
                <Input 
                    type="number" 
                    value={editQuantity} 
                    onChange={(e) => setEditQuantity(e.target.value)}
                />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRequest(null)}>Cancel</Button>
            <Button className="gradient-saffron text-black font-bold" onClick={handleModify} disabled={submitting}>
              Update & Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingShopStock} onOpenChange={(open) => !open && setViewingShopStock(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inventory for {viewingShopStock?.name}</DialogTitle>
            <DialogDescription>Current live stock availability at this shop.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {viewingShopStock?.items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">No stock data found.</TableCell>
                        </TableRow>
                    ) : (
                        viewingShopStock?.items.map((st, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium">{st.itemName}</TableCell>
                                <TableCell className="text-right font-mono">{st.quantity} {st.unit}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewingShopStock(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDistribution;

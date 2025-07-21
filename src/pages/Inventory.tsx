import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Warehouse, Package, TrendingUp, TrendingDown, ExternalLink, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  unit: string;
  sale_price: number;
  purchase_price: number;
  stock_quantity: number;
  min_stock_level: number;
  status: string;
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'reduce'>('add');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedProduct || stockAdjustment <= 0) return;

    try {
      const newQuantity = adjustmentType === 'add' 
        ? selectedProduct.stock_quantity + stockAdjustment
        : Math.max(0, selectedProduct.stock_quantity - stockAdjustment);

      const { error } = await supabase
        .from("products")
        .update({ stock_quantity: newQuantity })
        .eq("id", selectedProduct.id);

      if (error) throw error;

      // Update local state
      setProducts(products.map(p => 
        p.id === selectedProduct.id 
          ? { ...p, stock_quantity: newQuantity }
          : p
      ));

      toast({
        title: "Success",
        description: `Stock ${adjustmentType === 'add' ? 'added' : 'reduced'} successfully`,
      });

      setIsDialogOpen(false);
      setStockAdjustment(0);
      setSelectedProduct(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive",
      });
    }
  };

  const openStockDialog = (product: Product, type: 'add' | 'reduce') => {
    setSelectedProduct(product);
    setAdjustmentType(type);
    setIsDialogOpen(true);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = products.length;
  const inStockItems = products.filter(p => p.stock_quantity > p.min_stock_level).length;
  const lowStockItems = products.filter(p => p.stock_quantity <= p.min_stock_level).length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.purchase_price), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Monitor stock levels and manage inventory across products, sales, and purchases
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/products')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage Products
          </Button>
          <Button onClick={() => navigate('/products')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Stock</p>
                <p className="text-2xl font-bold">{inStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">{lowStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">₹{totalValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search inventory..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/sales')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-semibold">Sales</h3>
                <p className="text-sm text-muted-foreground">Track sales and reduce stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/purchases')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <h3 className="font-semibold">Purchases</h3>
                <p className="text-sm text-muted-foreground">Add stock through purchases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/products')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Warehouse className="h-8 w-8 text-purple-500" />
              <div>
                <h3 className="font-semibold">Products</h3>
                <p className="text-sm text-muted-foreground">Manage product catalog</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Current Inventory Status
          </CardTitle>
          <CardDescription>
            Real-time view of stock levels across all products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading inventory data...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Warehouse className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No inventory items found</p>
              <p className="text-sm">Add your first product to get started</p>
              <Button className="mt-4" onClick={() => navigate('/products')}>
                Add Product
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                 <TableRow>
                   <TableHead>Product</TableHead>
                   <TableHead>SKU</TableHead>
                   <TableHead>Current Stock</TableHead>
                   <TableHead>Min Level</TableHead>
                   <TableHead>Unit Price</TableHead>
                   <TableHead>Total Value</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Actions</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                 {filteredProducts.map((product) => (
                   <TableRow key={product.id}>
                     <TableCell className="font-medium">{product.name}</TableCell>
                     <TableCell>{product.sku}</TableCell>
                     <TableCell>
                       <span className={product.stock_quantity <= product.min_stock_level ? "text-destructive font-medium" : ""}>
                         {product.stock_quantity} {product.unit}
                       </span>
                     </TableCell>
                     <TableCell>{product.min_stock_level} {product.unit}</TableCell>
                     <TableCell>₹{product.purchase_price}</TableCell>
                     <TableCell>₹{(product.stock_quantity * product.purchase_price).toLocaleString()}</TableCell>
                     <TableCell>
                       {product.stock_quantity <= product.min_stock_level ? (
                         <Badge variant="destructive">Low Stock</Badge>
                       ) : product.stock_quantity <= product.min_stock_level * 2 ? (
                         <Badge variant="secondary">Medium</Badge>
                       ) : (
                         <Badge variant="default">In Stock</Badge>
                       )}
                     </TableCell>
                     <TableCell>
                       <div className="flex gap-2">
                         <Button 
                           size="sm" 
                           variant="outline"
                           onClick={() => openStockDialog(product, 'add')}
                         >
                           <Plus className="h-3 w-3" />
                         </Button>
                         <Button 
                           size="sm" 
                           variant="outline"
                           onClick={() => openStockDialog(product, 'reduce')}
                         >
                           <Minus className="h-3 w-3" />
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 ))}
              </TableBody>
            </Table>
          )}
         </CardContent>
       </Card>

       {/* Stock Adjustment Dialog */}
       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
         <DialogContent className="sm:max-w-[425px]">
           <DialogHeader>
             <DialogTitle>
               {adjustmentType === 'add' ? 'Add Stock' : 'Reduce Stock'}
             </DialogTitle>
             <DialogDescription>
               {adjustmentType === 'add' 
                 ? `Add stock to ${selectedProduct?.name}` 
                 : `Reduce stock from ${selectedProduct?.name}`}
             </DialogDescription>
           </DialogHeader>
           <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="current-stock" className="text-right">
                 Current Stock
               </Label>
               <Input
                 id="current-stock"
                 value={`${selectedProduct?.stock_quantity || 0} ${selectedProduct?.unit || ''}`}
                 className="col-span-3"
                 disabled
               />
             </div>
             <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="adjustment" className="text-right">
                 Quantity
               </Label>
               <Input
                 id="adjustment"
                 type="number"
                 min="1"
                 value={stockAdjustment}
                 onChange={(e) => setStockAdjustment(Number(e.target.value))}
                 className="col-span-3"
                 placeholder="Enter quantity"
               />
             </div>
             {adjustmentType === 'reduce' && selectedProduct && (
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label className="text-right">New Stock</Label>
                 <Input
                   value={`${Math.max(0, selectedProduct.stock_quantity - stockAdjustment)} ${selectedProduct.unit}`}
                   className="col-span-3"
                   disabled
                 />
               </div>
             )}
           </div>
           <DialogFooter>
             <Button 
               type="submit" 
               onClick={handleStockAdjustment}
               disabled={stockAdjustment <= 0}
             >
               {adjustmentType === 'add' ? 'Add Stock' : 'Reduce Stock'}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
       </div>
   );
 }
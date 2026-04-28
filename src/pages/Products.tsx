import { useState, useEffect } from "react";
import { Plus, Search, Filter, Edit, Trash2, Package, AlertTriangle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";


interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  unit: string;
  sale_price: number;
  purchase_price: number;
  mrp?: number;
  stock_quantity: number;
  min_stock_level: number;
  status: string;
  hsn_code?: string;
  gst_rate?: number;
}

interface StockTransaction {
  id: string;
  product_id: string;
  transaction_type: string;
  quantity: number;
  batch_number?: string | null;
  description?: string | null;
  transaction_date: string;
  previous_stock: number;
  new_stock: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    unit: "pcs",
    sale_price: "",
    purchase_price: "",
    mrp: "",
    stock_quantity: "",
    min_stock_level: "",
    hsn_code: "",
    gst_rate: "",
  });

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
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      description: "",
      unit: "pcs",
      sale_price: "",
      purchase_price: "",
      mrp: "",
      stock_quantity: "",
      min_stock_level: "",
      hsn_code: "",
      gst_rate: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const openingStock = parseInt(formData.stock_quantity) || 0;

      const { data: inserted, error } = await supabase.from("products").insert([
        {
          name: formData.name,
          sku: formData.sku,
          description: formData.description || null,
          unit: formData.unit,
          sale_price: parseFloat(formData.sale_price),
          purchase_price: parseFloat(formData.purchase_price),
          mrp: formData.mrp ? parseFloat(formData.mrp) : null,
          stock_quantity: openingStock,
          min_stock_level: parseInt(formData.min_stock_level) || 0,
          hsn_code: formData.hsn_code || null,
          gst_rate: formData.gst_rate ? parseFloat(formData.gst_rate) : 0,
        },
      ]).select('id').single();

      if (error) throw error;

      // Create an opening stock transaction if opening stock > 0
      if (openingStock > 0 && inserted) {
        await supabase.from("stock_transactions").insert({
          product_id: inserted.id,
          transaction_type: 'opening_stock',
          quantity: openingStock,
          previous_stock: 0,
          new_stock: openingStock,
          description: 'Opening Stock',
          transaction_date: format(new Date(), 'yyyy-MM-dd'),
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });
      }

      toast({
        title: "Success",
        description: "Product added successfully",
      });

      setShowAddDialog(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      unit: product.unit,
      sale_price: product.sale_price.toString(),
      purchase_price: product.purchase_price.toString(),
      mrp: product.mrp?.toString() || "",
      stock_quantity: product.stock_quantity.toString(),
      min_stock_level: product.min_stock_level.toString(),
      hsn_code: product.hsn_code || "",
      gst_rate: product.gst_rate?.toString() || "",
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    try {
      const newOpeningStock = parseInt(formData.stock_quantity) || 0;
      const oldStock = selectedProduct.stock_quantity;
      const stockDelta = newOpeningStock - oldStock;

      const { error } = await supabase
        .from("products")
        .update({
          name: formData.name,
          sku: formData.sku,
          description: formData.description || null,
          unit: formData.unit,
          sale_price: parseFloat(formData.sale_price),
          purchase_price: parseFloat(formData.purchase_price),
          mrp: formData.mrp ? parseFloat(formData.mrp) : null,
          stock_quantity: newOpeningStock,
          min_stock_level: parseInt(formData.min_stock_level) || 0,
          hsn_code: formData.hsn_code || null,
          gst_rate: formData.gst_rate ? parseFloat(formData.gst_rate) : 0,
        })
        .eq("id", selectedProduct.id);

      if (error) throw error;

      // If opening stock changed, create a stock transaction to track the adjustment
      if (stockDelta !== 0) {
        await supabase.from("stock_transactions").insert({
          product_id: selectedProduct.id,
          transaction_type: 'opening_stock',
          quantity: Math.abs(stockDelta),
          previous_stock: oldStock,
          new_stock: newOpeningStock,
          description: stockDelta > 0 ? 'Opening Stock increased' : 'Opening Stock decreased',
          transaction_date: format(new Date(), 'yyyy-MM-dd'),
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });
      }

      toast({
        title: "Success",
        description: "Product updated successfully",
      });

      setShowEditDialog(false);
      setSelectedProduct(null);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", selectedProduct.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      setShowDeleteDialog(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchStockRecords = async (product: Product) => {
    setSelectedProduct(product);
    setShowStockDialog(true);
    setStockLoading(true);
    try {
      const { data, error } = await supabase
        .from("stock_transactions")
        .select("*")
        .eq("product_id", product.id)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setStockTransactions(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load stock records",
        variant: "destructive",
      });
    } finally {
      setStockLoading(false);
    }
  };

  const handleDeleteStockRecord = async (transaction: StockTransaction) => {
    if (!confirm("Are you sure you want to delete this stock record? The product stock will be adjusted accordingly.")) return;

    try {
      // Determine how to reverse: if stock was added, subtract it back; if reduced/sold, add it back
      const isAddType = ['add', 'purchase', 'opening_stock'].includes(transaction.transaction_type);
      const reverseQty = isAddType ? -transaction.quantity : transaction.quantity;

      // Get current product stock and adjust
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", transaction.product_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let updatedStock = 0;
      if (product) {
        updatedStock = (product.stock_quantity || 0) + reverseQty;
        const { error: updateError } = await supabase
          .from("products")
          .update({ stock_quantity: updatedStock, updated_at: new Date().toISOString() })
          .eq("id", transaction.product_id);

        if (updateError) throw updateError;

        // Update selectedProduct in the dialog header
        if (selectedProduct) {
          setSelectedProduct({ ...selectedProduct, stock_quantity: updatedStock });
        }
      }

      // Delete the transaction record
      const { error } = await supabase
        .from("stock_transactions")
        .delete()
        .eq("id", transaction.id);

      if (error) throw error;

      // Recalculate the stock chain for all remaining transactions of this product
      const { data: remaining } = await supabase
        .from("stock_transactions")
        .select("id, previous_stock, new_stock")
        .eq("product_id", transaction.product_id)
        .order("transaction_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (remaining && remaining.length > 0) {
        let runningStock = 0;
        for (const t of remaining) {
          const delta = t.new_stock - t.previous_stock; // preserve original delta
          const correctedPrev = runningStock;
          const correctedNew = runningStock + delta;
          if (t.previous_stock !== correctedPrev || t.new_stock !== correctedNew) {
            await supabase
              .from("stock_transactions")
              .update({ previous_stock: correctedPrev, new_stock: correctedNew })
              .eq("id", t.id);
          }
          runningStock = correctedNew;
        }
      }

      // Re-fetch stock records to show corrected chain values
      if (selectedProduct) {
        const { data: refreshed } = await supabase
          .from("stock_transactions")
          .select("*")
          .eq("product_id", selectedProduct.id)
          .order("transaction_date", { ascending: false });
        setStockTransactions(refreshed || []);
      }

      // Refresh the products list so stock_quantity is updated everywhere
      fetchProducts();

      toast({
        title: "Success",
        description: "Stock record deleted and product stock adjusted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete stock record",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_level).length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.purchase_price), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage your product inventory and pricing
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Create a new product in your inventory
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="ltr">Liter</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Purchase Price *</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sale_price">Sale Price (Without Tax) *</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                    required
                  />
                  {formData.sale_price && formData.gst_rate && (
                    <div className="text-sm text-muted-foreground">
                      With Tax: ₹{(parseFloat(formData.sale_price) * (1 + parseFloat(formData.gst_rate) / 100)).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mrp">MRP</Label>
                  <Input
                    id="mrp"
                    type="number"
                    step="0.01"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Opening Stock</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock_level">Minimum Stock</Label>
                  <Input
                    id="min_stock_level"
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hsn_code">HSN Code</Label>
                  <Input
                    id="hsn_code"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst_rate">GST Rate (%)</Label>
                  <Input
                    id="gst_rate"
                    type="number"
                    step="0.01"
                    value={formData.gst_rate}
                    onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Product</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockCount}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.filter(p => p.status === 'active').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Sale Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">No products found</TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground">{product.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>₹{product.purchase_price}</TableCell>
                    <TableCell>₹{product.sale_price}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={product.stock_quantity <= product.min_stock_level ? "text-destructive font-medium" : ""}>
                          {product.stock_quantity}
                        </span>
                        {product.stock_quantity <= product.min_stock_level && (
                          <Badge variant="destructive" className="text-xs">
                            Low
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status === "active" ? "default" : "secondary"}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          title="View Stock Records"
                          onClick={() => fetchStockRecords(product)}
                        >
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sku">SKU *</Label>
                <Input
                  id="edit-sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unit</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="kg">Kilogram</SelectItem>
                    <SelectItem value="ltr">Liter</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="pack">Pack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-purchase_price">Purchase Price *</Label>
                <Input
                  id="edit-purchase_price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sale_price">Sale Price *</Label>
                <Input
                  id="edit-sale_price"
                  type="number"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-mrp">MRP</Label>
                <Input
                  id="edit-mrp"
                  type="number"
                  step="0.01"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stock_quantity">Opening Stock</Label>
                <Input
                  id="edit-stock_quantity"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-min_stock_level">Minimum Stock</Label>
                <Input
                  id="edit-min_stock_level"
                  type="number"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-hsn_code">HSN Code</Label>
                <Input
                  id="edit-hsn_code"
                  value={formData.hsn_code}
                  onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-gst_rate">GST Rate (%)</Label>
                <Input
                  id="edit-gst_rate"
                  type="number"
                  step="0.01"
                  value={formData.gst_rate}
                  onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Product</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Records Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Stock Records — {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription>
              SKU: {selectedProduct?.sku} · Current Stock: {selectedProduct?.stock_quantity} {selectedProduct?.unit}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1">
            {stockLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading stock records...</div>
            ) : stockTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No stock transactions found for this product</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Batch No.</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Stock Change</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockTransactions.map((t) => {
                    const isAddType = ['add', 'purchase', 'opening_stock'].includes(t.transaction_type);
                    const typeLabel = {
                      add: 'Added',
                      reduce: 'Reduced',
                      sale: 'Sale',
                      sale_adjust: 'Sale Adjusted',
                      sale_revert: 'Sale Reverted',
                      purchase: 'Purchase',
                      purchase_return: 'Purchase Return',
                      adjustment: 'Adjustment',
                      opening_stock: 'Opening Stock',
                    }[t.transaction_type] || t.transaction_type;
                    return (
                    <TableRow key={t.id}>
                      <TableCell>{format(new Date(t.transaction_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={isAddType ? 'default' : 'destructive'}>
                          {typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.quantity} {selectedProduct?.unit}</TableCell>
                      <TableCell>{t.batch_number || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{t.description || '-'}</TableCell>
                      <TableCell>
                        <span className={isAddType ? 'text-green-600' : 'text-red-600'}>
                          {t.previous_stock} → {t.new_stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStockRecord(t)}
                          title="Delete this stock record"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
  );
}
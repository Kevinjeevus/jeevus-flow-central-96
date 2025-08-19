import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Users, Edit, Trash2, MoreHorizontal, Eye, Mail, Phone, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SupplierForm } from "@/components/SupplierForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  payment_terms?: string;
  status: string;
  created_at: string;
}

export default function Suppliers() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [suppliers, searchQuery]);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch suppliers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterSuppliers = () => {
    if (!searchQuery) {
      setFilteredSuppliers(suppliers);
      return;
    }

    const filtered = suppliers.filter(
      (supplier) =>
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.phone?.includes(searchQuery) ||
        supplier.city?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredSuppliers(filtered);
  };

  const handleSupplierSuccess = () => {
    setShowSupplierForm(false);
    setEditingSupplier(null);
    fetchSuppliers();
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowSupplierForm(true);
  };

  const handleView = (supplier: Supplier) => {
    setViewingSupplier(supplier);
    setShowViewDialog(true);
  };

  const handleDelete = async (supplierId: string, supplierName: string) => {
    if (!confirm(`Are you sure you want to delete "${supplierName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", supplierId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });

      fetchSuppliers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete supplier",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "active" ? "default" : "secondary"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
          <p className="text-muted-foreground">Manage your supplier relationships and contacts</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:bg-gradient-primary/90"
          onClick={() => setShowSupplierForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search suppliers..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Supplier Directory
          </CardTitle>
          <CardDescription>
            Maintain supplier information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading suppliers...</p>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No suppliers found</p>
              <p className="text-sm">
                {searchQuery ? "Try adjusting your search" : "Add your first supplier to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name/Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.company && (
                            <div className="text-sm text-muted-foreground">{supplier.company}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {supplier.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {supplier.email}
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {supplier.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.city || supplier.state ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {[supplier.city, supplier.state].filter(Boolean).join(", ")}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.gstin || "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(supplier.status)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(supplier)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(supplier.id, supplier.name)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Form Dialog */}
      {showSupplierForm && (
        <SupplierForm
          onClose={() => {
            setShowSupplierForm(false);
            setEditingSupplier(null);
          }}
          onSuccess={handleSupplierSuccess}
          editSupplier={editingSupplier}
        />
      )}

      {/* View Supplier Dialog */}
      {viewingSupplier && (
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Supplier Details
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <p className="font-medium">{viewingSupplier.name}</p>
              </div>
              {viewingSupplier.company && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p className="font-medium">{viewingSupplier.company}</p>
                </div>
              )}
              {viewingSupplier.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="font-medium">{viewingSupplier.email}</p>
                </div>
              )}
              {viewingSupplier.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="font-medium">{viewingSupplier.phone}</p>
                </div>
              )}
              {viewingSupplier.gstin && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">GSTIN</label>
                  <p className="font-medium">{viewingSupplier.gstin}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  {getStatusBadge(viewingSupplier.status)}
                </div>
              </div>
              {viewingSupplier.address && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <p className="font-medium">{viewingSupplier.address}</p>
                  {(viewingSupplier.city || viewingSupplier.state || viewingSupplier.pincode) && (
                    <p className="text-sm text-muted-foreground">
                      {[viewingSupplier.city, viewingSupplier.state, viewingSupplier.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              )}
              {viewingSupplier.payment_terms && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Payment Terms</label>
                  <p className="font-medium">{viewingSupplier.payment_terms}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
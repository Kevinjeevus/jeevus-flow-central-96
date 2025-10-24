import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, MapPin, Eye, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';


interface Route {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface RouteInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  created_at: string;
  total_amount: number;
  customer: {
    name: string;
    address: string | null;
    gps_latitude: number | null;
    gps_longitude: number | null;
    gps_last_updated: string | null;
  };
}

export default function Routes() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [showInvoicesDialog, setShowInvoicesDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routeInvoices, setRouteInvoices] = useState<RouteInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch routes",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingRoute) {
        const { error } = await supabase
          .from('routes')
          .update(formData)
          .eq('id', editingRoute.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Route updated successfully!",
        });
      } else {
        const { error } = await supabase
          .from('routes')
          .insert([formData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Route created successfully!",
        });
      }

      setShowForm(false);
      setEditingRoute(null);
      setFormData({ name: '', description: '', status: 'active' });
      fetchRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save route",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      description: route.description || '',
      status: route.status
    });
    setShowForm(true);
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', routeId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Route deleted successfully!",
      });
      
      fetchRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete route",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', status: 'active' });
    setEditingRoute(null);
    setShowForm(false);
  };

  const fetchRouteInvoices = async (routeId: string) => {
    setLoadingInvoices(true);
    try {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          created_at,
          total_amount,
          customers (
            name,
            address,
            gps_latitude,
            gps_longitude,
            gps_last_updated
          )
        `)
        .eq('route_id', routeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRouteInvoices(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch route invoices",
        variant: "destructive",
      });
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleViewInvoices = (route: Route) => {
    setSelectedRoute(route);
    fetchRouteInvoices(route.id);
    setShowInvoicesDialog(true);
  };

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Route Management</h1>
          <p className="text-muted-foreground">Create and manage sales routes</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-primary hover:bg-gradient-primary/90"
              onClick={() => resetForm()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRoute ? 'Edit Route' : 'Create New Route'}
              </DialogTitle>
              <DialogDescription>
                {editingRoute 
                  ? 'Update the route details below.' 
                  : 'Add a new sales route for your team.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Route Name</Label>
                <Input
                  id="name"
                  placeholder="Enter route name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter route description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : editingRoute ? "Update Route" : "Create Route"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Sales Routes
          </CardTitle>
          <CardDescription>
            Manage all sales routes in your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {routes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Invoices</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.name}</TableCell>
                    <TableCell>{route.description || 'No description'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={route.status === 'active' ? 'default' : 'secondary'}
                      >
                        {route.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(route.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewInvoices(route)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(route)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(route.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No routes found</p>
              <p className="text-sm">Create your first route to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showInvoicesDialog} onOpenChange={setShowInvoicesDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Route Invoices - {selectedRoute?.name}
            </DialogTitle>
            <DialogDescription>
              View all invoices created on this route with GPS locations
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6">
            {loadingInvoices ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading invoices...
              </div>
            ) : routeInvoices.length > 0 ? (
              <div className="space-y-4 py-4">
                {routeInvoices.map((invoice) => (
                  <Card key={invoice.id}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-lg">{invoice.invoice_number}</h4>
                            <Badge>₹{invoice.total_amount.toFixed(2)}</Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-muted-foreground">
                              <span className="font-medium">Customer:</span> {invoice.customer.name}
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-medium">Date:</span>{' '}
                              {new Date(invoice.invoice_date).toLocaleDateString()}
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-medium">Time:</span>{' '}
                              {new Date(invoice.created_at).toLocaleTimeString()}
                            </p>
                            {invoice.customer.address && (
                              <p className="text-muted-foreground">
                                <span className="font-medium">Address:</span> {invoice.customer.address}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          {invoice.customer.gps_latitude && invoice.customer.gps_longitude ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-green-600">GPS Location Captured</span>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>Lat: {invoice.customer.gps_latitude.toFixed(6)}</p>
                                <p>Lng: {invoice.customer.gps_longitude.toFixed(6)}</p>
                                {invoice.customer.gps_last_updated && (
                                  <p className="text-xs">
                                    Updated: {new Date(invoice.customer.gps_last_updated).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => openInGoogleMaps(
                                  invoice.customer.gps_latitude!,
                                  invoice.customer.gps_longitude!
                                )}
                                className="w-full"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open in Google Maps
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>No GPS location captured</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No invoices found for this route</p>
                <p className="text-sm">Invoices will appear here when staff creates them on this route</p>
              </div>
            )}
          </ScrollArea>
          
          <div className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowInvoicesDialog(false)} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
  );
}
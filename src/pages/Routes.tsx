import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Route {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default function Routes() {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
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
    </div>
  );
}
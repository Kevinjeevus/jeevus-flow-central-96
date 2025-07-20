import { ErpLayout } from "@/components/ErpLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Users } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Suppliers() {
  return (
    <ErpLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
            <p className="text-muted-foreground">Manage your supplier relationships and contacts</p>
          </div>
          <Button className="bg-gradient-primary hover:bg-gradient-primary/90">
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
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No suppliers found</p>
              <p className="text-sm">Add your first supplier to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErpLayout>
  );
}
import { ErpLayout } from "@/components/ErpLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Purchases() {
  return (
    <ErpLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Purchases</h1>
            <p className="text-muted-foreground">Manage purchase orders and vendor transactions</p>
          </div>
          <Button className="bg-gradient-primary hover:bg-gradient-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            New Purchase
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search purchases..." 
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Purchase Menu Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Purchase Menu</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto p-4 text-left hover:bg-muted"
                  >
                    <div>
                      <div className="font-medium">Purchase Bills</div>
                      <div className="text-sm text-muted-foreground">₹ 4,13,958</div>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto p-4 text-left hover:bg-muted"
                  >
                    <div>
                      <div className="font-medium">Payment-Out</div>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto p-4 text-left hover:bg-muted"
                  >
                    <div>
                      <div className="font-medium">Expenses</div>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto p-4 text-left hover:bg-muted"
                  >
                    <div>
                      <div className="font-medium">Purchase Order</div>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto p-4 text-left hover:bg-muted"
                  >
                    <div>
                      <div className="font-medium">Purchase Return/Dr. Note</div>
                    </div>
                  </Button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Purchase Orders
                </CardTitle>
                <CardDescription>
                  Track and manage all purchase orders from suppliers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No purchases found</p>
                  <p className="text-sm">Create your first purchase order to get started</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ErpLayout>
  );
}
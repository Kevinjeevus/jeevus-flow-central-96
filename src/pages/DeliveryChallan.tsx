
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DeliveryChallanForm } from "@/components/DeliveryChallanForm";
import { ErpLayout } from "@/components/ErpLayout";

export default function DeliveryChallan() {
  const [showChallanForm, setShowChallanForm] = useState(false);

  if (showChallanForm) {
    return <DeliveryChallanForm onClose={() => setShowChallanForm(false)} />;
  }

  return (
    <ErpLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Delivery Challan</h1>
            <p className="text-muted-foreground">Track shipments and delivery receipts</p>
          </div>
          <Button 
            className="bg-gradient-primary hover:bg-gradient-primary/90"
            onClick={() => setShowChallanForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Challan
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search delivery challans..." 
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
              <Package className="h-5 w-5" />
              Delivery Challans
            </CardTitle>
            <CardDescription>
              Manage delivery documents and shipment tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No delivery challans found</p>
              <p className="text-sm">Create your first delivery challan to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErpLayout>
  );
}

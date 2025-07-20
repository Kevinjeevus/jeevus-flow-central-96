
import { useState } from "react";
import { ErpLayout } from "@/components/ErpLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EstimateForm } from "@/components/EstimateForm";

export default function EstimateQuotation() {
  const [showEstimateForm, setShowEstimateForm] = useState(false);

  if (showEstimateForm) {
    return (
      <ErpLayout>
        <EstimateForm onClose={() => setShowEstimateForm(false)} />
      </ErpLayout>
    );
  }

  return (
    <ErpLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Estimate & Quotation</h1>
            <p className="text-muted-foreground">Create and manage estimates and quotations</p>
          </div>
          <Button 
            className="bg-gradient-primary hover:bg-gradient-primary/90"
            onClick={() => setShowEstimateForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Estimate
          </Button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search estimates..." 
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
              <Calculator className="h-5 w-5" />
              Estimates & Quotations
            </CardTitle>
            <CardDescription>
              Manage price estimates and quotations for potential customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No estimates found</p>
              <p className="text-sm">Create your first estimate to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErpLayout>
  );
}


import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProformaForm } from "@/components/ProformaForm";

export default function ProformaInvoice() {
  const [showProformaForm, setShowProformaForm] = useState(false);

  if (showProformaForm) {
    return <ProformaForm onClose={() => setShowProformaForm(false)} />;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proforma Invoice</h1>
          <p className="text-muted-foreground">Create and manage proforma invoices</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:bg-gradient-primary/90"
          onClick={() => setShowProformaForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Proforma
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search proforma invoices..." 
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
            <FileText className="h-5 w-5" />
            Proforma Invoices
          </CardTitle>
          <CardDescription>
            Handle advance invoices and payment requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No proforma invoices found</p>
            <p className="text-sm">Create your first proforma invoice to get started</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

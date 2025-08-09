import { useState } from "react";
import { ErpLayout } from "@/components/ErpLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GSTReturnsList } from "@/components/finance/GSTReturnsList";
import { GSTReturnForm } from "@/components/finance/GSTReturnForm";
import { GenerateGSTReturnDialog } from "@/components/finance/GenerateGSTReturnDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function GSTReturns() {
  const [showForm, setShowForm] = useState(false);
  const [editingReturn, setEditingReturn] = useState(null);
  const [activeTab, setActiveTab] = useState("gstr1");
  const [showGenerate, setShowGenerate] = useState(false);

  const { data: gstReturns, isLoading } = useQuery({
    queryKey: ["gst-returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gst_records")
        .select("*")
        .order("return_period", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["gst-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gst_records")
        .select("gstr_type, status, total_tax_amount");
      
      if (error) throw error;
      
      const totalReturns = data?.length || 0;
      const draftReturns = data?.filter(r => r.status === "draft").length || 0;
      const filedReturns = data?.filter(r => r.status === "filed").length || 0;
      const totalTax = data?.reduce((sum, r) => sum + Number(r.total_tax_amount), 0) || 0;
      
      return { totalReturns, draftReturns, filedReturns, totalTax };
    },
  });

  const handleEdit = (gstReturn: any) => {
    setEditingReturn(gstReturn);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingReturn(null);
  };

  const handleNewReturn = (type: string) => {
    setEditingReturn({ gstr_type: type });
    setShowForm(true);
  };

  return (
    <ErpLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">GST Returns</h1>
            <p className="text-muted-foreground">Manage GSTR-1, GSTR-2, GSTR-3B, and GSTR-9 filings</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalReturns || 0}</div>
              <p className="text-xs text-muted-foreground">All periods</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.draftReturns || 0}</div>
              <p className="text-xs text-muted-foreground">Pending filing</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Filed</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.filedReturns || 0}</div>
              <p className="text-xs text-muted-foreground">Successfully filed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tax</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{summary?.totalTax?.toLocaleString() || '0'}</div>
              <p className="text-xs text-muted-foreground">All returns</p>
            </CardContent>
          </Card>
        </div>

        {/* GST Returns Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="gstr1">GSTR-1</TabsTrigger>
              <TabsTrigger value="gstr2">GSTR-2</TabsTrigger>
              <TabsTrigger value="gstr3b">GSTR-3B</TabsTrigger>
              <TabsTrigger value="gstr9">GSTR-9</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowGenerate(true)}
                variant="secondary"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate {activeTab.toUpperCase()}
              </Button>
              <Button 
                onClick={() => handleNewReturn(activeTab)} 
                className="bg-gradient-primary hover:bg-gradient-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New {activeTab.toUpperCase()}
              </Button>
            </div>
          </div>

          <TabsContent value="gstr1" className="mt-6">
            <GSTReturnsList 
              returns={gstReturns?.filter(r => r.gstr_type === "gstr1") || []} 
              isLoading={isLoading}
              onEdit={handleEdit}
              returnType="gstr1"
            />
          </TabsContent>
          
          <TabsContent value="gstr2" className="mt-6">
            <GSTReturnsList 
              returns={gstReturns?.filter(r => r.gstr_type === "gstr2") || []} 
              isLoading={isLoading}
              onEdit={handleEdit}
              returnType="gstr2"
            />
          </TabsContent>
          
          <TabsContent value="gstr3b" className="mt-6">
            <GSTReturnsList 
              returns={gstReturns?.filter(r => r.gstr_type === "gstr3b") || []} 
              isLoading={isLoading}
              onEdit={handleEdit}
              returnType="gstr3b"
            />
          </TabsContent>
          
          <TabsContent value="gstr9" className="mt-6">
            <GSTReturnsList 
              returns={gstReturns?.filter(r => r.gstr_type === "gstr9") || []} 
              isLoading={isLoading}
              onEdit={handleEdit}
              returnType="gstr9"
            />
          </TabsContent>
        </Tabs>

        {/* GST Return Form Dialog */}
        {showForm && (
          <GSTReturnForm 
            gstReturn={editingReturn}
            onClose={handleCloseForm}
          />
        )}
        <GenerateGSTReturnDialog 
          open={showGenerate}
          onOpenChange={setShowGenerate}
          gstrType={activeTab as any}
        />
      </div>
    </ErpLayout>
  );
}
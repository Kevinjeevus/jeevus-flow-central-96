import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Loader2, Download, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface GSTReturnsListProps {
  returns: any[];
  isLoading: boolean;
  onEdit: (gstReturn: any) => void;
  returnType: string;
}

export function GSTReturnsList({ returns, isLoading, onEdit, returnType }: GSTReturnsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (returnId: string) => {
      const { error } = await supabase
        .from("gst_records")
        .delete()
        .eq("id", returnId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gst-returns"] });
      toast({
        title: "Success",
        description: "GST return deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete GST return",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "filed": return "bg-green-100 text-green-800";
      case "draft": return "bg-yellow-100 text-yellow-800";
      case "revised": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getReturnTypeInfo = (type: string) => {
    switch (type) {
      case "gstr1":
        return { name: "GSTR-1", description: "Outward supplies of taxable goods and/or services" };
      case "gstr2":
        return { name: "GSTR-2", description: "Inward supplies of taxable goods and/or services" };
      case "gstr3b":
        return { name: "GSTR-3B", description: "Summary return with tax payment" };
      case "gstr9":
        return { name: "GSTR-9", description: "Annual return" };
      default:
        return { name: type.toUpperCase(), description: "GST return" };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (returns.length === 0) {
    const typeInfo = getReturnTypeInfo(returnType);
    return (
      <Card>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No {typeInfo.name} returns filed yet</p>
          <p className="text-sm text-muted-foreground mt-1">{typeInfo.description}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{getReturnTypeInfo(returnType).name} Returns</span>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {returns.map((gstReturn) => (
            <div
              key={gstReturn.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {gstReturn.return_period}
                  </span>
                  <Badge className={getStatusColor(gstReturn.status)}>
                    {gstReturn.status}
                  </Badge>
                  {gstReturn.acknowledgment_number && (
                    <span className="text-xs text-muted-foreground">
                      ACK: {gstReturn.acknowledgment_number}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Due Date:</span>
                    <div className="font-medium">
                      {format(new Date(gstReturn.due_date), "MMM dd, yyyy")}
                    </div>
                  </div>
                  
                  {gstReturn.filing_date && (
                    <div>
                      <span className="text-muted-foreground">Filed Date:</span>
                      <div className="font-medium">
                        {format(new Date(gstReturn.filing_date), "MMM dd, yyyy")}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-muted-foreground">Taxable Value:</span>
                    <div className="font-medium">
                      ₹{Number(gstReturn.total_taxable_value).toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Total Tax:</span>
                    <div className="font-medium">
                      ₹{Number(gstReturn.total_tax_amount).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {/* Tax Breakdown */}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>IGST: ₹{Number(gstReturn.total_igst).toLocaleString()}</span>
                  <span>CGST: ₹{Number(gstReturn.total_cgst).toLocaleString()}</span>
                  <span>SGST: ₹{Number(gstReturn.total_sgst).toLocaleString()}</span>
                  {gstReturn.total_cess > 0 && (
                    <span>CESS: ₹{Number(gstReturn.total_cess).toLocaleString()}</span>
                  )}
                </div>
                
                {gstReturn.filed_by && (
                  <p className="text-xs text-muted-foreground">
                    Filed by: {gstReturn.filed_by}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(gstReturn)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(gstReturn.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
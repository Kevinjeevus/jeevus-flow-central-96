import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface GSTReturnFormProps {
  gstReturn?: any;
  onClose: () => void;
}

export function GSTReturnForm({ gstReturn, onClose }: GSTReturnFormProps) {
  const [formData, setFormData] = useState({
    gstr_type: "",
    return_period: "",
    due_date: "",
    filing_date: "",
    status: "draft",
    total_taxable_value: "",
    total_igst: "",
    total_cgst: "",
    total_sgst: "",
    total_cess: "",
    acknowledgment_number: "",
    filed_by: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (gstReturn) {
      setFormData({
        gstr_type: gstReturn.gstr_type || "",
        return_period: gstReturn.return_period || "",
        due_date: gstReturn.due_date || "",
        filing_date: gstReturn.filing_date || "",
        status: gstReturn.status || "draft",
        total_taxable_value: gstReturn.total_taxable_value?.toString() || "",
        total_igst: gstReturn.total_igst?.toString() || "",
        total_cgst: gstReturn.total_cgst?.toString() || "",
        total_sgst: gstReturn.total_sgst?.toString() || "",
        total_cess: gstReturn.total_cess?.toString() || "",
        acknowledgment_number: gstReturn.acknowledgment_number || "",
        filed_by: gstReturn.filed_by || "",
      });
    }
  }, [gstReturn]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const totalTax = (parseFloat(data.total_igst) || 0) + 
                      (parseFloat(data.total_cgst) || 0) + 
                      (parseFloat(data.total_sgst) || 0) + 
                      (parseFloat(data.total_cess) || 0);

      const payload = {
        ...data,
        total_taxable_value: parseFloat(data.total_taxable_value) || 0,
        total_igst: parseFloat(data.total_igst) || 0,
        total_cgst: parseFloat(data.total_cgst) || 0,
        total_sgst: parseFloat(data.total_sgst) || 0,
        total_cess: parseFloat(data.total_cess) || 0,
        total_tax_amount: totalTax,
        filing_date: data.filing_date || null,
        acknowledgment_number: data.acknowledgment_number || null,
        filed_by: data.filed_by || null,
      };

      if (gstReturn?.id) {
        const { error } = await supabase
          .from("gst_records")
          .update(payload)
          .eq("id", gstReturn.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gst_records")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gst-returns"] });
      queryClient.invalidateQueries({ queryKey: ["gst-summary"] });
      toast({
        title: "Success",
        description: `GST return ${gstReturn?.id ? "updated" : "created"} successfully`,
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${gstReturn?.id ? "update" : "create"} GST return`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const generateReturnPeriod = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}${year}`;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {gstReturn?.id ? "Edit GST Return" : "New GST Return"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gstr_type">Return Type</Label>
              <Select 
                value={formData.gstr_type} 
                onValueChange={(value) => setFormData({ ...formData, gstr_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select return type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gstr1">GSTR-1</SelectItem>
                  <SelectItem value="gstr2">GSTR-2</SelectItem>
                  <SelectItem value="gstr3b">GSTR-3B</SelectItem>
                  <SelectItem value="gstr9">GSTR-9</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="return_period">Return Period (MMYYYY)</Label>
              <Input
                id="return_period"
                value={formData.return_period}
                onChange={(e) => setFormData({ ...formData, return_period: e.target.value })}
                placeholder={generateReturnPeriod()}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="filing_date">Filing Date</Label>
              <Input
                id="filing_date"
                type="date"
                value={formData.filing_date}
                onChange={(e) => setFormData({ ...formData, filing_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="filed">Filed</SelectItem>
                <SelectItem value="revised">Revised</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="total_taxable_value">Total Taxable Value</Label>
            <Input
              id="total_taxable_value"
              type="number"
              step="0.01"
              value={formData.total_taxable_value}
              onChange={(e) => setFormData({ ...formData, total_taxable_value: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_igst">IGST</Label>
              <Input
                id="total_igst"
                type="number"
                step="0.01"
                value={formData.total_igst}
                onChange={(e) => setFormData({ ...formData, total_igst: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="total_cgst">CGST</Label>
              <Input
                id="total_cgst"
                type="number"
                step="0.01"
                value={formData.total_cgst}
                onChange={(e) => setFormData({ ...formData, total_cgst: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_sgst">SGST</Label>
              <Input
                id="total_sgst"
                type="number"
                step="0.01"
                value={formData.total_sgst}
                onChange={(e) => setFormData({ ...formData, total_sgst: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="total_cess">CESS</Label>
              <Input
                id="total_cess"
                type="number"
                step="0.01"
                value={formData.total_cess}
                onChange={(e) => setFormData({ ...formData, total_cess: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="acknowledgment_number">Acknowledgment Number</Label>
            <Input
              id="acknowledgment_number"
              value={formData.acknowledgment_number}
              onChange={(e) => setFormData({ ...formData, acknowledgment_number: e.target.value })}
              placeholder="Optional"
            />
          </div>

          <div>
            <Label htmlFor="filed_by">Filed By</Label>
            <Input
              id="filed_by"
              value={formData.filed_by}
              onChange={(e) => setFormData({ ...formData, filed_by: e.target.value })}
              placeholder="Name of person who filed"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : gstReturn?.id ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
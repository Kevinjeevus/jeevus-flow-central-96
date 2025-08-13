import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Save, Settings, Percent, DollarSign, Clock } from "lucide-react";

interface PayrollSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollSettings({ open, onOpenChange }: PayrollSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    pf_rate: 12.0,
    esi_rate: 0.75,
    hra_percentage: 40.0,
    transport_allowance_amount: 1600.0,
    medical_allowance_amount: 1250.0,
    overtime_multiplier: 2.0,
    working_days_per_month: 26
  });

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("payroll_settings")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setSettings({
          pf_rate: data.pf_rate,
          esi_rate: data.esi_rate,
          hra_percentage: data.hra_percentage,
          transport_allowance_amount: data.transport_allowance_amount,
          medical_allowance_amount: data.medical_allowance_amount,
          overtime_multiplier: data.overtime_multiplier,
          working_days_per_month: data.working_days_per_month
        });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load settings", variant: "destructive" });
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("payroll_settings")
        .upsert([{
          user_id: user.id,
          ...settings
        }]);

      if (error) throw error;

      toast({ title: "Success", description: "Payroll settings saved successfully" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Payroll Settings
          </DialogTitle>
          <DialogDescription>
            Configure deduction rates, allowances, and other payroll parameters
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="deductions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deductions">Deductions</TabsTrigger>
            <TabsTrigger value="allowances">Allowances</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="deductions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Percent className="h-4 w-4" />
                  Statutory Deductions
                </CardTitle>
                <CardDescription>Configure PF, ESI and other mandatory deductions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pf_rate">Provident Fund (PF) Rate (%)</Label>
                    <Input
                      id="pf_rate"
                      type="number"
                      step="0.1"
                      value={settings.pf_rate}
                      onChange={(e) => updateSetting('pf_rate', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Typically 12% of basic salary
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="esi_rate">ESI Rate (%)</Label>
                    <Input
                      id="esi_rate"
                      type="number"
                      step="0.01"
                      value={settings.esi_rate}
                      onChange={(e) => updateSetting('esi_rate', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Employee contribution (typically 0.75%)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allowances" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-4 w-4" />
                  Standard Allowances
                </CardTitle>
                <CardDescription>Configure HRA, transport, medical and other allowances</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hra_percentage">HRA Percentage (%)</Label>
                    <Input
                      id="hra_percentage"
                      type="number"
                      step="0.1"
                      value={settings.hra_percentage}
                      onChange={(e) => updateSetting('hra_percentage', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Percentage of basic salary
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="transport_allowance">Transport Allowance (₹)</Label>
                    <Input
                      id="transport_allowance"
                      type="number"
                      value={settings.transport_allowance_amount}
                      onChange={(e) => updateSetting('transport_allowance_amount', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Fixed monthly amount
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="medical_allowance">Medical Allowance (₹)</Label>
                    <Input
                      id="medical_allowance"
                      type="number"
                      value={settings.medical_allowance_amount}
                      onChange={(e) => updateSetting('medical_allowance_amount', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Fixed monthly amount
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-4 w-4" />
                  General Settings
                </CardTitle>
                <CardDescription>Configure working days, overtime rates and other general settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="working_days">Working Days per Month</Label>
                    <Input
                      id="working_days"
                      type="number"
                      min="1"
                      max="31"
                      value={settings.working_days_per_month}
                      onChange={(e) => updateSetting('working_days_per_month', parseInt(e.target.value) || 26)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Standard working days in a month
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="overtime_multiplier">Overtime Multiplier</Label>
                    <Input
                      id="overtime_multiplier"
                      type="number"
                      step="0.1"
                      value={settings.overtime_multiplier}
                      onChange={(e) => updateSetting('overtime_multiplier', parseFloat(e.target.value) || 2)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Multiplier for overtime rate calculation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
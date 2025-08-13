import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Calendar as CalendarIcon, Settings, Users, Calculator } from "lucide-react";

interface AdvancedPayrollGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PayrollSettings {
  pf_rate: number;
  esi_rate: number;
  hra_percentage: number;
  transport_allowance_amount: number;
  medical_allowance_amount: number;
  overtime_multiplier: number;
  working_days_per_month: number;
}

export function AdvancedPayrollGenerator({ open, onOpenChange, onSuccess }: AdvancedPayrollGeneratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [workingDays, setWorkingDays] = useState("26");

  const months = [
    { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
    { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
    { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" }
  ];

  const years = Array.from({ length: 7 }, (_, i) => String(now.getFullYear() - 3 + i));

  useEffect(() => {
    if (open) {
      fetchEmployees();
      fetchSettings();
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, salary, department, designation")
        .eq("is_active", true);
      if (error) throw error;
      setEmployees(data || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load employees", variant: "destructive" });
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("payroll_settings")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setSettings(data);
        setWorkingDays(String(data.working_days_per_month));
      } else {
        // Create default settings
        const defaultSettings = {
          user_id: user?.id,
          pf_rate: 12.0,
          esi_rate: 0.75,
          hra_percentage: 40.0,
          transport_allowance_amount: 1600.0,
          medical_allowance_amount: 1250.0,
          overtime_multiplier: 2.0,
          working_days_per_month: 26
        };
        
        const { data: newSettings, error: insertError } = await supabase
          .from("payroll_settings")
          .insert([defaultSettings])
          .select()
          .single();
          
        if (insertError) throw insertError;
        setSettings(newSettings);
        setWorkingDays(String(newSettings.working_days_per_month));
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load payroll settings", variant: "destructive" });
    }
  };

  const calculateAttendance = async (employeeId: string) => {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);
    
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("attendance_date", startDate.toISOString().split('T')[0])
        .lte("attendance_date", endDate.toISOString().split('T')[0]);

      if (error) throw error;

      const presentDays = data?.filter(record => 
        record.status === 'present' || record.status === 'half_day'
      ).length || 0;
      
      const totalOvertimeHours = data?.reduce((sum, record) => 
        sum + (record.overtime_hours || 0), 0
      ) || 0;

      return {
        attendance_days: presentDays,
        working_days: Number(workingDays),
        leave_days: Math.max(0, Number(workingDays) - presentDays),
        absent_days: Math.max(0, Number(workingDays) - presentDays),
        overtime_hours: totalOvertimeHours
      };
    } catch (e) {
      // If no attendance data, assume full attendance
      return {
        attendance_days: Number(workingDays),
        working_days: Number(workingDays),
        leave_days: 0,
        absent_days: 0,
        overtime_hours: 0
      };
    }
  };

  const calculatePayroll = async (employee: any, attendance: any) => {
    const basicSalary = Number(employee.salary || 0);
    const dailyRate = basicSalary / Number(workingDays);
    const basic = dailyRate * attendance.attendance_days;

    // Calculate allowances
    const hra = (basic * (settings?.hra_percentage || 40)) / 100;
    const transport_allowance = settings?.transport_allowance_amount || 1600;
    const medical_allowance = settings?.medical_allowance_amount || 1250;
    const special_allowance = 0;

    // Calculate overtime
    const hourlyRate = basicSalary / (Number(workingDays) * 8); // Assuming 8 hours per day
    const overtime_rate = hourlyRate * (settings?.overtime_multiplier || 2);
    const overtime_amount = attendance.overtime_hours * overtime_rate;

    const gross = basic + hra + transport_allowance + medical_allowance + special_allowance + overtime_amount;

    // Calculate deductions
    const pf_deduction = (basic * (settings?.pf_rate || 12)) / 100;
    const esi_deduction = gross <= 21000 ? (gross * (settings?.esi_rate || 0.75)) / 100 : 0;
    const professional_tax = gross > 15000 ? 200 : 0;
    const tax_deduction = 0; // Simplified - would need proper tax calculation
    const loan_deduction = 0;
    const other_deductions = 0;

    const totalDeductions = pf_deduction + esi_deduction + professional_tax + tax_deduction + loan_deduction + other_deductions;
    const net = gross - totalDeductions;

    return {
      employee_id: employee.id,
      basic,
      hra,
      transport_allowance,
      medical_allowance,
      special_allowance,
      overtime_hours: attendance.overtime_hours,
      overtime_rate,
      overtime_amount,
      allowances: hra + transport_allowance + medical_allowance + special_allowance,
      gross,
      pf_deduction,
      esi_deduction,
      tax_deduction,
      professional_tax,
      loan_deduction,
      other_deductions,
      deductions: totalDeductions,
      net,
      ...attendance
    };
  };

  const generatePayroll = async () => {
    if (!user || !settings) return;

    try {
      setLoading(true);

      // Calculate payroll for each employee
      const payrollItems = [];
      let totalBasic = 0;
      let totalAllowances = 0;
      let totalOvertimeAmount = 0;
      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      for (const employee of employees) {
        const attendance = await calculateAttendance(employee.id);
        const payrollItem = await calculatePayroll(employee, attendance);
        
        payrollItems.push(payrollItem);
        totalBasic += payrollItem.basic;
        totalAllowances += payrollItem.allowances;
        totalOvertimeAmount += payrollItem.overtime_amount;
        totalGross += payrollItem.gross;
        totalDeductions += payrollItem.deductions;
        totalNet += payrollItem.net;
      }

      // Create payroll run
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0);

      const runData = {
        user_id: user.id,
        period_year: Number(year),
        period_month: Number(month),
        payroll_period_start: startDate.toISOString().split('T')[0],
        payroll_period_end: endDate.toISOString().split('T')[0],
        employee_count: employees.length,
        total_basic: totalBasic,
        total_allowances: totalAllowances,
        total_overtime_amount: totalOvertimeAmount,
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet,
        status: "completed"
      };

      const { data: run, error: runError } = await supabase
        .from("payroll_runs")
        .insert([runData])
        .select("id")
        .single();

      if (runError) {
        if (runError.code === "23505") {
          toast({ title: "Already exists", description: "A payroll run for this period already exists.", variant: "destructive" });
          return;
        }
        throw runError;
      }

      // Insert payroll items
      const itemsData = payrollItems.map(item => ({
        ...item,
        payroll_run_id: run.id
      }));

      const { error: itemsError } = await supabase
        .from("payroll_items")
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast({ 
        title: "Payroll generated", 
        description: `Advanced payroll created for ${months.find(m => m.value === month)?.label} ${year} with ${employees.length} employees` 
      });
      
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate payroll", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Payroll Generation</DialogTitle>
          <DialogDescription>
            Generate comprehensive payroll with attendance integration and detailed calculations
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Payroll Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Working Days</Label>
                <Input
                  type="number"
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                  min="1"
                  max="31"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Employee Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
              <p className="text-muted-foreground">Active employees</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sales:</span>
                  <span>{employees.filter(e => e.department === 'sales').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Operations:</span>
                  <span>{employees.filter(e => e.department === 'operations').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Admin:</span>
                  <span>{employees.filter(e => e.department === 'admin').length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {settings && (
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Payroll Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">PF Rate</Label>
                    <div className="font-medium">{settings.pf_rate}%</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ESI Rate</Label>
                    <div className="font-medium">{settings.esi_rate}%</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">HRA</Label>
                    <div className="font-medium">{settings.hra_percentage}%</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Transport</Label>
                    <div className="font-medium">₹{settings.transport_allowance_amount}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={generatePayroll} disabled={loading}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            {loading ? "Generating..." : "Generate Advanced Payroll"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
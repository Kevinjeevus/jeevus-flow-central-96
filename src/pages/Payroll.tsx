import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

import { AdvancedPayrollGenerator } from "@/components/payroll/AdvancedPayrollGenerator";
import { PayrollRunActions } from "@/components/payroll/PayrollRunActions";
import { PayrollSettings } from "@/components/payroll/PayrollSettings";
import { Plus, Settings, Users, TrendingUp, DollarSign } from "lucide-react";

interface PayrollRun {
  id: string;
  user_id: string;
  period_year: number;
  period_month: number;
  run_date: string;
  employee_count: number;
  total_basic?: number;
  total_allowances?: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  status: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string | null;
}

export default function Payroll() {
  const { user } = useAuth();
  const { toast } = useToast();

  const now = new Date();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGen, setOpenGen] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    monthlyPayroll: 0,
    avgSalary: 0,
    pendingApprovals: 0
  });
  
  const months = useMemo(() => (
    [
      { value: "1", label: "January" },
      { value: "2", label: "February" },
      { value: "3", label: "March" },
      { value: "4", label: "April" },
      { value: "5", label: "May" },
      { value: "6", label: "June" },
      { value: "7", label: "July" },
      { value: "8", label: "August" },
      { value: "9", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ]
  ), []);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return Array.from({ length: 7 }, (_, i) => String(y - 3 + i));
  }, [now]);

  useEffect(() => {
    if (user?.id) {
      fetchRuns();
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payroll_runs")
        .select("*")
        .eq("user_id", user?.id)
        .order("run_date", { ascending: false });
      if (error) throw error;
      setRuns(data || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load payroll runs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get employee count
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, salary")
        .eq("is_active", true);
      
      if (empError) throw empError;

      // Get latest payroll run
      const { data: latestRun, error: runError } = await supabase
        .from("payroll_runs")
        .select("total_net, status")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Get pending approvals count
      const { count: pendingCount, error: pendingError } = await supabase
        .from("payroll_runs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id)
        .eq("status", "completed");

      const totalEmployees = employees?.length || 0;
      const totalSalaries = employees?.reduce((sum, emp) => sum + (Number(emp.salary) || 0), 0) || 0;
      const avgSalary = totalEmployees > 0 ? totalSalaries / totalEmployees : 0;
      const monthlyPayroll = latestRun?.total_net || 0;
      const pendingApprovals = pendingCount || 0;

      setStats({
        totalEmployees,
        monthlyPayroll,
        avgSalary,
        pendingApprovals
      });
    } catch (e: any) {
      console.error("Error fetching stats:", e);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed": return "secondary";
      case "approved": return "default";
      case "draft": return "outline";
      default: return "secondary";
    }
  };

  const fmtCurrency = (n: number | null | undefined) => `₹${Number(n ?? 0).toLocaleString()}`;
  const periodText = (m: number, y: number) => `${months[m-1]?.label || m}/${y}`;

  useEffect(() => {
    document.title = "Payroll | ERP";
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Advanced Payroll Management</h1>
            <p className="text-muted-foreground">Comprehensive payroll processing with attendance integration</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpenSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button onClick={() => setOpenGen(true)} className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Generate Payroll
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">Active employees</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtCurrency(stats.monthlyPayroll)}</div>
              <p className="text-xs text-muted-foreground">Latest run total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmtCurrency(stats.avgSalary)}</div>
              <p className="text-xs text-muted-foreground">Per employee</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Payroll Runs</CardTitle>
            <CardDescription>History of generated payrolls with advanced tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Run Date</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Basic Pay</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No payroll runs yet. Click "Generate Payroll" to create your first run.
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{periodText(r.period_month, r.period_year)}</TableCell>
                      <TableCell>{new Date(r.run_date).toLocaleDateString()}</TableCell>
                      <TableCell>{r.employee_count}</TableCell>
                      <TableCell>{fmtCurrency(r.total_basic || 0)}</TableCell>
                      <TableCell>{fmtCurrency(r.total_allowances || 0)}</TableCell>
                      <TableCell className="font-medium">{fmtCurrency(r.total_gross)}</TableCell>
                      <TableCell className="text-destructive">{fmtCurrency(r.total_deductions)}</TableCell>
                      <TableCell className="font-bold text-primary">{fmtCurrency(r.total_net)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(r.status)}>
                          {r.status}
                          {r.approved_at && " ✓"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <PayrollRunActions 
                          runId={r.id} 
                          status={r.status} 
                          onRefresh={() => { fetchRuns(); fetchStats(); }} 
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AdvancedPayrollGenerator
          open={openGen}
          onOpenChange={setOpenGen}
          onSuccess={() => { fetchRuns(); fetchStats(); }}
        />

        <PayrollSettings
          open={openSettings}
          onOpenChange={setOpenSettings}
        />
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { ErpLayout } from "@/components/ErpLayout";
import { Plus, Calendar as CalendarIcon } from "lucide-react";

interface PayrollRun {
  id: string;
  user_id: string;
  period_year: number;
  period_month: number;
  run_date: string;
  employee_count: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  status: string;
  notes?: string | null;
}

export default function Payroll() {
  const { user } = useAuth();
  const { toast } = useToast();

  const now = new Date();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGen, setOpenGen] = useState(false);
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  
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
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payroll_runs")
        .select("*")
        .order("run_date", { ascending: false });
      if (error) throw error;
      setRuns(data || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load payroll runs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generatePayroll = async () => {
    if (!user) return;
    try {
      // 1) Load active employees with salary
      const { data: employees, error: empErr } = await supabase
        .from("employees")
        .select("id, full_name, salary, is_active")
        .eq("is_active", true);
      if (empErr) throw empErr;

      const items = (employees || []).map((e) => {
        const basic = Number(e.salary ?? 0);
        const allowances = 0;
        const deductions = 0;
        const gross = basic + allowances;
        const net = gross - deductions;
        return {
          employee_id: e.id,
          basic,
          allowances,
          deductions,
          gross,
          net,
        };
      });

      const employee_count = items.length;
      const total_gross = items.reduce((s, it) => s + (it.gross ?? 0), 0);
      const total_deductions = items.reduce((s, it) => s + (it.deductions ?? 0), 0);
      const total_net = items.reduce((s, it) => s + (it.net ?? 0), 0);

      // 2) Create payroll run
      const runInsert = {
        user_id: user.id,
        period_year: Number(year),
        period_month: Number(month),
        employee_count,
        total_gross,
        total_deductions,
        total_net,
        status: "completed",
      };

      const { data: run, error: runErr } = await supabase
        .from("payroll_runs")
        .insert([runInsert])
        .select("id").single();
      if (runErr) {
        // Handle duplicate month/year
        if (String(runErr.message).toLowerCase().includes("duplicate") || runErr.code === "23505") {
          toast({ title: "Already exists", description: "A payroll run for this period already exists.", variant: "destructive" });
          return;
        }
        throw runErr;
      }

      // 3) Insert items
      if (run?.id && items.length) {
        const payload = items.map((it) => ({ ...it, payroll_run_id: run.id }));
        const { error: itemsErr } = await supabase.from("payroll_items").insert(payload);
        if (itemsErr) throw itemsErr;
      }

      toast({ title: "Payroll generated", description: `Created payroll for ${months.find(m=>m.value===month)?.label} ${year}` });
      setOpenGen(false);
      fetchRuns();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate payroll", variant: "destructive" });
    }
  };

  const fmtCurrency = (n: number | null | undefined) => `₹${Number(n ?? 0).toLocaleString()}`;
  const periodText = (m: number, y: number) => `${months[m-1]?.label || m}/${y}`;

  useEffect(() => {
    document.title = "Payroll | ERP";
  }, []);

  return (
    <ErpLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payroll</h1>
            <p className="text-muted-foreground">Generate monthly payslips and review payroll runs</p>
          </div>
          <Dialog open={openGen} onOpenChange={setOpenGen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Generate Payroll
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Payroll</DialogTitle>
                <DialogDescription>Select the month and year to generate payslips</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Month</label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Year</label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setOpenGen(false)}>Cancel</Button>
                <Button onClick={generatePayroll}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Payroll Runs</CardTitle>
            <CardDescription>History of generated payrolls</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Run Date</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">No payroll runs yet</TableCell>
                  </TableRow>
                ) : (
                  runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{periodText(r.period_month, r.period_year)}</TableCell>
                      <TableCell>{new Date(r.run_date).toLocaleDateString()}</TableCell>
                      <TableCell>{r.employee_count}</TableCell>
                      <TableCell>{fmtCurrency(r.total_gross)}</TableCell>
                      <TableCell>{fmtCurrency(r.total_deductions)}</TableCell>
                      <TableCell>{fmtCurrency(r.total_net)}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'completed' ? 'default' : 'secondary'}>{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ErpLayout>
  );
}

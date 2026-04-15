import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Clock, 
  Calendar, 
  DollarSign, 
  Building, 
  UserPlus,
  ClipboardList,
  LogOut,
  Settings
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { EmployeeForm } from "@/components/EmployeeForm";
import { AdvancedPayrollGenerator } from "@/components/payroll/AdvancedPayrollGenerator";
import { PayrollSettings } from "@/components/payroll/PayrollSettings";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HRDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showPayrollGenerator, setShowPayrollGenerator] = useState(false);
  const [showPayrollSettings, setShowPayrollSettings] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Stats
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    pendingPayroll: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees
      const { data: empData } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });
      setEmployees(empData || []);

      // Fetch today's attendance
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: attData } = await supabase
        .from("attendance_records")
        .select("*, employees(full_name, employee_id)")
        .eq("attendance_date", today)
        .order("check_in", { ascending: false });
      setAttendanceRecords(attData || []);

      // Fetch recent payroll runs
      const { data: payrollData } = await supabase
        .from("payroll_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setPayrollRuns(payrollData || []);

      // Calculate stats
      const activeEmps = empData?.filter((e) => e.is_active) || [];
      const presentToday = attData?.filter((a) => a.status === "present").length || 0;
      const pendingPayroll = payrollData?.filter((p) => p.status === "draft").length || 0;

      setStats({
        totalEmployees: empData?.length || 0,
        activeEmployees: activeEmps.length,
        presentToday,
        pendingPayroll,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const fetchAttendanceByDate = async (date: string) => {
    setSelectedDate(date);
    const { data } = await supabase
      .from("attendance_records")
      .select("*, employees(full_name, employee_id)")
      .eq("attendance_date", date)
      .order("check_in", { ascending: false });
    setAttendanceRecords(data || []);
  };

  const updateAttendanceStatus = async (recordId: string, newStatus: string) => {
    const { error } = await supabase
      .from("attendance_records")
      .update({ status: newStatus, approved_by: user?.id })
      .eq("id", recordId);

    if (error) {
      toast({ title: "Error", description: "Failed to update attendance", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Attendance updated" });
      fetchAttendanceByDate(selectedDate);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading HR Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">HR Dashboard</h1>
              <p className="text-sm text-muted-foreground">Human Resource Management System</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                  <p className="text-xs text-muted-foreground">{stats.activeEmployees} active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.presentToday}</div>
                  <p className="text-xs text-muted-foreground">of {stats.activeEmployees} active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payroll</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingPayroll}</div>
                  <p className="text-xs text-muted-foreground">drafts to process</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button size="sm" className="w-full" onClick={() => setShowAddEmployee(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Attendance</CardTitle>
                <CardDescription>Recent check-ins for {format(new Date(), "MMMM d, yyyy")}</CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceRecords.length === 0 ? (
                  <p className="text-muted-foreground">No attendance records for today</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.slice(0, 5).map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.employees?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{record.employees?.employee_id}</p>
                            </div>
                          </TableCell>
                          <TableCell>{record.check_in || "-"}</TableCell>
                          <TableCell>{record.check_out || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={record.status === "present" ? "default" : "secondary"}>
                              {record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Employee Management</h2>
              <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                  </DialogHeader>
                  <EmployeeForm
                    onSuccess={() => {
                      setShowAddEmployee(false);
                      fetchData();
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.employee_id}</TableCell>
                        <TableCell>{emp.full_name}</TableCell>
                        <TableCell>{emp.email}</TableCell>
                        <TableCell>{emp.department || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{emp.sector}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={emp.is_active ? "default" : "secondary"}>
                            {emp.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Attendance Management</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => fetchAttendanceByDate(e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Overtime (hrs)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No attendance records for this date
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendanceRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{record.employees?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{record.employees?.employee_id}</p>
                            </div>
                          </TableCell>
                          <TableCell>{record.check_in || "-"}</TableCell>
                          <TableCell>{record.check_out || "-"}</TableCell>
                          <TableCell>{record.overtime_hours || 0}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.status === "present"
                                  ? "default"
                                  : record.status === "absent"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={record.status}
                              onValueChange={(value) => updateAttendanceStatus(record.id, value)}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="half_day">Half Day</SelectItem>
                                <SelectItem value="leave">Leave</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Payroll Management</h2>
              <div className="flex gap-2">
                <Button onClick={() => setShowPayrollSettings(true)} variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button onClick={() => setShowPayrollGenerator(true)}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Generate Payroll
                </Button>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Payroll Runs</CardTitle>
              </CardHeader>
              <CardContent>
                {payrollRuns.length === 0 ? (
                  <p className="text-muted-foreground">No payroll runs yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Employees</TableHead>
                        <TableHead>Total Gross</TableHead>
                        <TableHead>Total Net</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollRuns.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell>
                            {new Date(run.period_year, run.period_month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </TableCell>
                          <TableCell>{run.employee_count}</TableCell>
                          <TableCell>₹{run.total_gross?.toLocaleString()}</TableCell>
                          <TableCell>₹{run.total_net?.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={run.status === "approved" ? "default" : "secondary"}>
                              {run.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            
            <AdvancedPayrollGenerator 
              open={showPayrollGenerator} 
              onOpenChange={setShowPayrollGenerator}
              onSuccess={() => {
                setShowPayrollGenerator(false);
                fetchData();
              }}
            />
            <PayrollSettings 
              open={showPayrollSettings} 
              onOpenChange={setShowPayrollSettings}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>HR Settings</CardTitle>
                <CardDescription>Configure HR and payroll settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => setShowPayrollSettings(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Payroll Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

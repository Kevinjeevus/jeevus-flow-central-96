import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

interface SessionRow {
  id: string;
  user_id: string;
  route_id: string | null;
  login_time: string;
  logout_time: string | null;
  status: string;
}

interface EmployeeInfo {
  user_id: string;
  full_name: string;
  employee_id: string;
}

interface RouteInfo {
  id: string;
  name: string;
  description: string | null;
}

interface CombinedRecord extends SessionRow {
  employee?: EmployeeInfo;
  route?: RouteInfo;
}

export default function AdminAttendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [records, setRecords] = useState<CombinedRecord[]>([]);

  // Basic SEO: title, description, canonical
  useEffect(() => {
    document.title = "Admin Attendance | HRM";
    const ensureMeta = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    ensureMeta("description", "Admin attendance records: view all users' login and logout sessions with employee name and ID.");

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.href = window.location.href;
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      try {
        // Check role from profiles (RLS: user can view own profile)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        const admin = profile?.role === "admin";
        setIsAdmin(admin);
        if (!admin) {
          setRecords([]);
          return;
        }

        // Fetch all sessions (admins can view all via policy)
        const { data: sessions, error: sessionsError } = await supabase
          .from("user_sessions")
          .select("id, user_id, route_id, login_time, logout_time, status")
          .order("login_time", { ascending: false });

        if (sessionsError) throw sessionsError;
        const sessionRows: SessionRow[] = sessions || [];

        // Collect related ids
        const userIds = Array.from(new Set(sessionRows.map(s => s.user_id)));
        const routeIds = Array.from(new Set(sessionRows.map(s => s.route_id).filter(Boolean))) as string[];

        // Fetch employees for mapping
        let employeesMap = new Map<string, EmployeeInfo>();
        if (userIds.length) {
          const { data: employees, error: empError } = await supabase
            .from("employees")
            .select("user_id, full_name, employee_id")
            .in("user_id", userIds);
          if (empError) throw empError;
          (employees || []).forEach(e => employeesMap.set(e.user_id, e as EmployeeInfo));
        }

        // Fetch routes for mapping
        let routesMap = new Map<string, RouteInfo>();
        if (routeIds.length) {
          const { data: routes, error: routesError } = await supabase
            .from("routes")
            .select("id, name, description")
            .in("id", routeIds);
          if (routesError) throw routesError;
          (routes || []).forEach(r => routesMap.set(r.id, r as RouteInfo));
        }

        const combined: CombinedRecord[] = sessionRows.map(s => ({
          ...s,
          employee: employeesMap.get(s.user_id),
          route: s.route_id ? routesMap.get(s.route_id) : undefined,
        }));

        setRecords(combined);
      } catch (err) {
        console.error("Error loading admin attendance:", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user]);

  const calculateDuration = (loginTime: string, logoutTime: string | null) => {
    if (!logoutTime) return "Active";
    const login = new Date(loginTime);
    const logout = new Date(logoutTime);
    const diffMs = logout.getTime() - login.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Access denied
            </CardTitle>
            <CardDescription>Only administrators can view all attendance records.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Attendance</h1>
        <p className="text-muted-foreground">All users' attendance records with employee names and IDs</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance Sessions
          </CardTitle>
          <CardDescription>Overview of all login sessions across users</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Employee</TableHead>
                    <TableHead className="min-w-[120px]">Employee ID</TableHead>
                    <TableHead className="min-w-[220px]">User ID</TableHead>
                    <TableHead className="min-w-[150px]">Route</TableHead>
                    <TableHead className="min-w-[120px]">Date</TableHead>
                    <TableHead className="min-w-[100px]">Login</TableHead>
                    <TableHead className="min-w-[100px]">Logout</TableHead>
                    <TableHead className="min-w-[100px]">Duration</TableHead>
                    <TableHead className="min-w-[90px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employee?.full_name || "-"}</TableCell>
                      <TableCell>{r.employee?.employee_id || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.user_id}</TableCell>
                      <TableCell>
                        {r.route ? (
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {r.route.name}
                            </div>
                            {r.route.description && (
                              <div className="text-sm text-muted-foreground">{r.route.description}</div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{new Date(r.login_time).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {new Date(r.login_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell>
                        {r.logout_time
                          ? new Date(r.logout_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </TableCell>
                      <TableCell>{calculateDuration(r.login_time, r.logout_time)}</TableCell>
                      <TableCell>
                        <Badge className={statusBadge(r.status)}>{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

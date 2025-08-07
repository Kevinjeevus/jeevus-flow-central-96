import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';

interface AttendanceRecord {
  id: string;
  login_time: string;
  logout_time: string | null;
  status: string;
  routes: {
    name: string;
    description: string;
  };
}

export default function AttendanceHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAttendanceRecords();
    }
  }, [user]);

  const fetchAttendanceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          id,
          login_time,
          logout_time,
          status,
          routes (
            name,
            description
          )
        `)
        .eq('user_id', user?.id)
        .order('login_time', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDuration = (loginTime: string, logoutTime: string | null) => {
    if (!logoutTime) return 'Active';
    
    const login = new Date(loginTime);
    const logout = new Date(logoutTime);
    const diffMs = logout.getTime() - login.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/employee-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Attendance History</h1>
            <p className="text-muted-foreground">Your complete attendance records</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance Records
            </CardTitle>
            <CardDescription>
              View all your login sessions and route assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No attendance records found</p>
                <p className="text-sm">Start marking attendance to see your history</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Date</TableHead>
                      <TableHead className="min-w-[150px]">Route</TableHead>
                      <TableHead className="min-w-[100px]">Login Time</TableHead>
                      <TableHead className="min-w-[100px]">Logout Time</TableHead>
                      <TableHead className="min-w-[80px]">Duration</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {new Date(record.login_time).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {record.routes.name}
                            </div>
                            {record.routes.description && (
                              <div className="text-sm text-muted-foreground">
                                {record.routes.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(record.login_time).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </TableCell>
                        <TableCell>
                          {record.logout_time ? 
                            new Date(record.logout_time).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : 
                            '-'
                          }
                        </TableCell>
                        <TableCell>
                          {calculateDuration(record.login_time, record.logout_time)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
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
    </div>
  );
}
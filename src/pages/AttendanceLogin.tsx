import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, LogOut, MapPin, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Route {
  id: string;
  name: string;
  description: string;
}

interface ActiveSession {
  id: string;
  route_id: string;
  login_time: string;
  routes: Route;
}

interface PreviousSession {
  route_id: string;
  routes: Route;
  login_time: string;
}

export default function AttendanceLogin() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [previousSession, setPreviousSession] = useState<PreviousSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // All hooks must be called before any early returns
  useEffect(() => {
    if (user) {
      fetchRoutes();
      checkActiveSession();
      fetchPreviousSession();
    }
  }, [user]);

  // Early returns AFTER all hooks
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setRoutes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch routes",
        variant: "destructive",
      });
    }
  };

  const checkActiveSession = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          id,
          route_id,
          login_time,
          routes (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .gte('login_time', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setActiveSession(data);
    } catch (error: any) {
      console.error('Error checking active session:', error);
    }
  };

  const fetchPreviousSession = async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('user_sessions')
        .select(`
          route_id,
          login_time,
          routes (
            id,
            name,
            description
          )
        `)
        .eq('user_id', user?.id)
        .gte('login_time', yesterdayStr)
        .lt('login_time', new Date().toISOString().split('T')[0])
        .order('login_time', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setPreviousSession(data);
      
      // Auto-select previous route if available
      if (data && !selectedRoute) {
        setSelectedRoute(data.route_id);
      }
    } catch (error: any) {
      console.error('Error fetching previous session:', error);
    }
  };

  const handleMarkAttendance = async () => {
    if (!selectedRoute) {
      toast({
        title: "Error",
        description: "Please select a route",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user?.id,
          route_id: selectedRoute,
          status: 'active'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attendance marked successfully!",
      });

      // Refresh active session
      await checkActiveSession();
      navigate('/salesman-dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // Update active session to logged out
      if (activeSession) {
        await supabase
          .from('user_sessions')
          .update({ 
            status: 'completed',
            logout_time: new Date().toISOString()
          })
          .eq('id', activeSession.id);
      }

      // Sign out from Supabase
      await supabase.auth.signOut();
      
      toast({
        title: "Success",
        description: "Logged out successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (activeSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-green-700">
              <Clock className="w-6 h-6 inline mr-2" />
              Active Session
            </CardTitle>
            <CardDescription>
              You are currently logged in to a route
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-800">Current Route:</span>
              </div>
              <p className="text-green-700 font-medium">{activeSession.routes.name}</p>
              <p className="text-sm text-green-600 mt-1">
                Logged in at: {new Date(activeSession.login_time).toLocaleString()}
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/salesman-dashboard')} 
                className="w-full bg-gradient-primary hover:bg-gradient-primary/90"
              >
                Go to Dashboard
              </Button>
              
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                className="w-full"
                disabled={isLoading}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {isLoading ? "Logging out..." : "End Session & Logout"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            <Clock className="w-6 h-6 inline mr-2" />
            Mark Attendance
          </CardTitle>
          <CardDescription>
            Select your route and start your session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Previous Route Info */}
          {previousSession && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-800">Previous Route:</span>
              </div>
              <p className="text-blue-700 font-medium">{previousSession.routes.name}</p>
              <p className="text-sm text-blue-600">
                Last used: {new Date(previousSession.login_time).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Today's Route</label>
            <Select value={selectedRoute} onValueChange={setSelectedRoute}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your route" />
              </SelectTrigger>
              <SelectContent>
                {routes.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{route.name}</div>
                        {route.description && (
                          <div className="text-sm text-muted-foreground">{route.description}</div>
                        )}
                      </div>
                      {previousSession?.route_id === route.id && (
                        <Badge variant="secondary" className="ml-2">Previous</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleMarkAttendance} 
              className="w-full bg-gradient-primary hover:bg-gradient-primary/90"
              disabled={isLoading || !selectedRoute}
            >
              {isLoading ? "Marking Attendance..." : "Mark Attendance & Start Session"}
            </Button>
            
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, FileText, Users } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setProfileLoading(false);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setUserProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  if (loading || profileLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (user) {
    // Redirect based on user role
    if (userProfile?.role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    
    // Redirect to attendance page for route users
    return <Navigate to="/attendance" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            JEEVUS ERP System
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Complete Sales Route Management & Invoice Tracking Solution
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-primary hover:bg-gradient-primary/90"
              onClick={() => navigate('/auth')}
            >
              Admin Login
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/employee-auth')}
            >
              Employee Login
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center">
            <CardHeader>
              <Clock className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Attendance Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Mark attendance and track working hours with route selection
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <MapPin className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Route Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Organize sales territories and assign customers to routes
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Invoice Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create and manage invoices linked to routes and sessions
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Customer Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track customer interactions and billing history by route
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
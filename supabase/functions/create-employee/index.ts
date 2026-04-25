import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    const token = authHeader.replace('Bearer ', '')

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      console.error('Auth error:', userError?.message)
      return new Response(
        JSON.stringify({ error: userError?.message || 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if the user has permission to create employees (you can customize this logic)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    // Allow admin or if no profile exists (for first admin setup)
    if (profile && profile.role !== 'admin' && profile.role !== 'hr') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { 
      full_name, 
      email, 
      password, 
      phone, 
      employee_id, 
      designation, 
      department, 
      sector, 
      date_of_joining, 
      salary, 
      username,
      assign_role 
    } = await req.json()

    // Check for duplicate username before creating user
    const { data: existingEmployee } = await supabaseAdmin
      .from('employees')
      .select('username')
      .eq('username', username)
      .single()
    
    if (existingEmployee) {
      return new Response(
        JSON.stringify({ error: 'Username already exists' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check for duplicate employee_id
    const { data: existingEmpId } = await supabaseAdmin
      .from('employees')
      .select('employee_id')
      .eq('employee_id', employee_id)
      .single()
    
    if (existingEmpId) {
      return new Response(
        JSON.stringify({ error: 'Employee ID already exists' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create the user account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: sector === "admin" ? "admin" : "employee",
      }
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create employee record
    const { error: employeeError } = await supabaseAdmin.from("employees").insert({
      user_id: authData.user.id,
      full_name,
      email,
      phone,
      employee_id,
      designation,
      department,
      sector,
      date_of_joining,
      salary,
      username,
      created_by: user.id,
    })

    if (employeeError) {
      return new Response(
        JSON.stringify({ error: employeeError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Map sector to valid profile role
    // profiles.role CHECK constraint allows: admin, employee, manager, salesman, accountant, marketing, manufacturing, hr, sales
    const sectorToProfileRole = (s: string): string => {
      const validRoles = ['admin', 'employee', 'manager', 'salesman', 'accountant', 'marketing', 'manufacturing', 'hr', 'sales'];
      return validRoles.includes(s) ? s : 'employee';
    };

    // Create profile record
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: authData.user.id,
      full_name,
      email,
      phone,
      role: sectorToProfileRole(sector),
    })

    if (profileError) {
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Assign role in user_roles table
    const roleToAssign = assign_role || (sector === "admin" ? "admin" : sector === "hr" ? "hr" : "employee")
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: authData.user.id,
      role: roleToAssign,
      created_by: user.id,
    })

    if (roleError) {
      console.error("Error assigning role:", roleError)
      // Don't fail the whole creation if role assignment fails
    }

    return new Response(
      JSON.stringify({ 
        message: 'Employee created successfully',
        employee_id: authData.user.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
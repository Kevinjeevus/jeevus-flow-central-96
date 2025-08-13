-- Enhanced payroll system with more detailed structure

-- Add more columns to payroll_runs for advanced tracking
ALTER TABLE public.payroll_runs 
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payroll_period_start DATE,
ADD COLUMN IF NOT EXISTS payroll_period_end DATE,
ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_overtime_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_allowances NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_basic NUMERIC DEFAULT 0;

-- Enhanced payroll_items with detailed breakdown
ALTER TABLE public.payroll_items 
ADD COLUMN IF NOT EXISTS hra NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS transport_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS medical_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS special_allowance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pf_deduction NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS esi_deduction NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_deduction NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS professional_tax NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS loan_deduction NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_deductions NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS attendance_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS working_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS leave_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create payroll_settings table for configuration
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pf_rate NUMERIC DEFAULT 12.0,
  esi_rate NUMERIC DEFAULT 0.75,
  professional_tax_slab JSONB DEFAULT '[]'::jsonb,
  hra_percentage NUMERIC DEFAULT 40.0,
  transport_allowance_amount NUMERIC DEFAULT 1600.0,
  medical_allowance_amount NUMERIC DEFAULT 1250.0,
  overtime_multiplier NUMERIC DEFAULT 2.0,
  tax_slabs JSONB DEFAULT '[]'::jsonb,
  working_days_per_month INTEGER DEFAULT 26,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

-- RLS for payroll_settings
CREATE POLICY "Users can manage their payroll settings"
ON public.payroll_settings
FOR ALL
USING (auth.uid() = user_id);

-- Updated at trigger for payroll_settings
CREATE TRIGGER trg_update_payroll_settings_updated_at
BEFORE UPDATE ON public.payroll_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create attendance_records table for tracking attendance
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  attendance_date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  break_duration INTEGER DEFAULT 0, -- in minutes
  overtime_hours NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'present', -- present, absent, half_day, holiday, leave
  notes TEXT,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_employee_date UNIQUE (employee_id, attendance_date)
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS for attendance_records
CREATE POLICY "Authenticated users can manage attendance"
ON public.attendance_records
FOR ALL
USING (auth.role() = 'authenticated');

-- Updated at trigger for attendance_records
CREATE TRIGGER trg_update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance_records(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee ON public.payroll_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_settings_user ON public.payroll_settings(user_id);
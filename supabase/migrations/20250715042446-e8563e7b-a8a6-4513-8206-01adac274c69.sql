-- Create accounts table for chart of accounts
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT UNIQUE NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('assets', 'liabilities', 'equity', 'income', 'expenses')),
  parent_account_id UUID REFERENCES public.accounts(id),
  opening_balance NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('payment_in', 'payment_out')),
  customer_id UUID REFERENCES public.customers(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  account_id UUID REFERENCES public.accounts(id) NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'card', 'upi')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  user_id UUID NOT NULL
);

-- Create GST records table for GSTR filings
CREATE TABLE public.gst_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gstr_type TEXT NOT NULL CHECK (gstr_type IN ('gstr1', 'gstr2', 'gstr3b', 'gstr9')),
  return_period TEXT NOT NULL, -- Format: MMYYYY
  filing_date DATE,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'filed', 'revised')),
  total_taxable_value NUMERIC DEFAULT 0,
  total_igst NUMERIC DEFAULT 0,
  total_cgst NUMERIC DEFAULT 0,
  total_sgst NUMERIC DEFAULT 0,
  total_cess NUMERIC DEFAULT 0,
  total_tax_amount NUMERIC DEFAULT 0,
  json_data JSONB, -- Store complete GSTR data
  acknowledgment_number TEXT,
  filed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(gstr_type, return_period)
);

-- Create bank analysis table
CREATE TABLE public.bank_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  statement_period_start DATE NOT NULL,
  statement_period_end DATE NOT NULL,
  opening_balance NUMERIC NOT NULL,
  closing_balance NUMERIC NOT NULL,
  total_credits NUMERIC DEFAULT 0,
  total_debits NUMERIC DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  average_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create bank transactions table for detailed analysis
CREATE TABLE public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_analysis_id UUID REFERENCES public.bank_analysis(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_number TEXT,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  balance NUMERIC NOT NULL,
  transaction_type TEXT,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reports configuration table
CREATE TABLE public.report_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('profit_loss', 'balance_sheet', 'cash_flow', 'trial_balance', 'gst_summary', 'bank_reconciliation')),
  parameters JSONB DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  user_id UUID NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for accounts
CREATE POLICY "Authenticated users can manage accounts" ON public.accounts
  FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for payments
CREATE POLICY "Users can manage their payments" ON public.payments
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for GST records
CREATE POLICY "Authenticated users can manage GST records" ON public.gst_records
  FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for bank analysis
CREATE POLICY "Authenticated users can manage bank analysis" ON public.bank_analysis
  FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for bank transactions
CREATE POLICY "Authenticated users can view bank transactions" ON public.bank_transactions
  FOR ALL USING (auth.role() = 'authenticated');

-- Create RLS policies for report configs
CREATE POLICY "Users can manage their report configs" ON public.report_configs
  FOR ALL USING (auth.uid() = user_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gst_records_updated_at
  BEFORE UPDATE ON public.gst_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_analysis_updated_at
  BEFORE UPDATE ON public.bank_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_report_configs_updated_at
  BEFORE UPDATE ON public.report_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample chart of accounts
INSERT INTO public.accounts (account_code, account_name, account_type, opening_balance, current_balance) VALUES
('1000', 'Assets', 'assets', 0, 0),
('1100', 'Current Assets', 'assets', 0, 0),
('1110', 'Cash in Hand', 'assets', 50000, 50000),
('1120', 'Bank Account', 'assets', 100000, 100000),
('1130', 'Accounts Receivable', 'assets', 75000, 75000),
('1200', 'Fixed Assets', 'assets', 0, 0),
('1210', 'Equipment', 'assets', 200000, 200000),
('2000', 'Liabilities', 'liabilities', 0, 0),
('2100', 'Current Liabilities', 'liabilities', 0, 0),
('2110', 'Accounts Payable', 'liabilities', 25000, 25000),
('2120', 'Tax Payable', 'liabilities', 15000, 15000),
('3000', 'Equity', 'equity', 0, 0),
('3100', 'Capital', 'equity', 300000, 300000),
('4000', 'Revenue', 'income', 0, 0),
('4100', 'Sales Revenue', 'income', 0, 0),
('5000', 'Expenses', 'expenses', 0, 0),
('5100', 'Operating Expenses', 'expenses', 0, 0),
('5110', 'Office Rent', 'expenses', 0, 0),
('5120', 'Utilities', 'expenses', 0, 0);
-- Create cheques table for cheque management
CREATE TABLE public.cheques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cheque_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  cheque_date DATE NOT NULL,
  payee_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deposited', 'cancelled', 'bounced')),
  account_id UUID REFERENCES public.accounts(id),
  deposited_to_account_id UUID REFERENCES public.accounts(id),
  deposited_date DATE,
  notes TEXT,
  created_by UUID,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cheques
CREATE POLICY "Users can manage their own cheques" 
ON public.cheques 
FOR ALL 
USING (auth.uid() = user_id);

-- Add payment_method field to sales_invoices to track payment method
ALTER TABLE public.sales_invoices 
ADD COLUMN payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank', 'cheque'));

-- Add payment_account_id to track which account was used for payment
ALTER TABLE public.sales_invoices 
ADD COLUMN payment_account_id UUID REFERENCES public.accounts(id);

-- Add cheque_id to link invoices with specific cheques
ALTER TABLE public.sales_invoices 
ADD COLUMN cheque_id UUID REFERENCES public.cheques(id);

-- Create account_transactions table to track all account movements
CREATE TABLE public.account_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT CHECK (reference_type IN ('invoice', 'payment', 'cheque', 'manual')),
  reference_id UUID,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  balance_after NUMERIC,
  created_by UUID,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for account_transactions
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for account_transactions
CREATE POLICY "Users can manage their account transactions" 
ON public.account_transactions 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger to update account balance when transactions are added
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update account current_balance
    UPDATE accounts 
    SET current_balance = current_balance + 
      CASE 
        WHEN NEW.transaction_type = 'credit' THEN NEW.amount 
        ELSE -NEW.amount 
      END,
      updated_at = now()
    WHERE id = NEW.account_id;
    
    -- Update balance_after in the transaction record
    UPDATE account_transactions 
    SET balance_after = (
      SELECT current_balance 
      FROM accounts 
      WHERE id = NEW.account_id
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER account_balance_update_trigger
  AFTER INSERT ON account_transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Add triggers for updated_at
CREATE TRIGGER update_cheques_updated_at
  BEFORE UPDATE ON public.cheques
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_account_transactions_updated_at
  BEFORE UPDATE ON public.account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
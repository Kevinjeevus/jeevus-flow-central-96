-- Add bank account specific fields to accounts table
ALTER TABLE public.accounts 
ADD COLUMN account_number TEXT,
ADD COLUMN ifsc_code TEXT,
ADD COLUMN upi_id TEXT,
ADD COLUMN bank_name TEXT,
ADD COLUMN account_holder_name TEXT,
ADD COLUMN print_upi_qr_code BOOLEAN DEFAULT false,
ADD COLUMN print_bank_details BOOLEAN DEFAULT false,
ADD COLUMN as_of_date DATE DEFAULT CURRENT_DATE;
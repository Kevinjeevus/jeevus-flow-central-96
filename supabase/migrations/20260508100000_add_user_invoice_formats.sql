-- Create user_invoice_formats table
-- Admin can assign different invoice formats per user
CREATE TABLE IF NOT EXISTS public.user_invoice_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  format_name TEXT NOT NULL DEFAULT 'Default',
  -- Header settings
  show_company_logo BOOLEAN DEFAULT true,
  show_company_name BOOLEAN DEFAULT true,
  show_company_address BOOLEAN DEFAULT true,
  show_company_phone BOOLEAN DEFAULT true,
  show_gstin BOOLEAN DEFAULT true,
  invoice_title TEXT DEFAULT 'TAX INVOICE',
  -- Column visibility
  show_hsn_column BOOLEAN DEFAULT true,
  show_gst_column BOOLEAN DEFAULT true,
  show_unit_column BOOLEAN DEFAULT true,
  show_discount_column BOOLEAN DEFAULT false,
  -- Footer sections
  show_bank_details BOOLEAN DEFAULT true,
  show_terms BOOLEAN DEFAULT true,
  show_signature BOOLEAN DEFAULT true,
  show_hsn_summary BOOLEAN DEFAULT true,
  show_amount_in_words BOOLEAN DEFAULT true,
  show_previous_due BOOLEAN DEFAULT false,
  -- Custom text
  custom_terms_text TEXT DEFAULT 'Thanks for doing business with us!',
  custom_footer_text TEXT DEFAULT 'Thank you for your business!',
  custom_signatory_name TEXT DEFAULT '',
  -- Styling
  primary_color TEXT DEFAULT '#333333',
  accent_color TEXT DEFAULT '#f5f5f5',
  font_size TEXT DEFAULT 'medium',
  paper_size TEXT DEFAULT 'A4',
  orientation TEXT DEFAULT 'portrait',
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_invoice_formats ENABLE ROW LEVEL SECURITY;

-- Admin can manage all formats
CREATE POLICY "Admins can manage all invoice formats"
  ON public.user_invoice_formats
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Users can read their own format
CREATE POLICY "Users can read own invoice format"
  ON public.user_invoice_formats
  FOR SELECT
  USING (user_id = auth.uid());

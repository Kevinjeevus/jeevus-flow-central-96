export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      account_transactions: {
        Row: {
          account_id: string
          amount: number
          balance_after: number | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          reference_id: string | null
          reference_type: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          balance_after?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          balance_after?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_code: string
          account_holder_name: string | null
          account_name: string
          account_number: string | null
          account_type: string
          as_of_date: string | null
          bank_name: string | null
          created_at: string
          created_by: string | null
          current_balance: number | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          opening_balance: number | null
          parent_account_id: string | null
          print_bank_details: boolean | null
          print_upi_qr_code: boolean | null
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          account_code: string
          account_holder_name?: string | null
          account_name: string
          account_number?: string | null
          account_type: string
          as_of_date?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          current_balance?: number | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          opening_balance?: number | null
          parent_account_id?: string | null
          print_bank_details?: boolean | null
          print_upi_qr_code?: boolean | null
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          account_code?: string
          account_holder_name?: string | null
          account_name?: string
          account_number?: string | null
          account_type?: string
          as_of_date?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          current_balance?: number | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          opening_balance?: number | null
          parent_account_id?: string | null
          print_bank_details?: boolean | null
          print_upi_qr_code?: boolean | null
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          approved_by: string | null
          attendance_date: string
          break_duration: number | null
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          overtime_hours: number | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          attendance_date: string
          break_duration?: number | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          attendance_date?: string
          break_duration?: number | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_analysis: {
        Row: {
          account_id: string
          account_number: string
          average_balance: number | null
          bank_name: string
          closing_balance: number
          created_at: string
          created_by: string | null
          id: string
          opening_balance: number
          statement_period_end: string
          statement_period_start: string
          total_credits: number | null
          total_debits: number | null
          transaction_count: number | null
          updated_at: string
        }
        Insert: {
          account_id: string
          account_number: string
          average_balance?: number | null
          bank_name: string
          closing_balance: number
          created_at?: string
          created_by?: string | null
          id?: string
          opening_balance: number
          statement_period_end: string
          statement_period_start: string
          total_credits?: number | null
          total_debits?: number | null
          transaction_count?: number | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_number?: string
          average_balance?: number | null
          bank_name?: string
          closing_balance?: number
          created_at?: string
          created_by?: string | null
          id?: string
          opening_balance?: number
          statement_period_end?: string
          statement_period_start?: string
          total_credits?: number | null
          total_debits?: number | null
          transaction_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_analysis_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          balance: number
          bank_analysis_id: string | null
          category: string | null
          created_at: string
          credit_amount: number | null
          debit_amount: number | null
          description: string
          id: string
          reference_number: string | null
          transaction_date: string
          transaction_type: string | null
        }
        Insert: {
          balance: number
          bank_analysis_id?: string | null
          category?: string | null
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description: string
          id?: string
          reference_number?: string | null
          transaction_date: string
          transaction_type?: string | null
        }
        Update: {
          balance?: number
          bank_analysis_id?: string | null
          category?: string | null
          created_at?: string
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string
          id?: string
          reference_number?: string | null
          transaction_date?: string
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_analysis_id_fkey"
            columns: ["bank_analysis_id"]
            isOneToOne: false
            referencedRelation: "bank_analysis"
            referencedColumns: ["id"]
          },
        ]
      }
      cheques: {
        Row: {
          account_id: string | null
          amount: number
          bank_name: string
          cheque_date: string
          cheque_number: string
          created_at: string
          created_by: string | null
          deposited_date: string | null
          deposited_to_account_id: string | null
          id: string
          notes: string | null
          payee_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          bank_name: string
          cheque_date: string
          cheque_number: string
          created_at?: string
          created_by?: string | null
          deposited_date?: string | null
          deposited_to_account_id?: string | null
          id?: string
          notes?: string | null
          payee_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          bank_name?: string
          cheque_date?: string
          cheque_number?: string
          created_at?: string
          created_by?: string | null
          deposited_date?: string | null
          deposited_to_account_id?: string | null
          id?: string
          notes?: string | null
          payee_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheques_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_deposited_to_account_id_fkey"
            columns: ["deposited_to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          company_logo_url: string | null
          company_name: string
          company_name_text_size: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gstin: string | null
          id: string
          invoice_text_size: string | null
          make_regular_printer_default: boolean | null
          orientation: string | null
          paper_size: string | null
          phone_number: string | null
          print_repeat_header: boolean | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_name_text_size?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          invoice_text_size?: string | null
          make_regular_printer_default?: boolean | null
          orientation?: string | null
          paper_size?: string | null
          phone_number?: string | null
          print_repeat_header?: boolean | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_name_text_size?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          invoice_text_size?: string | null
          make_regular_printer_default?: boolean | null
          orientation?: string | null
          paper_size?: string | null
          phone_number?: string | null
          print_repeat_header?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          email: string | null
          gps_last_updated: string | null
          gps_latitude: number | null
          gps_longitude: number | null
          gstin: string | null
          id: string
          name: string
          outstanding_balance: number | null
          phone: string | null
          pincode: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          email?: string | null
          gps_last_updated?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gstin?: string | null
          id?: string
          name: string
          outstanding_balance?: number | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          email?: string | null
          gps_last_updated?: string | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          gstin?: string | null
          id?: string
          name?: string
          outstanding_balance?: number | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          created_by: string | null
          date_of_joining: string | null
          department: string | null
          designation: string | null
          email: string
          employee_id: string
          full_name: string
          id: string
          is_active: boolean | null
          manager_id: string | null
          phone: string | null
          salary: number | null
          sector: Database["public"]["Enums"]["employee_sector"] | null
          status: string
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_of_joining?: string | null
          department?: string | null
          designation?: string | null
          email: string
          employee_id: string
          full_name: string
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          phone?: string | null
          salary?: number | null
          sector?: Database["public"]["Enums"]["employee_sector"] | null
          status?: string
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_of_joining?: string | null
          department?: string | null
          designation?: string | null
          email?: string
          employee_id?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          phone?: string | null
          salary?: number | null
          sector?: Database["public"]["Enums"]["employee_sector"] | null
          status?: string
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string
          created_at: string
          description: string | null
          employee_id: string
          expense_date: string
          id: string
          receipt_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category: string
          created_at?: string
          description?: string | null
          employee_id: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          employee_id?: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gst_records: {
        Row: {
          acknowledgment_number: string | null
          created_at: string
          created_by: string | null
          due_date: string
          filed_by: string | null
          filing_date: string | null
          gstr_type: string
          id: string
          json_data: Json | null
          return_period: string
          status: string
          total_cess: number | null
          total_cgst: number | null
          total_igst: number | null
          total_sgst: number | null
          total_tax_amount: number | null
          total_taxable_value: number | null
          updated_at: string
        }
        Insert: {
          acknowledgment_number?: string | null
          created_at?: string
          created_by?: string | null
          due_date: string
          filed_by?: string | null
          filing_date?: string | null
          gstr_type: string
          id?: string
          json_data?: Json | null
          return_period: string
          status?: string
          total_cess?: number | null
          total_cgst?: number | null
          total_igst?: number | null
          total_sgst?: number | null
          total_tax_amount?: number | null
          total_taxable_value?: number | null
          updated_at?: string
        }
        Update: {
          acknowledgment_number?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          filed_by?: string | null
          filing_date?: string | null
          gstr_type?: string
          id?: string
          json_data?: Json | null
          return_period?: string
          status?: string
          total_cess?: number | null
          total_cgst?: number | null
          total_igst?: number | null
          total_sgst?: number | null
          total_tax_amount?: number | null
          total_taxable_value?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          id: string
          payment_date: string
          payment_method: string
          payment_number: string
          payment_type: string
          reference_number: string | null
          status: string
          supplier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          payment_date?: string
          payment_method: string
          payment_number: string
          payment_type: string
          reference_number?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          payment_date?: string
          payment_method?: string
          payment_number?: string
          payment_type?: string
          reference_number?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          absent_days: number | null
          allowances: number
          attendance_days: number | null
          basic: number
          created_at: string
          deductions: number
          employee_id: string
          esi_deduction: number | null
          gross: number
          hra: number | null
          id: string
          leave_days: number | null
          loan_deduction: number | null
          medical_allowance: number | null
          net: number
          notes: string | null
          other_deductions: number | null
          overtime_amount: number | null
          overtime_hours: number | null
          overtime_rate: number | null
          payroll_run_id: string
          pf_deduction: number | null
          professional_tax: number | null
          special_allowance: number | null
          tax_deduction: number | null
          transport_allowance: number | null
          working_days: number | null
        }
        Insert: {
          absent_days?: number | null
          allowances?: number
          attendance_days?: number | null
          basic?: number
          created_at?: string
          deductions?: number
          employee_id: string
          esi_deduction?: number | null
          gross?: number
          hra?: number | null
          id?: string
          leave_days?: number | null
          loan_deduction?: number | null
          medical_allowance?: number | null
          net?: number
          notes?: string | null
          other_deductions?: number | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          payroll_run_id: string
          pf_deduction?: number | null
          professional_tax?: number | null
          special_allowance?: number | null
          tax_deduction?: number | null
          transport_allowance?: number | null
          working_days?: number | null
        }
        Update: {
          absent_days?: number | null
          allowances?: number
          attendance_days?: number | null
          basic?: number
          created_at?: string
          deductions?: number
          employee_id?: string
          esi_deduction?: number | null
          gross?: number
          hra?: number | null
          id?: string
          leave_days?: number | null
          loan_deduction?: number | null
          medical_allowance?: number | null
          net?: number
          notes?: string | null
          other_deductions?: number | null
          overtime_amount?: number | null
          overtime_hours?: number | null
          overtime_rate?: number | null
          payroll_run_id?: string
          pf_deduction?: number | null
          professional_tax?: number | null
          special_allowance?: number | null
          tax_deduction?: number | null
          transport_allowance?: number | null
          working_days?: number | null
        }
        Relationships: []
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          employee_count: number
          id: string
          notes: string | null
          overtime_hours: number | null
          payroll_period_end: string | null
          payroll_period_start: string | null
          period_month: number
          period_year: number
          run_date: string
          status: string
          total_allowances: number | null
          total_basic: number | null
          total_deductions: number
          total_gross: number
          total_net: number
          total_overtime_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_count?: number
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          payroll_period_end?: string | null
          payroll_period_start?: string | null
          period_month: number
          period_year: number
          run_date?: string
          status?: string
          total_allowances?: number | null
          total_basic?: number | null
          total_deductions?: number
          total_gross?: number
          total_net?: number
          total_overtime_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          employee_count?: number
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          payroll_period_end?: string | null
          payroll_period_start?: string | null
          period_month?: number
          period_year?: number
          run_date?: string
          status?: string
          total_allowances?: number | null
          total_basic?: number | null
          total_deductions?: number
          total_gross?: number
          total_net?: number
          total_overtime_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payroll_settings: {
        Row: {
          created_at: string
          esi_rate: number | null
          hra_percentage: number | null
          id: string
          medical_allowance_amount: number | null
          overtime_multiplier: number | null
          pf_rate: number | null
          professional_tax_slab: Json | null
          tax_slabs: Json | null
          transport_allowance_amount: number | null
          updated_at: string
          user_id: string
          working_days_per_month: number | null
        }
        Insert: {
          created_at?: string
          esi_rate?: number | null
          hra_percentage?: number | null
          id?: string
          medical_allowance_amount?: number | null
          overtime_multiplier?: number | null
          pf_rate?: number | null
          professional_tax_slab?: Json | null
          tax_slabs?: Json | null
          transport_allowance_amount?: number | null
          updated_at?: string
          user_id: string
          working_days_per_month?: number | null
        }
        Update: {
          created_at?: string
          esi_rate?: number | null
          hra_percentage?: number | null
          id?: string
          medical_allowance_amount?: number | null
          overtime_multiplier?: number | null
          pf_rate?: number | null
          professional_tax_slab?: Json | null
          tax_slabs?: Json | null
          transport_allowance_amount?: number | null
          updated_at?: string
          user_id?: string
          working_days_per_month?: number | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_category_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_category_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_category_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          image_url: string | null
          max_stock_level: number | null
          min_stock_level: number | null
          mrp: number | null
          name: string
          purchase_price: number
          sale_price: number
          sku: string
          status: string
          stock_quantity: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          mrp?: number | null
          name: string
          purchase_price: number
          sale_price: number
          sku: string
          status?: string
          stock_quantity?: number | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          image_url?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          mrp?: number | null
          name?: string
          purchase_price?: number
          sale_price?: number
          sku?: string
          status?: string
          stock_quantity?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_bill_items: {
        Row: {
          created_at: string
          gst_rate: number | null
          id: string
          product_id: string
          purchase_bill_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          gst_rate?: number | null
          id?: string
          product_id: string
          purchase_bill_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          gst_rate?: number | null
          id?: string
          product_id?: string
          purchase_bill_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: []
      }
      purchase_bills: {
        Row: {
          bill_date: string
          bill_number: string
          created_at: string
          created_by: string | null
          discount_amount: number
          due_date: string | null
          id: string
          notes: string | null
          status: string
          subtotal: number
          supplier_id: string
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_date?: string
          bill_number: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          subtotal?: number
          supplier_id: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_date?: string
          bill_number?: string
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          subtotal?: number
          supplier_id?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          purchase_order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          discount_amount: number
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          status: string
          subtotal: number
          supplier_id: string
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          status?: string
          subtotal?: number
          supplier_id: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: string
          subtotal?: number
          supplier_id?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_return_items: {
        Row: {
          created_at: string
          gst_rate: number | null
          id: string
          product_id: string
          purchase_return_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          gst_rate?: number | null
          id?: string
          product_id: string
          purchase_return_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          gst_rate?: number | null
          id?: string
          product_id?: string
          purchase_return_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: []
      }
      purchase_returns: {
        Row: {
          created_at: string
          debit_note_number: string
          id: string
          notes: string | null
          original_bill_id: string | null
          return_date: string
          status: string
          subtotal: number
          supplier_id: string
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          debit_note_number: string
          id?: string
          notes?: string | null
          original_bill_id?: string | null
          return_date?: string
          status?: string
          subtotal?: number
          supplier_id: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          debit_note_number?: string
          id?: string
          notes?: string | null
          original_bill_id?: string | null
          return_date?: string
          status?: string
          subtotal?: number
          supplier_id?: string
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_configs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_favorite: boolean | null
          parameters: Json | null
          report_name: string
          report_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_favorite?: boolean | null
          parameters?: Json | null
          report_name: string
          report_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_favorite?: boolean | null
          parameters?: Json | null
          report_name?: string
          report_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_return_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          sale_return_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          sale_return_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sale_return_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_return_items_sale_return_id_fkey"
            columns: ["sale_return_id"]
            isOneToOne: false
            referencedRelation: "sale_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_returns: {
        Row: {
          created_at: string
          credit_note_number: string
          customer_id: string
          id: string
          notes: string | null
          original_invoice_id: string | null
          return_date: string
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_note_number: string
          customer_id: string
          id?: string
          notes?: string | null
          original_invoice_id?: string | null
          return_date?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credit_note_number?: string
          customer_id?: string
          id?: string
          notes?: string | null
          original_invoice_id?: string | null
          return_date?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_returns_original_invoice_id_fkey"
            columns: ["original_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          sales_invoice_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          sales_invoice_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sales_invoice_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_sales_invoice_id_fkey"
            columns: ["sales_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          cheque_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          discount_amount: number
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          payment_account_id: string | null
          payment_method: string | null
          route_id: string | null
          session_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cheque_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          payment_account_id?: string | null
          payment_method?: string | null
          route_id?: string | null
          session_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cheque_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          payment_account_id?: string | null
          payment_method?: string | null
          route_id?: string | null
          session_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: false
            referencedRelation: "cheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          sales_order_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          sales_order_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sales_order_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_date: string | null
          discount_amount: number
          id: string
          notes: string | null
          order_date: string
          order_number: string
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_date?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_date?: string | null
          discount_amount?: number
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          batch_number: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          new_stock: number
          previous_stock: number
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          new_stock: number
          previous_stock: number
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          new_stock?: number
          previous_stock?: number
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_transactions_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gstin: string | null
          id: string
          name: string
          payment_terms: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          payment_terms?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          payment_terms?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_prefixes: {
        Row: {
          created_at: string
          created_by: string | null
          credit_note_prefix: string | null
          delivery_challan_prefix: string | null
          estimate_prefix: string | null
          financial_year: string | null
          firm_name: string
          id: string
          payment_in_prefix: string | null
          proforma_invoice_prefix: string | null
          purchase_bill_prefix: string | null
          purchase_order_prefix: string | null
          purchase_return_prefix: string | null
          sale_order_prefix: string | null
          sale_prefix: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          credit_note_prefix?: string | null
          delivery_challan_prefix?: string | null
          estimate_prefix?: string | null
          financial_year?: string | null
          firm_name?: string
          id?: string
          payment_in_prefix?: string | null
          proforma_invoice_prefix?: string | null
          purchase_bill_prefix?: string | null
          purchase_order_prefix?: string | null
          purchase_return_prefix?: string | null
          sale_order_prefix?: string | null
          sale_prefix?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          credit_note_prefix?: string | null
          delivery_challan_prefix?: string | null
          estimate_prefix?: string | null
          financial_year?: string | null
          firm_name?: string
          id?: string
          payment_in_prefix?: string | null
          proforma_invoice_prefix?: string | null
          purchase_bill_prefix?: string | null
          purchase_order_prefix?: string | null
          purchase_return_prefix?: string | null
          sale_order_prefix?: string | null
          sale_prefix?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_invoice_formats: {
        Row: {
          accent_color: string | null
          created_at: string | null
          created_by: string | null
          custom_footer_text: string | null
          custom_signatory_name: string | null
          custom_terms_text: string | null
          font_size: string | null
          format_name: string
          id: string
          invoice_title: string | null
          orientation: string | null
          paper_size: string | null
          primary_color: string | null
          show_amount_in_words: boolean | null
          show_bank_details: boolean | null
          show_company_address: boolean | null
          show_company_logo: boolean | null
          show_company_name: boolean | null
          show_company_phone: boolean | null
          show_discount_column: boolean | null
          show_gst_column: boolean | null
          show_gstin: boolean | null
          show_hsn_column: boolean | null
          show_hsn_summary: boolean | null
          show_previous_due: boolean | null
          show_signature: boolean | null
          show_terms: boolean | null
          show_unit_column: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_footer_text?: string | null
          custom_signatory_name?: string | null
          custom_terms_text?: string | null
          font_size?: string | null
          format_name?: string
          id?: string
          invoice_title?: string | null
          orientation?: string | null
          paper_size?: string | null
          primary_color?: string | null
          show_amount_in_words?: boolean | null
          show_bank_details?: boolean | null
          show_company_address?: boolean | null
          show_company_logo?: boolean | null
          show_company_name?: boolean | null
          show_company_phone?: boolean | null
          show_discount_column?: boolean | null
          show_gst_column?: boolean | null
          show_gstin?: boolean | null
          show_hsn_column?: boolean | null
          show_hsn_summary?: boolean | null
          show_previous_due?: boolean | null
          show_signature?: boolean | null
          show_terms?: boolean | null
          show_unit_column?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_footer_text?: string | null
          custom_signatory_name?: string | null
          custom_terms_text?: string | null
          font_size?: string | null
          format_name?: string
          id?: string
          invoice_title?: string | null
          orientation?: string | null
          paper_size?: string | null
          primary_color?: string | null
          show_amount_in_words?: boolean | null
          show_bank_details?: boolean | null
          show_company_address?: boolean | null
          show_company_logo?: boolean | null
          show_company_name?: boolean | null
          show_company_phone?: boolean | null
          show_discount_column?: boolean | null
          show_gst_column?: boolean | null
          show_gstin?: boolean | null
          show_hsn_column?: boolean | null
          show_hsn_summary?: boolean | null
          show_previous_due?: boolean | null
          show_signature?: boolean | null
          show_terms?: boolean | null
          show_unit_column?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          login_time: string
          logout_time: string | null
          route_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          login_time?: string
          logout_time?: string | null
          route_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          login_time?: string
          logout_time?: string | null
          route_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      promote_user_to_admin: { Args: { user_email: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "hr" | "sales" | "employee"
      employee_sector:
        | "sales"
        | "accounts"
        | "marketing"
        | "manufacturing"
        | "admin"
        | "hr"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "hr", "sales", "employee"],
      employee_sector: [
        "sales",
        "accounts",
        "marketing",
        "manufacturing",
        "admin",
        "hr",
      ],
    },
  },
} as const

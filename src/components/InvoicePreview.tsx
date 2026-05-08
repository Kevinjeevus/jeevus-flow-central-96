import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Download, Share, Printer, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  payment_method?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    gstin?: string;
  };
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    hsn_code?: string;
    gst_rate?: number;
    unit?: string;
  }>;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  bank_account?: {
    account_name: string;
    account_number: string;
    bank_name: string;
    ifsc_code: string;
    account_holder_name: string;
  } | null;
}

interface InvoicePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceData;
  onEdit?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
}

export function InvoicePreview({ isOpen, onClose, invoiceData, onEdit, onDelete, onRefresh }: InvoicePreviewProps) {
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [userFormat, setUserFormat] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCompanySettings();
      fetchUserFormat();
    }
  }, [isOpen]);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      setCompanySettings(data);
    } catch (error: any) {
      console.error('Error fetching company settings:', error);
    }
  };

  const fetchUserFormat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('user_invoice_formats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      setUserFormat(data);
    } catch (error: any) {
      console.error('Error fetching user invoice format:', error);
    }
  };

  // Helper: check format setting with fallback to true
  const fmt = (key: string, fallback: boolean = true) => {
    if (!userFormat) return fallback;
    return userFormat[key] ?? fallback;
  };

  // Calculate HSN/SAC wise tax breakdown
  const getHsnTaxBreakdown = () => {
    const hsnMap = new Map();
    
    invoiceData.items.forEach(item => {
      const hsn = item.hsn_code || 'N/A';
      const gstRate = item.gst_rate || 18; // Default 18%
      const taxableAmount = item.total_price / (1 + gstRate / 100);
      const taxAmount = item.total_price - taxableAmount;
      const cgstAmount = taxAmount / 2;
      const sgstAmount = taxAmount / 2;
      
      if (hsnMap.has(hsn)) {
        const existing = hsnMap.get(hsn);
        existing.taxableAmount += taxableAmount;
        existing.cgstAmount += cgstAmount;
        existing.sgstAmount += sgstAmount;
        existing.totalTax += taxAmount;
      } else {
        hsnMap.set(hsn, {
          hsn,
          gstRate,
          taxableAmount,
          cgstAmount,
          sgstAmount,
          totalTax: taxAmount
        });
      }
    });
    
    return Array.from(hsnMap.values());
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Create a print-friendly version
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      const hsnBreakdown = getHsnTaxBreakdown();

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoiceData.invoice_number}</title>
          <style>
            @page {
              size: A4;
              margin: 0.5in;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px;
              font-size: ${userFormat?.font_size === 'small' ? '10px' : userFormat?.font_size === 'large' ? '14px' : '12px'}; 
              width: ${userFormat?.paper_size === 'A5' ? '148mm' : '210mm'};
              min-height: ${userFormat?.paper_size === 'A5' ? '210mm' : '297mm'};
              box-sizing: border-box;
            }
            .header { text-align: center; margin-bottom: 30px; }
            .company-logo { height: 60px; width: auto; margin: 0 auto 10px; }
            .company-name { font-size: 24px; font-weight: bold; color: ${userFormat?.primary_color || '#333'}; margin: 10px 0; }
            .company-info { font-size: 12px; margin: 2px 0; color: #666; }
            .invoice-title { font-size: 18px; margin-top: 15px; font-weight: bold; }
            .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 30px 0; }
            .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; }
            .detail-row { margin: 3px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
            .table th, .table td { border: 1px solid #333; padding: 6px; text-align: left; }
            .table th { background-color: ${userFormat?.accent_color || '#f5f5f5'}; font-weight: bold; text-align: center; }
            .table td.text-center { text-align: center; }
            .table td.text-right { text-align: right; }
            .summary-grid { display: grid; grid-template-columns: 1fr 300px; gap: 40px; margin: 30px 0; }
            .hsn-table { width: 100%; font-size: 10px; }
            .totals-section { }
            .total-row { display: flex; justify-content: space-between; margin: 5px 0; padding: 3px 0; }
            .subtotal { border-top: 1px solid #333; padding-top: 10px; font-weight: bold; }
            .final-total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
            .bank-details { margin-top: 30px; }
            .notes { margin-top: 20px; }
            .footer { margin-top: 40px; text-align: center; font-size: 10px; }
            @media print {
              body { 
                margin: 0; 
                padding: 0.5in;
                width: auto;
                min-height: auto;
              }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${fmt('show_company_logo') && companySettings?.company_logo_url ? `<img src="${companySettings.company_logo_url}" alt="Company Logo" class="company-logo" />` : ''}
            ${fmt('show_company_name') ? `<div class="company-name">${companySettings?.company_name || 'JEEVUS NATURALS'}</div>` : ''}
            ${fmt('show_company_address') && companySettings?.address ? `<div class="company-info">${companySettings.address}</div>` : ''}
            ${fmt('show_company_phone') && companySettings?.phone_number ? `<div class="company-info">Ph: ${companySettings.phone_number}</div>` : ''}
            ${fmt('show_gstin') && companySettings?.gstin ? `<div class="company-info">GSTIN: ${companySettings.gstin}</div>` : ''}
            <div class="invoice-title">${userFormat?.invoice_title || 'TAX INVOICE'}</div>
          </div>
          
          <div class="invoice-details">
            <div>
              <div class="section-title">Bill To:</div>
              <div class="detail-row"><strong>${invoiceData.customer.name}</strong></div>
              ${invoiceData.customer.email ? `<div class="detail-row">${invoiceData.customer.email}</div>` : ''}
              ${invoiceData.customer.phone ? `<div class="detail-row">${invoiceData.customer.phone}</div>` : ''}
              ${invoiceData.customer.address ? `<div class="detail-row">${invoiceData.customer.address}</div>` : ''}
              ${invoiceData.customer.gstin ? `<div class="detail-row">GSTIN: ${invoiceData.customer.gstin}</div>` : ''}
            </div>
            <div>
              <div class="section-title">Invoice Details:</div>
              <div class="detail-row"><strong>Invoice #:</strong> ${invoiceData.invoice_number}</div>
              <div class="detail-row"><strong>Date:</strong> ${new Date(invoiceData.invoice_date).toLocaleDateString()}</div>
            </div>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th style="width: 30%;">Item name</th>
                ${fmt('show_hsn_column') ? '<th style="width: 10%;">HSN/SAC</th>' : ''}
                <th style="width: 8%;">Quantity</th>
                ${fmt('show_unit_column') ? '<th style="width: 8%;">Unit</th>' : ''}
                <th style="width: 12%;">Price/Unit</th>
                ${fmt('show_gst_column') ? '<th style="width: 8%;">GST%</th>' : ''}
                <th style="width: 12%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  ${fmt('show_hsn_column') ? `<td class="text-center">${item.hsn_code || 'N/A'}</td>` : ''}
                  <td class="text-center">${item.quantity}</td>
                  ${fmt('show_unit_column') ? `<td class="text-center">${item.unit || 'Nos'}</td>` : ''}
                  <td class="text-right">₹${item.unit_price.toFixed(2)}</td>
                  ${fmt('show_gst_column') ? `<td class="text-center">${item.gst_rate || 18}%</td>` : ''}
                  <td class="text-right">₹${item.total_price.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="display: grid; grid-template-columns: 1fr 300px; gap: 20px; margin: 20px 0;">
            <div>
              <div class="detail-row"><strong>Total:</strong> ₹${invoiceData.total_amount.toFixed(2)}</div>
              
              ${fmt('show_amount_in_words') ? `<div style="margin-top: 20px;">
                <div class="detail-row"><strong>Invoice Amount In Words:</strong></div>
                <div class="detail-row">Rupees Only</div>
              </div>` : ''}
              
              <div style="margin-top: 15px;">
                <div class="detail-row"><strong>Payment Mode:</strong> ${invoiceData.payment_method?.charAt(0).toUpperCase() + invoiceData.payment_method?.slice(1) || 'Cash'}</div>
                <div class="detail-row"><strong>Total:</strong> ₹${invoiceData.total_amount.toFixed(2)}</div>
                <div class="detail-row"><strong>Received:</strong> ₹${invoiceData.total_amount.toFixed(2)}</div>
                <div class="detail-row"><strong>Balance:</strong> ₹0.00</div>
              </div>
            </div>
            
            <div style="text-align: right;">
              <div style="display: flex; justify-content: space-between; margin: 3px 0;">
                <span>Sub Total:</span>
                <span>₹${invoiceData.subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 3px 0;">
                <span>Round Off:</span>
                <span>₹0.00</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 3px 0; font-weight: bold;">
                <span>Total:</span>
                <span>₹${invoiceData.total_amount.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 3px 0;">
                <span>You Saved:</span>
                <span>₹0.00</span>
              </div>
              
              ${fmt('show_previous_due', false) ? `<div style="margin-top: 15px;">
                <div class="detail-row"><strong>Previous Due:</strong> ₹0.00</div>
                <div class="detail-row"><strong>Current Balance:</strong> ₹${invoiceData.total_amount.toFixed(2)}</div>
              </div>` : ''}
            </div>
          </div>

          ${fmt('show_hsn_summary') ? `<table class="table" style="margin-top: 30px;">
            <thead>
              <tr>
                <th rowspan="2" style="text-align: center; vertical-align: middle;">HSN/SAC</th>
                <th rowspan="2" style="text-align: center; vertical-align: middle;">Taxable amount</th>
                <th colspan="2" style="text-align: center;">CGST</th>
                <th colspan="2" style="text-align: center;">SGST</th>
                <th rowspan="2" style="text-align: center; vertical-align: middle;">Total Tax Amount</th>
              </tr>
              <tr>
                <th style="text-align: center;">Rate</th>
                <th style="text-align: center;">Amount</th>
                <th style="text-align: center;">Rate</th>
                <th style="text-align: center;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${hsnBreakdown.map(hsn => `
                <tr>
                  <td class="text-center">${hsn.hsn}</td>
                  <td class="text-right">₹${hsn.taxableAmount.toFixed(2)}</td>
                  <td class="text-center">${(hsn.gstRate / 2).toFixed(1)}%</td>
                  <td class="text-right">₹${hsn.cgstAmount.toFixed(2)}</td>
                  <td class="text-center">${(hsn.gstRate / 2).toFixed(1)}%</td>
                  <td class="text-right">₹${hsn.sgstAmount.toFixed(2)}</td>
                  <td class="text-right">₹${hsn.totalTax.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: ${userFormat?.accent_color || '#f5f5f5'};">
                <td class="text-center">Total</td>
                <td class="text-right">₹${hsnBreakdown.reduce((sum, item) => sum + item.taxableAmount, 0).toFixed(2)}</td>
                <td class="text-center">-</td>
                <td class="text-right">₹${hsnBreakdown.reduce((sum, item) => sum + item.cgstAmount, 0).toFixed(2)}</td>
                <td class="text-center">-</td>
                <td class="text-right">₹${hsnBreakdown.reduce((sum, item) => sum + item.sgstAmount, 0).toFixed(2)}</td>
                <td class="text-right">₹${hsnBreakdown.reduce((sum, item) => sum + item.totalTax, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>` : ''}

          <div style="display: grid; grid-template-columns: ${fmt('show_bank_details') && fmt('show_terms') ? '1fr 1fr' : '1fr'}; gap: 20px; margin-top: 30px;">
            ${fmt('show_bank_details') ? `<div style="border: 1px solid #333; padding: 15px;">
              <div class="section-title">Bank Details</div>
              <div style="display: flex; margin-top: 10px;">
                <div style="width: 60px; height: 60px; background-color: #f0f0f0; margin-right: 15px; display: flex; align-items: center; justify-content: center; font-size: 10px; text-align: center;">QR Code</div>
                <div>
                  ${invoiceData.bank_account ? `
                    <div class="detail-row"><strong>Name:</strong> ${invoiceData.bank_account.bank_name}</div>
                    <div class="detail-row"><strong>Account No.:</strong> ${invoiceData.bank_account.account_number}</div>
                    <div class="detail-row"><strong>IFSC code:</strong> ${invoiceData.bank_account.ifsc_code}</div>
                    <div class="detail-row"><strong>Account Holder's Name:</strong> ${invoiceData.bank_account.account_holder_name}</div>
                  ` : `
                    <div class="detail-row"><strong>Name:</strong> UNION BANK OF INDIA</div>
                    <div class="detail-row"><strong>Branch:</strong> KUNDARA</div>
                    <div class="detail-row"><strong>Account No.:</strong> 284511100001097</div>
                    <div class="detail-row"><strong>IFSC code:</strong> UBIN0528459</div>
                    <div class="detail-row"><strong>Account Holder's Name:</strong> JEEVUS NATURALS</div>
                  `}
                </div>
              </div>
            </div>` : ''}
            
            ${fmt('show_terms') || fmt('show_signature') ? `<div style="border: 1px solid #333; padding: 15px;">
              ${fmt('show_terms') ? `<div class="section-title">Terms and conditions</div>
              <p style="margin: 10px 0; font-size: 11px;">${userFormat?.custom_terms_text || 'Thanks for doing business with us!'}</p>` : ''}
              ${fmt('show_signature') ? `<div style="margin-top: 40px; text-align: right;">
                <p style="font-weight: bold; margin-bottom: 30px;">For ${userFormat?.custom_signatory_name || companySettings?.company_name || 'Jeevus Naturals'}</p>
                <div style="border-top: 1px solid #333; padding-top: 10px;">
                  <p style="font-size: 11px;">Authorized Signatory</p>
                </div>
              </div>` : ''}
            </div>` : ''}
          </div>
          
          ${invoiceData.notes ? `
            <div style="margin-top: 30px;">
              <div class="section-title">Notes:</div>
              <div style="margin-top: 5px;">${invoiceData.notes}</div>
            </div>
          ` : ''}
          
          <div style="margin-top: 40px; text-align: center; font-size: 10px;">
            <p>${userFormat?.custom_footer_text || 'Thank you for your business!'}</p>
          </div>
          
          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-right: 10px;">Print</button>
            <button onclick="window.close()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px;">Close</button>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      toast({
        title: "PDF Preview Ready",
        description: "You can now print or save the invoice as PDF from the preview window",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF preview",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const shareInvoice = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Invoice ${invoiceData.invoice_number}`,
          text: `Invoice for ₹${invoiceData.total_amount.toFixed(2)} from JEEVUS NATURALS`,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        const shareText = `Invoice ${invoiceData.invoice_number}\nAmount: ₹${invoiceData.total_amount.toFixed(2)}\nCustomer: ${invoiceData.customer.name}`;
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to Clipboard",
          description: "Invoice details copied to clipboard",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share invoice",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvoice = async () => {
    setIsDeleting(true);
    try {
      // Delete invoice items first
      const { error: itemsError } = await supabase
        .from('sales_invoice_items')
        .delete()
        .eq('sales_invoice_id', invoiceData.id);

      if (itemsError) throw itemsError;

      // Delete the invoice
      const { error: invoiceError } = await supabase
        .from('sales_invoices')
        .delete()
        .eq('id', invoiceData.id);

      if (invoiceError) throw invoiceError;

      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });

      onDelete?.();
      onRefresh?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="break-all">Invoice Preview - {invoiceData.invoice_number}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-between border-b pb-4">
            <div className="flex flex-wrap gap-2">
              {onEdit && (
                <Button variant="outline" onClick={onEdit} className="flex-1 sm:flex-none">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-destructive hover:text-destructive flex-1 sm:flex-none">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-full max-w-md mx-4">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the invoice
                        {invoiceData.invoice_number} and remove all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteInvoice}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={shareInvoice} className="flex-1 sm:flex-none">
                <Share className="h-4 w-4 mr-2" />
                <span className="sm:inline">Share</span>
              </Button>
              <Button variant="outline" onClick={generatePDF} disabled={isGeneratingPDF} className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{isGeneratingPDF ? "Generating..." : "Download PDF"}</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button onClick={generatePDF} disabled={isGeneratingPDF} className="flex-1 sm:flex-none">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Invoice Content */}
          <div className="bg-white p-4 md:p-8 border rounded-lg">
            {/* Header */}
            <div className="text-center mb-6 md:mb-8">
              {companySettings?.company_logo_url && (
                <img 
                  src={companySettings.company_logo_url} 
                  alt="Company Logo" 
                  className="h-12 w-12 md:h-16 md:w-16 object-contain mx-auto mb-4"
                />
              )}
              <h1 className="text-xl md:text-3xl font-bold text-gray-800">
                {companySettings?.company_name || "JEEVUS NATURALS"}
              </h1>
              {companySettings?.address && (
                <p className="text-xs md:text-sm text-gray-600 mt-1">{companySettings.address}</p>
              )}
              {companySettings?.phone_number && (
                <p className="text-xs md:text-sm text-gray-600">Ph: {companySettings.phone_number}</p>
              )}
              {companySettings?.gstin && (
                <p className="text-xs md:text-sm text-gray-600">GSTIN: {companySettings.gstin}</p>
              )}
              <h2 className="text-lg md:text-xl text-gray-600 mt-4">TAX INVOICE</h2>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3">Bill To:</h3>
                <div className="text-gray-700 text-sm md:text-base">
                  <p className="font-medium">{invoiceData.customer.name}</p>
                  {invoiceData.customer.email && <p>{invoiceData.customer.email}</p>}
                  {invoiceData.customer.phone && <p>{invoiceData.customer.phone}</p>}
                  {invoiceData.customer.address && <p>{invoiceData.customer.address}</p>}
                  {invoiceData.customer.gstin && <p><span className="font-medium">GSTIN:</span> {invoiceData.customer.gstin}</p>}
                </div>
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold mb-3">Invoice Details:</h3>
                <div className="text-gray-700 text-sm md:text-base">
                  <p><span className="font-medium">Invoice #:</span> {invoiceData.invoice_number}</p>
                  <p><span className="font-medium">Date:</span> {new Date(invoiceData.invoice_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6 md:mb-8 overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-left text-xs md:text-sm">Item name</th>
                    <th className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-center text-xs md:text-sm">HSN/SAC</th>
                    <th className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-center text-xs md:text-sm">Qty</th>
                    <th className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-center text-xs md:text-sm">Unit</th>
                    <th className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-right text-xs md:text-sm">Price/Unit</th>
                    <th className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-center text-xs md:text-sm">GST%</th>
                    <th className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-right text-xs md:text-sm">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-xs md:text-sm">{item.product_name}</td>
                      <td className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-center text-xs md:text-sm">{item.hsn_code || "N/A"}</td>
                      <td className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-center text-xs md:text-sm">{item.quantity}</td>
                      <td className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-center text-xs md:text-sm">{item.unit || "Nos"}</td>
                      <td className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-right text-xs md:text-sm">₹{item.unit_price.toFixed(2)}</td>
                      <td className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-center text-xs md:text-sm">{item.gst_rate || 18}%</td>
                      <td className="border border-gray-300 px-1 md:px-2 py-2 md:py-3 text-right text-xs md:text-sm">₹{item.total_price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
              <div>
                <div className="text-right pr-4 md:pr-8">
                  <div className="text-base md:text-lg font-semibold">Total: ₹{invoiceData.total_amount.toFixed(2)}</div>
                </div>
                
                <div className="mt-4 md:mt-6">
                  <p className="text-xs md:text-sm font-medium mb-2">Invoice Amount In Words:</p>
                  <p className="text-xs md:text-sm font-semibold">Rupees Only</p>
                </div>
                
                <div className="mt-4">
                  <p className="text-xs md:text-sm"><span className="font-medium">Payment Mode:</span> {invoiceData.payment_method?.charAt(0).toUpperCase() + invoiceData.payment_method?.slice(1) || "Cash"}</p>
                  <p className="text-xs md:text-sm"><span className="font-medium">Total:</span> ₹{invoiceData.total_amount.toFixed(2)}</p>
                  <p className="text-xs md:text-sm"><span className="font-medium">Received:</span> ₹{invoiceData.total_amount.toFixed(2)}</p>
                  <p className="text-xs md:text-sm"><span className="font-medium">Balance:</span> ₹0.00</p>
                </div>
              </div>
              
              <div>
                <div className="text-right">
                  <div className="flex justify-between py-1 text-xs md:text-sm">
                    <span>Sub Total:</span>
                    <span>₹{invoiceData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs md:text-sm">
                    <span>Round Off:</span>
                    <span>₹0.00</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs md:text-sm font-bold">
                    <span>Total:</span>
                    <span>₹{invoiceData.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-xs md:text-sm">
                    <span>You Saved:</span>
                    <span>₹0.00</span>
                  </div>
                </div>
                
                <div className="mt-4 text-right">
                  <p className="text-xs md:text-sm"><span className="font-medium">Previous Due:</span> ₹0.00</p>
                  <p className="text-xs md:text-sm"><span className="font-medium">Current Balance:</span> ₹{invoiceData.total_amount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* HSN/SAC Tax Breakdown Table */}
            <div className="mb-6 md:mb-8 overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm">HSN/SAC</th>
                    <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right text-xs md:text-sm">Taxable amount</th>
                    <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm">CGST</th>
                    <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm">SGST</th>
                    <th className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right text-xs md:text-sm">Total Tax Amount</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-1 md:px-2 py-1 text-center text-xs"></th>
                    <th className="border border-gray-300 px-1 md:px-2 py-1 text-center text-xs"></th>
                    <th className="border border-gray-300 px-1 md:px-2 py-1 text-center text-xs">
                      <div className="flex justify-around">
                        <span>Rate</span>
                        <span>Amount</span>
                      </div>
                    </th>
                    <th className="border border-gray-300 px-1 md:px-2 py-1 text-center text-xs">
                      <div className="flex justify-around">
                        <span>Rate</span>
                        <span>Amount</span>
                      </div>
                    </th>
                    <th className="border border-gray-300 px-1 md:px-2 py-1 text-center text-xs"></th>
                  </tr>
                </thead>
                <tbody>
                  {getHsnTaxBreakdown().map((hsnData, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm">{hsnData.hsn}</td>
                      <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right text-xs md:text-sm">₹{hsnData.taxableAmount.toFixed(2)}</td>
                      <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm">
                        <div className="flex justify-around">
                          <span>{(hsnData.gstRate / 2).toFixed(1)}%</span>
                          <span>₹{hsnData.cgstAmount.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm">
                        <div className="flex justify-around">
                          <span>{(hsnData.gstRate / 2).toFixed(1)}%</span>
                          <span>₹{hsnData.sgstAmount.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right text-xs md:text-sm">₹{hsnData.totalTax.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-gray-50">
                    <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-center text-xs md:text-sm">Total</td>
                    <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right text-xs md:text-sm">
                      ₹{getHsnTaxBreakdown().reduce((sum, item) => sum + item.taxableAmount, 0).toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right text-xs md:text-sm">
                      ₹{getHsnTaxBreakdown().reduce((sum, item) => sum + item.cgstAmount, 0).toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right text-xs md:text-sm">
                      ₹{getHsnTaxBreakdown().reduce((sum, item) => sum + item.sgstAmount, 0).toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-1 md:px-2 py-1 md:py-2 text-right text-xs md:text-sm">
                      ₹{getHsnTaxBreakdown().reduce((sum, item) => sum + item.totalTax, 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mt-6 md:mt-8">
              <div>
                <div className="border border-gray-300 p-3 md:p-4">
                  <h4 className="font-semibold mb-2 text-sm md:text-base">Bank Details</h4>
                  <div className="flex flex-col md:flex-row">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-200 mb-2 md:mb-0 md:mr-4 flex items-center justify-center text-xs">
                      QR Code
                    </div>
                    <div className="text-xs md:text-sm">
                      {invoiceData.bank_account ? (
                        <>
                          <p><span className="font-medium">Name:</span> {invoiceData.bank_account.bank_name}</p>
                          <p><span className="font-medium">Account No.:</span> {invoiceData.bank_account.account_number}</p>
                          <p><span className="font-medium">IFSC code:</span> {invoiceData.bank_account.ifsc_code}</p>
                          <p><span className="font-medium">Account Holder{"'"}s Name:</span> {invoiceData.bank_account.account_holder_name}</p>
                        </>
                      ) : (
                        <>
                          <p><span className="font-medium">Name:</span> UNION BANK OF INDIA</p>
                          <p><span className="font-medium">Branch:</span> KUNDARA</p>
                          <p><span className="font-medium">Account No.:</span> 284511100001097</p>
                          <p><span className="font-medium">IFSC code:</span> UBIN0528459</p>
                          <p><span className="font-medium">Account Holder{"'"}s Name:</span> JEEVUS NATURALS</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="border border-gray-300 p-3 md:p-4 h-full">
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-sm md:text-base">Terms and conditions</h4>
                    <p className="text-xs md:text-sm">Thanks for doing business with us!</p>
                  </div>
                  
                  <div className="mt-6 md:mt-8 text-right">
                    <p className="text-xs md:text-sm font-medium">For Jeevus Naturals</p>
                    <div className="mt-6 md:mt-8 border-t border-gray-300 pt-2">
                      <p className="text-xs md:text-sm">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoiceData.notes && (
              <div className="mt-6 md:mt-8">
                <h3 className="text-base md:text-lg font-semibold mb-3">Notes:</h3>
                <p className="text-gray-700 text-sm md:text-base">{invoiceData.notes}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
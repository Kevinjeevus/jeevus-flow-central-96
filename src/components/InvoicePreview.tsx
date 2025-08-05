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

  useEffect(() => {
    if (isOpen) {
      fetchCompanySettings();
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
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-logo { height: 60px; width: auto; margin: 0 auto 10px; }
            .company-name { font-size: 24px; font-weight: bold; color: #333; margin: 10px 0; }
            .company-info { font-size: 12px; margin: 2px 0; color: #666; }
            .invoice-title { font-size: 18px; margin-top: 15px; font-weight: bold; }
            .invoice-details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 30px 0; }
            .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; }
            .detail-row { margin: 3px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
            .table th, .table td { border: 1px solid #333; padding: 6px; text-align: left; }
            .table th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
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
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 20px;">
              ${companySettings?.company_logo_url ? `<img src="${companySettings.company_logo_url}" alt="Company Logo" class="company-logo" />` : ''}
              <div>
                <div class="company-name">${companySettings?.company_name || 'JEEVUS NATURALS'}</div>
                ${companySettings?.address ? `<div class="company-info">${companySettings.address}</div>` : ''}
                ${companySettings?.phone_number ? `<div class="company-info">Ph: ${companySettings.phone_number}</div>` : ''}
                ${companySettings?.gstin ? `<div class="company-info">GSTIN: ${companySettings.gstin}</div>` : ''}
              </div>
            </div>
            <div class="invoice-title">TAX INVOICE</div>
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
                <th style="width: 10%;">HSN/SAC</th>
                <th style="width: 8%;">Quantity</th>
                <th style="width: 8%;">Unit</th>
                <th style="width: 12%;">Price/Unit</th>
                <th style="width: 8%;">GST%</th>
                <th style="width: 12%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td class="text-center">${item.hsn_code || 'N/A'}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-center">${item.unit || 'Nos'}</td>
                  <td class="text-right">₹${item.unit_price.toFixed(2)}</td>
                  <td class="text-center">${item.gst_rate || 18}%</td>
                  <td class="text-right">₹${item.total_price.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary-grid">
            <div>
              <div class="section-title">HSN/SAC wise Tax Breakdown:</div>
              <table class="hsn-table table">
                <thead>
                  <tr>
                    <th>HSN/SAC</th>
                    <th>GST%</th>
                    <th>Taxable Amount</th>
                    <th>CGST</th>
                    <th>SGST</th>
                    <th>Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  ${hsnBreakdown.map(hsn => `
                    <tr>
                      <td class="text-center">${hsn.hsn}</td>
                      <td class="text-center">${hsn.gstRate}%</td>
                      <td class="text-right">₹${hsn.taxableAmount.toFixed(2)}</td>
                      <td class="text-right">₹${hsn.cgstAmount.toFixed(2)}</td>
                      <td class="text-right">₹${hsn.sgstAmount.toFixed(2)}</td>
                      <td class="text-right">₹${hsn.totalTax.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="totals-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>₹${invoiceData.subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Tax Amount:</span>
                <span>₹${invoiceData.tax_amount.toFixed(2)}</span>
              </div>
              <div class="total-row final-total">
                <span>Grand Total:</span>
                <span>₹${invoiceData.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          ${invoiceData.bank_account ? `
            <div class="bank-details">
              <div class="section-title">Bank Details:</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px;">
                <div>
                  <div class="detail-row"><strong>Account Name:</strong> ${invoiceData.bank_account.account_name}</div>
                  <div class="detail-row"><strong>Account Number:</strong> ${invoiceData.bank_account.account_number}</div>
                  <div class="detail-row"><strong>Bank Name:</strong> ${invoiceData.bank_account.bank_name}</div>
                </div>
                <div>
                  <div class="detail-row"><strong>IFSC Code:</strong> ${invoiceData.bank_account.ifsc_code}</div>
                  <div class="detail-row"><strong>Account Holder:</strong> ${invoiceData.bank_account.account_holder_name}</div>
                </div>
              </div>
            </div>
          ` : ''}
          
          ${invoiceData.notes ? `
            <div class="notes">
              <div class="section-title">Notes:</div>
              <div style="margin-top: 5px;">${invoiceData.notes}</div>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for your business!</p>
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Preview - {invoiceData.invoice_number}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-2 justify-between border-b pb-4">
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="outline" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the invoice
                        {invoiceData.invoice_number} and remove all associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteInvoice}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={shareInvoice}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" onClick={generatePDF} disabled={isGeneratingPDF}>
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? "Generating..." : "Download PDF"}
              </Button>
              <Button onClick={generatePDF} disabled={isGeneratingPDF}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Invoice Content */}
          <div className="bg-white p-8 border rounded-lg">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-4">
                {companySettings?.company_logo_url && (
                  <img 
                    src={companySettings.company_logo_url} 
                    alt="Company Logo" 
                    className="h-16 w-16 object-contain"
                  />
                )}
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">
                    {companySettings?.company_name || 'JEEVUS NATURALS'}
                  </h1>
                  {companySettings?.address && (
                    <p className="text-sm text-gray-600 mt-1">{companySettings.address}</p>
                  )}
                  {companySettings?.phone_number && (
                    <p className="text-sm text-gray-600">Ph: {companySettings.phone_number}</p>
                  )}
                  {companySettings?.gstin && (
                    <p className="text-sm text-gray-600">GSTIN: {companySettings.gstin}</p>
                  )}
                </div>
              </div>
              <h2 className="text-xl text-gray-600 mt-2">TAX INVOICE</h2>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold mb-3">Bill To:</h3>
                <div className="text-gray-700">
                  <p className="font-medium">{invoiceData.customer.name}</p>
                  {invoiceData.customer.email && <p>{invoiceData.customer.email}</p>}
                  {invoiceData.customer.phone && <p>{invoiceData.customer.phone}</p>}
                  {invoiceData.customer.address && <p>{invoiceData.customer.address}</p>}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">Invoice Details:</h3>
                <div className="text-gray-700">
                  <p><span className="font-medium">Invoice #:</span> {invoiceData.invoice_number}</p>
                  <p><span className="font-medium">Date:</span> {new Date(invoiceData.invoice_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 py-3 text-left text-sm">Item name</th>
                    <th className="border border-gray-300 px-2 py-3 text-center text-sm">HSN/SAC</th>
                    <th className="border border-gray-300 px-2 py-3 text-center text-sm">Quantity</th>
                    <th className="border border-gray-300 px-2 py-3 text-center text-sm">Unit</th>
                    <th className="border border-gray-300 px-2 py-3 text-right text-sm">Price/Unit</th>
                    <th className="border border-gray-300 px-2 py-3 text-center text-sm">GST%</th>
                    <th className="border border-gray-300 px-2 py-3 text-right text-sm">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-2 py-3 text-sm">{item.product_name}</td>
                      <td className="border border-gray-300 px-2 py-3 text-center text-sm">{item.hsn_code || 'N/A'}</td>
                      <td className="border border-gray-300 px-2 py-3 text-center text-sm">{item.quantity}</td>
                      <td className="border border-gray-300 px-2 py-3 text-center text-sm">{item.unit || 'Nos'}</td>
                      <td className="border border-gray-300 px-2 py-3 text-right text-sm">₹{item.unit_price.toFixed(2)}</td>
                      <td className="border border-gray-300 px-2 py-3 text-center text-sm">{item.gst_rate || 18}%</td>
                      <td className="border border-gray-300 px-2 py-3 text-right text-sm">₹{item.total_price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Section */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <div className="text-right pr-8">
                  <div className="text-lg font-semibold">Total: ₹{invoiceData.total_amount.toFixed(2)}</div>
                </div>
                
                <div className="mt-6">
                  <p className="text-sm font-medium mb-2">Invoice Amount In Words:</p>
                  <p className="text-sm font-semibold">Rupees Only</p>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm"><span className="font-medium">Payment Mode:</span> {invoiceData.payment_method?.charAt(0).toUpperCase() + invoiceData.payment_method?.slice(1) || 'Cash'}</p>
                  <p className="text-sm"><span className="font-medium">Total:</span> ₹{invoiceData.total_amount.toFixed(2)}</p>
                  <p className="text-sm"><span className="font-medium">Received:</span> ₹{invoiceData.total_amount.toFixed(2)}</p>
                  <p className="text-sm"><span className="font-medium">Balance:</span> ₹0.00</p>
                </div>
              </div>
              
              <div>
                <div className="text-right">
                  <div className="flex justify-between py-1 text-sm">
                    <span>Sub Total:</span>
                    <span>₹{invoiceData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span>Round Off:</span>
                    <span>₹0.00</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm font-bold">
                    <span>Total:</span>
                    <span>₹{invoiceData.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm">
                    <span>You Saved:</span>
                    <span>₹0.00</span>
                  </div>
                </div>
                
                <div className="mt-4 text-right">
                  <p className="text-sm"><span className="font-medium">Previous Due:</span> ₹0.00</p>
                  <p className="text-sm"><span className="font-medium">Current Balance:</span> ₹{invoiceData.total_amount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* HSN/SAC Tax Breakdown Table */}
            <div className="mb-8">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 py-2 text-center text-sm">HSN/SAC</th>
                    <th className="border border-gray-300 px-2 py-2 text-right text-sm">Taxable amount</th>
                    <th className="border border-gray-300 px-2 py-2 text-center text-sm">CGST</th>
                    <th className="border border-gray-300 px-2 py-2 text-center text-sm">SGST</th>
                    <th className="border border-gray-300 px-2 py-2 text-right text-sm">Total Tax Amount</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 py-1 text-center text-xs"></th>
                    <th className="border border-gray-300 px-2 py-1 text-center text-xs"></th>
                    <th className="border border-gray-300 px-2 py-1 text-center text-xs">
                      <div className="flex justify-around">
                        <span>Rate</span>
                        <span>Amount</span>
                      </div>
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center text-xs">
                      <div className="flex justify-around">
                        <span>Rate</span>
                        <span>Amount</span>
                      </div>
                    </th>
                    <th className="border border-gray-300 px-2 py-1 text-center text-xs"></th>
                  </tr>
                </thead>
                <tbody>
                  {getHsnTaxBreakdown().map((hsnData, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-2 py-2 text-center text-sm">{hsnData.hsn}</td>
                      <td className="border border-gray-300 px-2 py-2 text-right text-sm">₹{hsnData.taxableAmount.toFixed(2)}</td>
                      <td className="border border-gray-300 px-2 py-2 text-center text-sm">
                        <div className="flex justify-around">
                          <span>{(hsnData.gstRate / 2).toFixed(1)}%</span>
                          <span>₹{hsnData.cgstAmount.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-center text-sm">
                        <div className="flex justify-around">
                          <span>{(hsnData.gstRate / 2).toFixed(1)}%</span>
                          <span>₹{hsnData.sgstAmount.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-2 py-2 text-right text-sm">₹{hsnData.totalTax.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-gray-50">
                    <td className="border border-gray-300 px-2 py-2 text-center text-sm">Total</td>
                    <td className="border border-gray-300 px-2 py-2 text-right text-sm">
                      ₹{getHsnTaxBreakdown().reduce((sum, item) => sum + item.taxableAmount, 0).toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right text-sm">
                      ₹{getHsnTaxBreakdown().reduce((sum, item) => sum + item.cgstAmount, 0).toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right text-sm">
                      ₹{getHsnTaxBreakdown().reduce((sum, item) => sum + item.sgstAmount, 0).toFixed(2)}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-right text-sm">
                      ₹{getHsnTaxBreakdown().reduce((sum, item) => sum + item.totalTax, 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer Section */}
            <div className="grid grid-cols-2 gap-8 mt-8">
              <div>
                <div className="border border-gray-300 p-4">
                  <h4 className="font-semibold mb-2">Bank Details</h4>
                  <div className="flex">
                    <div className="w-16 h-16 bg-gray-200 mr-4 flex items-center justify-center text-xs">
                      QR Code
                    </div>
                    <div className="text-sm">
                      {invoiceData.bank_account ? (
                        <>
                          <p><span className="font-medium">Name:</span> {invoiceData.bank_account.bank_name}</p>
                          <p><span className="font-medium">Account No.:</span> {invoiceData.bank_account.account_number}</p>
                          <p><span className="font-medium">IFSC code:</span> {invoiceData.bank_account.ifsc_code}</p>
                          <p><span className="font-medium">Account Holder's Name:</span> {invoiceData.bank_account.account_holder_name}</p>
                        </>
                      ) : (
                        <>
                          <p><span className="font-medium">Name:</span> UNION BANK OF INDIA</p>
                          <p><span className="font-medium">Branch:</span> KUNDARA</p>
                          <p><span className="font-medium">Account No.:</span> 284511100001097</p>
                          <p><span className="font-medium">IFSC code:</span> UBIN0528459</p>
                          <p><span className="font-medium">Account Holder's Name:</span> JEEVUS NATURALS</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="border border-gray-300 p-4 h-full">
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Terms and conditions</h4>
                    <p className="text-sm">Thanks for doing business with us!</p>
                  </div>
                  
                  <div className="mt-8 text-right">
                    <p className="text-sm font-medium">For Jeevus Naturals</p>
                    <div className="mt-8 border-t border-gray-300 pt-2">
                      <p className="text-sm">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoiceData.notes && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-3">Notes:</h3>
                <p className="text-gray-700">{invoiceData.notes}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
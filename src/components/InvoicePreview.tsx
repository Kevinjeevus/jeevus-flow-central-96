import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Download, Share, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_date: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
}

interface InvoicePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceData;
}

export function InvoicePreview({ isOpen, onClose, invoiceData }: InvoicePreviewProps) {
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Create a print-friendly version
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoiceData.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; color: #333; }
            .invoice-title { font-size: 18px; margin-top: 10px; }
            .invoice-details { display: flex; justify-content: space-between; margin: 20px 0; }
            .customer-info, .invoice-info { width: 45%; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f5f5f5; }
            .totals { text-align: right; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .final-total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 10px; }
            .notes { margin-top: 30px; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">JEEVUS NATURALS</div>
            <div class="invoice-title">TAX INVOICE</div>
          </div>
          
          <div class="invoice-details">
            <div class="customer-info">
              <h3>Bill To:</h3>
              <p><strong>${invoiceData.customer.name}</strong></p>
              <p>${invoiceData.customer.email || ''}</p>
              <p>${invoiceData.customer.phone || ''}</p>
              <p>${invoiceData.customer.address || ''}</p>
            </div>
            <div class="invoice-info">
              <h3>Invoice Details:</h3>
              <p><strong>Invoice #:</strong> ${invoiceData.invoice_number}</p>
              <p><strong>Date:</strong> ${new Date(invoiceData.invoice_date).toLocaleDateString()}</p>
            </div>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th>Product/Service</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.unit_price.toFixed(2)}</td>
                  <td>₹${item.total_price.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₹${invoiceData.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Tax (18%):</span>
              <span>₹${invoiceData.tax_amount.toFixed(2)}</span>
            </div>
            <div class="total-row final-total">
              <span>Total:</span>
              <span>₹${invoiceData.total_amount.toFixed(2)}</span>
            </div>
          </div>
          
          ${invoiceData.notes ? `
            <div class="notes">
              <h3>Notes:</h3>
              <p>${invoiceData.notes}</p>
            </div>
          ` : ''}
          
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
          <div className="flex gap-2 justify-end border-b pb-4">
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

          {/* Invoice Content */}
          <div className="bg-white p-8 border rounded-lg">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800">JEEVUS NATURALS</h1>
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
                    <th className="border border-gray-300 px-4 py-3 text-left">Product/Service</th>
                    <th className="border border-gray-300 px-4 py-3 text-center">Quantity</th>
                    <th className="border border-gray-300 px-4 py-3 text-right">Unit Price</th>
                    <th className="border border-gray-300 px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-3">{item.product_name}</td>
                      <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right">₹{item.unit_price.toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right">₹{item.total_price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-2">
                  <span>Subtotal:</span>
                  <span>₹{invoiceData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span>Tax (18%):</span>
                  <span>₹{invoiceData.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 text-lg font-bold border-t-2 border-gray-800">
                  <span>Total:</span>
                  <span>₹{invoiceData.total_amount.toFixed(2)}</span>
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
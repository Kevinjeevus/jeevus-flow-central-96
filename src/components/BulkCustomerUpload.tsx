import { useState } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

interface CustomerRow {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  credit_limit?: number;
}

interface BulkCustomerUploadProps {
  onSuccess: () => void;
}

export function BulkCustomerUpload({ onSuccess }: BulkCustomerUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      {
        name: "John Doe",
        email: "john@example.com",
        phone: "9876543210",
        company: "Acme Corp",
        address: "123 Main Street",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        gstin: "27AAACG1234N1Z5",
        credit_limit: 50000
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "customer_template.xlsx");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    parseExcelFile(selectedFile);
  };

  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

        const parsedCustomers: CustomerRow[] = [];
        const parseErrors: string[] = [];

        jsonData.forEach((row, index) => {
          const customer: CustomerRow = {
            name: row.name?.toString().trim() || "",
            email: row.email?.toString().trim() || "",
            phone: row.phone?.toString().trim() || "",
            company: row.company?.toString().trim() || "",
            address: row.address?.toString().trim() || "",
            city: row.city?.toString().trim() || "",
            state: row.state?.toString().trim() || "",
            pincode: row.pincode?.toString().trim() || "",
            gstin: row.gstin?.toString().trim() || "",
            credit_limit: parseFloat(row.credit_limit) || 0,
          };

          // Validate required fields
          if (!customer.name) {
            parseErrors.push(`Row ${index + 2}: Customer name is required`);
          }

          // Validate email format if provided
          if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
            parseErrors.push(`Row ${index + 2}: Invalid email format`);
          }

          // Validate phone number format if provided
          if (customer.phone && !/^\d{10}$/.test(customer.phone.replace(/\D/g, ''))) {
            parseErrors.push(`Row ${index + 2}: Phone number should be 10 digits`);
          }

          parsedCustomers.push(customer);
        });

        setCustomers(parsedCustomers);
        setErrors(parseErrors);
      } catch (error) {
        toast({
          title: "Error parsing file",
          description: "Failed to read the Excel file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (customers.length === 0 || errors.length > 0) return;

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < customers.length; i += batchSize) {
        batches.push(customers.slice(i, i + batchSize));
      }

      let processed = 0;
      const total = customers.length;

      for (const batch of batches) {
        const { error } = await supabase
          .from("customers")
          .insert(batch.map(customer => ({
            name: customer.name,
            email: customer.email || null,
            phone: customer.phone || null,
            company: customer.company || null,
            address: customer.address || null,
            city: customer.city || null,
            state: customer.state || null,
            pincode: customer.pincode || null,
            gstin: customer.gstin || null,
            credit_limit: customer.credit_limit || 0,
          })));

        if (error) throw error;

        processed += batch.length;
        setUploadProgress((processed / total) * 100);
      }

      toast({
        title: "Success",
        description: `Successfully uploaded ${customers.length} customers`,
      });

      setIsOpen(false);
      setFile(null);
      setCustomers([]);
      setErrors([]);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const updateCustomer = (index: number, field: keyof CustomerRow, value: any) => {
    const updatedCustomers = [...customers];
    updatedCustomers[index] = { ...updatedCustomers[index], [field]: value };
    setCustomers(updatedCustomers);
    
    // Re-validate after update
    const validateErrors: string[] = [];
    updatedCustomers.forEach((customer, idx) => {
      if (!customer.name) {
        validateErrors.push(`Row ${idx + 2}: Customer name is required`);
      }
      if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
        validateErrors.push(`Row ${idx + 2}: Invalid email format`);
      }
      if (customer.phone && !/^\d{10}$/.test(customer.phone.replace(/\D/g, ''))) {
        validateErrors.push(`Row ${idx + 2}: Phone number should be 10 digits`);
      }
    });
    setErrors(validateErrors);
  };

  const resetState = () => {
    setFile(null);
    setCustomers([]);
    setErrors([]);
    setUploadProgress(0);
    setIsProcessing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetState();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Customer Upload</DialogTitle>
          <DialogDescription>
            Upload multiple customers at once using an Excel file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Step 1: Download Template</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={downloadTemplate}
                className="w-full gap-2"
              >
                <Download className="h-4 w-4" />
                Download Excel Template
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Use this template to format your customer data correctly
              </p>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Step 2: Upload Your File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {file ? file.name : "Choose Excel file to upload"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports .xlsx and .xls files
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span>Browse Files</span>
                    </Button>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview & Validation */}
          {file && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  Step 3: Review & Edit Data
                  {errors.length === 0 ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {errors.length} Errors
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  Found <strong>{customers.length}</strong> customers in the file
                </div>

                {errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <div className="font-medium">Please fix the following errors:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {errors.slice(0, 5).map((error, index) => (
                            <li key={index} className="text-xs">{error}</li>
                          ))}
                          {errors.length > 5 && (
                            <li className="text-xs">... and {errors.length - 5} more errors</li>
                          )}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Editable Customer Data Table */}
                {customers.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Review and edit customer data:</div>
                    <div className="border rounded-lg max-h-96 overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="p-2 text-left border-r">Name*</th>
                            <th className="p-2 text-left border-r">Email</th>
                            <th className="p-2 text-left border-r">Phone</th>
                            <th className="p-2 text-left border-r">Company</th>
                            <th className="p-2 text-left border-r">City</th>
                            <th className="p-2 text-left border-r">GSTIN</th>
                            <th className="p-2 text-left">Credit Limit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.map((customer, index) => (
                            <tr key={index} className="border-t hover:bg-muted/30">
                              <td className="p-1 border-r">
                                <input
                                  type="text"
                                  value={customer.name}
                                  onChange={(e) => updateCustomer(index, 'name', e.target.value)}
                                  className="w-full p-1 text-xs border rounded"
                                  placeholder="Customer name"
                                />
                              </td>
                              <td className="p-1 border-r">
                                <input
                                  type="email"
                                  value={customer.email || ''}
                                  onChange={(e) => updateCustomer(index, 'email', e.target.value)}
                                  className="w-full p-1 text-xs border rounded"
                                  placeholder="Email"
                                />
                              </td>
                              <td className="p-1 border-r">
                                <input
                                  type="text"
                                  value={customer.phone || ''}
                                  onChange={(e) => updateCustomer(index, 'phone', e.target.value)}
                                  className="w-full p-1 text-xs border rounded"
                                  placeholder="Phone"
                                />
                              </td>
                              <td className="p-1 border-r">
                                <input
                                  type="text"
                                  value={customer.company || ''}
                                  onChange={(e) => updateCustomer(index, 'company', e.target.value)}
                                  className="w-full p-1 text-xs border rounded"
                                  placeholder="Company"
                                />
                              </td>
                              <td className="p-1 border-r">
                                <input
                                  type="text"
                                  value={customer.city || ''}
                                  onChange={(e) => updateCustomer(index, 'city', e.target.value)}
                                  className="w-full p-1 text-xs border rounded"
                                  placeholder="City"
                                />
                              </td>
                              <td className="p-1 border-r">
                                <input
                                  type="text"
                                  value={customer.gstin || ''}
                                  onChange={(e) => updateCustomer(index, 'gstin', e.target.value)}
                                  className="w-full p-1 text-xs border rounded"
                                  placeholder="GSTIN"
                                />
                              </td>
                              <td className="p-1">
                                <input
                                  type="number"
                                  value={customer.credit_limit || 0}
                                  onChange={(e) => updateCustomer(index, 'credit_limit', parseFloat(e.target.value) || 0)}
                                  className="w-full p-1 text-xs border rounded"
                                  placeholder="0"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Uploading customers...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={customers.length === 0 || errors.length > 0 || isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? "Uploading..." : `Upload ${customers.length} Customers`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetState}
                    disabled={isProcessing}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
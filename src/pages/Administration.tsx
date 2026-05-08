import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, FileText, Hash, Palette } from "lucide-react";
import { CompanySettings } from "@/components/admin/CompanySettings";
import { TransactionPrefixes } from "@/components/admin/TransactionPrefixes";
import { UserInvoiceFormats } from "@/components/admin/UserInvoiceFormats";

export default function Administration() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground">Configure system settings and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="company-settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company-settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Company Settings</span>
            <span className="sm:hidden">Company</span>
          </TabsTrigger>
          <TabsTrigger value="transaction-prefixes" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            <span className="hidden sm:inline">Transaction Prefixes</span>
            <span className="sm:hidden">Prefixes</span>
          </TabsTrigger>
          <TabsTrigger value="invoice-formats" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Invoice Formats</span>
            <span className="sm:hidden">Formats</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company-settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Print Company Info / Header
              </CardTitle>
              <CardDescription>
                Configure company information and print settings for invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompanySettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transaction-prefixes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Transaction Prefixes
              </CardTitle>
              <CardDescription>
                Configure numbering prefixes for different transaction types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionPrefixes />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice-formats">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                User Invoice Formats
              </CardTitle>
              <CardDescription>
                Assign different invoice formats per user — each user who creates invoices can have their own layout
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserInvoiceFormats />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState } from "react";
import { ErpLayout } from "@/components/ErpLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, FileText, Hash } from "lucide-react";
import { CompanySettings } from "@/components/admin/CompanySettings";
import { TransactionPrefixes } from "@/components/admin/TransactionPrefixes";

export default function Administration() {
  return (
    <ErpLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Administration</h1>
            <p className="text-muted-foreground">Configure system settings and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="company-settings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company-settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Company Settings
            </TabsTrigger>
            <TabsTrigger value="transaction-prefixes" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Transaction Prefixes
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
        </Tabs>
      </div>
    </ErpLayout>
  );
}
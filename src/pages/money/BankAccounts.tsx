import { BankAccountsList } from "@/components/finance/BankAccountsList";
import { ErpLayout } from "@/components/ErpLayout";

export default function BankAccounts() {
  return (
    <ErpLayout>
      <div className="space-y-6 p-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Bank Accounts</h1>
        <p className="text-muted-foreground">
          Manage your bank accounts and track balances
        </p>
      </div>
      
      <BankAccountsList />
      </div>
    </ErpLayout>
  );
}
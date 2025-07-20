import { CashAccountsList } from "@/components/finance/CashAccountsList";
import { ErpLayout } from "@/components/ErpLayout";

export default function CashInHand() {
  return (
    <ErpLayout>
      <div className="space-y-6 p-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Cash In Hand</h1>
        <p className="text-muted-foreground">
          Track your cash accounts and petty cash
        </p>
      </div>
      
      <CashAccountsList />
      </div>
    </ErpLayout>
  );
}
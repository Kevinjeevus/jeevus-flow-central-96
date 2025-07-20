import { CashAccountsList } from "@/components/finance/CashAccountsList";

export default function CashInHand() {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Cash In Hand</h1>
        <p className="text-muted-foreground">
          Track your cash accounts and petty cash
        </p>
      </div>
      
      <CashAccountsList />
    </div>
  );
}
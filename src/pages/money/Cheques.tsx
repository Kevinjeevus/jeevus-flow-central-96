import { ChequesList } from "@/components/finance/ChequesList";
import { ErpLayout } from "@/components/ErpLayout";

export default function Cheques() {
  const handleEdit = (cheque: any) => {
    // Handle edit functionality - for now just log
    console.log("Edit cheque:", cheque);
  };

  return (
    <ErpLayout>
      <div className="space-y-6 p-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Cheques</h1>
        <p className="text-muted-foreground">
          Manage cheques received and issued
        </p>
      </div>
      
      <ChequesList onEdit={handleEdit} />
      </div>
    </ErpLayout>
  );
}
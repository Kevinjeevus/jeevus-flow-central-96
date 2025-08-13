import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Trash2, MoreHorizontal, FileText, CheckCircle, XCircle } from "lucide-react";

interface PayrollRunActionsProps {
  runId: string;
  status: string;
  onRefresh: () => void;
}

export function PayrollRunActions({ runId, status, onRefresh }: PayrollRunActionsProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const deleteRun = async () => {
    try {
      setDeleting(true);
      
      // Delete payroll items first
      const { error: itemsError } = await supabase
        .from("payroll_items")
        .delete()
        .eq("payroll_run_id", runId);

      if (itemsError) throw itemsError;

      // Delete payroll run
      const { error: runError } = await supabase
        .from("payroll_runs")
        .delete()
        .eq("id", runId);

      if (runError) throw runError;

      toast({ title: "Success", description: "Payroll run deleted successfully" });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to delete payroll run", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const approveRun = async () => {
    try {
      const { error } = await supabase
        .from("payroll_runs")
        .update({ 
          status: "approved",
          approved_at: new Date().toISOString()
        })
        .eq("id", runId);

      if (error) throw error;

      toast({ title: "Success", description: "Payroll run approved" });
      onRefresh();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to approve payroll run", variant: "destructive" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => {}}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {}}>
          <FileText className="mr-2 h-4 w-4" />
          Download Payslips
        </DropdownMenuItem>
        {status === "completed" && (
          <DropdownMenuItem onClick={approveRun}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </DropdownMenuItem>
        )}
        {status === "approved" && (
          <DropdownMenuItem onClick={() => {}}>
            <XCircle className="mr-2 h-4 w-4" />
            Revoke Approval
          </DropdownMenuItem>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payroll Run</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this payroll run and all associated payslips. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteRun}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
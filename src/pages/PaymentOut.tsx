import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, ArrowUpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function PaymentOut() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Out</h1>
          <p className="text-muted-foreground">Manage outgoing payments to suppliers</p>
        </div>
        <Button className="bg-gradient-primary hover:bg-gradient-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          New Payment Out
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search payments..." 
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5" />
            Payment Out
          </CardTitle>
          <CardDescription>
            Track and manage all outgoing payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ArrowUpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payment out records found</p>
            <p className="text-sm">Create your first payment out to get started</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
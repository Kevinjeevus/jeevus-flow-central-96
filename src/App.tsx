import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErpLayout } from "./components/ErpLayout";
import { AuthProvider, useAuth } from "./components/auth/AuthProvider";
import { Dashboard } from "./components/Dashboard";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import Sales from "./pages/Sales";
import SaleInvoices from "./pages/SaleInvoices";
import EstimateQuotation from "./pages/EstimateQuotation";
import ProformaInvoice from "./pages/ProformaInvoice";
import PaymentIn from "./pages/PaymentIn";
import SaleOrder from "./pages/SaleOrder";
import DeliveryChallan from "./pages/DeliveryChallan";
import SaleReturn from "./pages/SaleReturn";
import Inventory from "./pages/Inventory";
import StockRecords from "./pages/StockRecords";
import OnlineStore from "./pages/OnlineStore";
import Purchases from "./pages/Purchases";
import Suppliers from "./pages/Suppliers";
import Invoices from "./pages/Invoices";
import Auth from "./pages/Auth";
import EmployeeAuth from "./pages/EmployeeAuth";
import AttendanceLogin from "./pages/AttendanceLogin";
import Expenses from "./pages/Expenses";
import Employees from "./pages/Employees";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminSignup from "./pages/AdminSignup";
import Administration from "./pages/Administration";
import GSTReturns from "./pages/GSTReturns";
import Accounts from "./pages/Accounts";
import BankAnalysis from "./pages/BankAnalysis";
import FinanceReports from "./pages/FinanceReports";
import PurchaseBills from "./pages/PurchaseBills";
import PaymentOut from "./pages/PaymentOut";
import PurchaseOrder from "./pages/PurchaseOrder";
import PurchaseReturn from "./pages/PurchaseReturn";
import RoutesPage from "./pages/Routes";
import AttendanceHistory from "./pages/AttendanceHistory";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import SalesmanDashboard from "./pages/SalesmanDashboard";
import BankAccounts from "./pages/money/BankAccounts";
import CashInHand from "./pages/money/CashInHand";
import Cheques from "./pages/money/Cheques";
import AdminAttendance from "./pages/AdminAttendance";
import CRM from "./pages/CRM";
import Payroll from "./pages/Payroll";
import KevinSalesOrder from "./pages/KevinSalesOrder";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Routes>
      {/* Employee Dashboard Routes - No ErpLayout */}
      <Route path="/salesman-dashboard" element={<SalesmanDashboard />} />
      <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
      <Route path="/attendance-history" element={<AttendanceHistory />} />
      
      {/* Regular ERP Routes with Layout */}
      <Route path="/dashboard" element={<ErpLayout><Dashboard /></ErpLayout>} />
      <Route path="/customers" element={<ErpLayout><Customers /></ErpLayout>} />
      <Route path="/products" element={<ErpLayout><Products /></ErpLayout>} />
      <Route path="/suppliers" element={<ErpLayout><Suppliers /></ErpLayout>} />
      <Route path="/inventory" element={<ErpLayout><Inventory /></ErpLayout>} />
      <Route path="/stock-records" element={<ErpLayout><StockRecords /></ErpLayout>} />
      <Route path="/sales" element={<ErpLayout><Sales /></ErpLayout>} />
      <Route path="/purchases" element={<ErpLayout><Purchases /></ErpLayout>} />
      <Route path="/purchase-bills" element={<ErpLayout><PurchaseBills /></ErpLayout>} />
      <Route path="/payment-out" element={<ErpLayout><PaymentOut /></ErpLayout>} />
      <Route path="/purchase-order" element={<ErpLayout><PurchaseOrder /></ErpLayout>} />
      <Route path="/purchase-return" element={<ErpLayout><PurchaseReturn /></ErpLayout>} />
      <Route path="/invoices" element={<ErpLayout><Invoices /></ErpLayout>} />
      <Route path="/online-store" element={<ErpLayout><OnlineStore /></ErpLayout>} />
      <Route path="/estimate-quotation" element={<ErpLayout><EstimateQuotation /></ErpLayout>} />
      <Route path="/sale-order" element={<ErpLayout><SaleOrder /></ErpLayout>} />
      <Route path="/delivery-challan" element={<ErpLayout><DeliveryChallan /></ErpLayout>} />
      <Route path="/sale-return" element={<ErpLayout><SaleReturn /></ErpLayout>} />
      <Route path="/payment-in" element={<ErpLayout><PaymentIn /></ErpLayout>} />
      <Route path="/proforma-invoice" element={<ErpLayout><ProformaInvoice /></ErpLayout>} />
      <Route path="/sale-invoices" element={<ErpLayout><SaleInvoices /></ErpLayout>} />
      <Route path="/routes" element={<ErpLayout><RoutesPage /></ErpLayout>} />
      <Route path="/expenses" element={<ErpLayout><Expenses /></ErpLayout>} />
      <Route path="/employees" element={<ErpLayout><Employees /></ErpLayout>} />
      <Route path="/administration" element={<ErpLayout><Administration /></ErpLayout>} />
      <Route path="/gst" element={<ErpLayout><GSTReturns /></ErpLayout>} />
      <Route path="/accounts" element={<ErpLayout><Accounts /></ErpLayout>} />
      <Route path="/bank-analysis" element={<ErpLayout><BankAnalysis /></ErpLayout>} />
      <Route path="/finance-reports" element={<ErpLayout><FinanceReports /></ErpLayout>} />
      <Route path="/money/bank-accounts" element={<ErpLayout><BankAccounts /></ErpLayout>} />
      <Route path="/money/cash-in-hand" element={<ErpLayout><CashInHand /></ErpLayout>} />
      <Route path="/money/cheques" element={<ErpLayout><Cheques /></ErpLayout>} />
      <Route path="/admin-attendance" element={<ErpLayout><AdminAttendance /></ErpLayout>} />
      <Route path="/payroll" element={<ErpLayout><Payroll /></ErpLayout>} />
      <Route path="/crm" element={<ErpLayout><CRM /></ErpLayout>} />
      <Route path="/kevin-sales" element={<KevinSalesOrder />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin-signup" element={<AdminSignup />} />
            <Route path="/employee-auth" element={<EmployeeAuth />} />
            <Route path="/attendance" element={<AttendanceLogin />} />
            <Route path="/*" element={<ProtectedRoutes />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

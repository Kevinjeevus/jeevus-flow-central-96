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
import OnlineStore from "./pages/OnlineStore";
import Purchases from "./pages/Purchases";
import Suppliers from "./pages/Suppliers";
import Invoices from "./pages/Invoices";
import RoutesPage from "./pages/Routes";
import Auth from "./pages/Auth";
import EmployeeAuth from "./pages/EmployeeAuth";
import AttendanceLogin from "./pages/AttendanceLogin";
import Expenses from "./pages/Expenses";
import SalesmanDashboard from "./pages/SalesmanDashboard";
import Employees from "./pages/Employees";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminSignup from "./pages/AdminSignup";
import Administration from "./pages/Administration";
import GSTReturns from "./pages/GSTReturns";
import Accounts from "./pages/Accounts";
import BankAnalysis from "./pages/BankAnalysis";
import FinanceReports from "./pages/FinanceReports";
import BankAccounts from "./pages/money/BankAccounts";
import CashInHand from "./pages/money/CashInHand";
import Cheques from "./pages/money/Cheques";

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
      {/* Salesman Dashboard Routes - No ErpLayout */}
      <Route path="salesman-dashboard" element={<SalesmanDashboard />} />
      <Route path="sale-invoices" element={<SaleInvoices />} />
      
      {/* Regular ERP Routes with Layout */}
      <Route path="/*" element={
        <ErpLayout>
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="products" element={<Products />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="sales" element={<Sales />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="online-store" element={<OnlineStore />} />
            <Route path="estimate-quotation" element={<EstimateQuotation />} />
            <Route path="sale-order" element={<SaleOrder />} />
            <Route path="delivery-challan" element={<DeliveryChallan />} />
            <Route path="sale-return" element={<SaleReturn />} />
            <Route path="payment-in" element={<PaymentIn />} />
            <Route path="proforma-invoice" element={<ProformaInvoice />} />
            <Route path="sale-invoices" element={<SaleInvoices />} />
            <Route path="routes" element={<RoutesPage />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="employees" element={<Employees />} />
            <Route path="administration" element={<Administration />} />
            <Route path="gst" element={<GSTReturns />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="bank-analysis" element={<BankAnalysis />} />
            <Route path="finance-reports" element={<FinanceReports />} />
            <Route path="money/bank-accounts" element={<BankAccounts />} />
            <Route path="money/cash-in-hand" element={<CashInHand />} />
            <Route path="money/cheques" element={<Cheques />} />
          </Routes>
        </ErpLayout>
      } />
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

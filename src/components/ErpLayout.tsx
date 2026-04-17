import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ErpSidebar } from "./ErpSidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { PWAInstallPrompt } from "./PWAInstallPrompt";

interface ErpLayoutProps {
  children: React.ReactNode;
}

export function ErpLayout({ children }: ErpLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/" || location.pathname === "/dashboard";

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <ErpSidebar />

        <div className="flex-1 flex flex-col">
          <main className="flex-1 bg-muted/30">
            <div className="p-2 flex items-center gap-2">
              <SidebarTrigger />
              {!isHome && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
            </div>
            {children}
          </main>
        </div>
      </div>
      <PWAInstallPrompt />
    </SidebarProvider>
  );
}

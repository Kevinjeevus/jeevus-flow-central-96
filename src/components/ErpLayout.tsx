import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ErpSidebar } from "./ErpSidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { PWAInstallPrompt } from "./PWAInstallPrompt";
import { useIsMobile } from "@/hooks/use-mobile";

interface ErpLayoutProps {
  children: React.ReactNode;
}

export function ErpLayout({ children }: ErpLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isHome = location.pathname === "/" || location.pathname === "/dashboard";

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full">
        <ErpSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
            <div className="flex items-center gap-2 px-2 py-2 md:px-4">
              <SidebarTrigger className="h-8 w-8 md:h-7 md:w-7" />
              {!isHome && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="gap-1 text-xs md:text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              )}
            </div>
          </header>
          <main className="flex-1 bg-muted/30 overflow-x-hidden">
            <div className="p-3 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      <PWAInstallPrompt />
    </SidebarProvider>
  );
}

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ErpSidebar } from "./ErpSidebar";
import { Button } from "@/components/ui/button";
import { Bell, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ErpLayoutProps {
  children: React.ReactNode;
}

export function ErpLayout({ children }: ErpLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <ErpSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Main Content */}
          <main className="flex-1 bg-muted/30">
            <div className="p-2">
              <SidebarTrigger />
            </div>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
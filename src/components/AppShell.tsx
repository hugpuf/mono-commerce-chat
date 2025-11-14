import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { MobileHeader } from "./MobileHeader";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Header - top right logo */}
      {!isMobile && <AppHeader />}
      
      {/* Mobile Header - full width with menu */}
      {isMobile && <MobileHeader onMenuClick={() => setMobileMenuOpen(true)} />}
      
      {/* Sidebar - drawer on mobile, fixed on desktop */}
      <AppSidebar 
        mobileOpen={mobileMenuOpen} 
        onMobileClose={() => setMobileMenuOpen(false)} 
      />
      
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-auto pt-14 md:pt-20">
          {children}
        </main>
      </div>
    </div>
  );
}

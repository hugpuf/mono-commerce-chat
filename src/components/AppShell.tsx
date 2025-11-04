import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full bg-background">
      <AppSidebar />
      
      <div className="flex flex-col flex-1 min-w-0 relative">
        <AppHeader />
        
        <main className="flex-1 overflow-auto pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}

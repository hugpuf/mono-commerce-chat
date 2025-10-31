import { User } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function AppHeader() {
  const { workspaceName } = useWorkspace();
  
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
      <div className="flex items-center gap-3 ml-auto mr-4">
        <div className="w-8 h-8 bg-foreground rounded" />
        <div className="flex flex-col">
          <h4 className="font-semibold text-sm leading-none">{workspaceName || "Commerce Hub"}</h4>
          <p className="text-xs text-muted-foreground mt-1">Settings</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

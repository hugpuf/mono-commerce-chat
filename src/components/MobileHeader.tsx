import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-14 flex items-center justify-between px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="h-10 w-10"
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      <Link to="/" className="absolute left-1/2 -translate-x-1/2">
        <img 
          src={logo} 
          alt="Logo" 
          className="w-8 h-8 rounded-full object-cover" 
        />
      </Link>
    </header>
  );
}

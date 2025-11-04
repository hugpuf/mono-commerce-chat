import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export function AppHeader() {
  return (
    <header className="fixed top-4 right-4 z-50">
      <Link to="/" className="block p-2 rounded-full hover:bg-accent/50 transition-colors">
        <img 
          src={logo} 
          alt="Logo" 
          className="w-10 h-10 rounded-full object-cover" 
        />
      </Link>
    </header>
  );
}

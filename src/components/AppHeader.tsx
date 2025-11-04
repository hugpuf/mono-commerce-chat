import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export function AppHeader() {
  return (
    <header className="fixed top-6 right-6 z-50 p-4">
      <Link to="/" className="block p-3 rounded-full hover:bg-accent/50 transition-colors">
        <img 
          src={logo} 
          alt="Logo" 
          className="w-10 h-10 rounded-full object-cover" 
        />
      </Link>
    </header>
  );
}

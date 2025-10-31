import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export function AppHeader() {
  return (
    <header className="absolute top-4 right-6 z-50">
      <Link to="/" className="block">
        <img 
          src={logo} 
          alt="Logo" 
          className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity cursor-pointer object-cover" 
        />
      </Link>
    </header>
  );
}

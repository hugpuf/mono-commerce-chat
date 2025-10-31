import { Link } from "react-router-dom";

export function AppHeader() {
  return (
    <header className="absolute top-4 right-6 z-50">
      <Link to="/" className="block">
        <div className="w-10 h-10 bg-foreground rounded-full hover:opacity-80 transition-opacity cursor-pointer" />
      </Link>
    </header>
  );
}

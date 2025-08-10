import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="border-b">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="text-xl font-semibold">FlowPilot</div>
          <div className="text-sm text-gray-500">Agentic Productivity OS</div>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/" className="text-sm text-gray-700 hover:text-sky-600">Dashboard</Link>
          <Link to="/calendar" className="text-sm text-gray-700 hover:text-sky-600">Calendar</Link>
        </nav>
      </div>
    </header>
  );
}

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CalendarAgent from "./pages/CalendarAgent";
import Navbar from "./components/Navbar";
import.meta.env.VITE_GOOGLE_CLIENT_ID



export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white text-gray-900">
        <Navbar />
        <main className="container py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calendar" element={<CalendarAgent />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

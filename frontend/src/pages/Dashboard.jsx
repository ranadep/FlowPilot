import { useEffect, useState } from "react";

export default function Dashboard() {
  const [authStatus, setAuthStatus] = useState({
    authenticated: false,
    message: "Loading...",
    authUrl: null,
  });

  useEffect(() => {
    // Fetch Google Calendar auth status
    fetch("http://localhost:3001/auth-status")
      .then((res) => res.json())
      .then((data) => setAuthStatus(data))
      .catch(() =>
        setAuthStatus({
          authenticated: false,
          message: "Error checking status",
          authUrl: null,
        })
      );
  }, []);

  const handleConnect = async () => {
    try {
      const res = await fetch("http://localhost:3001/auth-url");
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "width=500,height=600");
      }
    } catch (err) {
      console.error("Error getting auth URL", err);
    }
  };

  return (
    <section>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold mb-2">Welcome to FlowPilot</h1>
        <p className="text-gray-600">
          Your agentic productivity OS. Use the Calendar page to connect to
          Google Calendar and manage your schedule with voice commands.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Connected Accounts */}
          <div className="p-4 border rounded">
            <h3 className="font-medium">Connected Accounts</h3>
            <p className="text-sm text-gray-500 mt-1">{authStatus.message}</p>
            {!authStatus.authenticated && authStatus.authUrl && (
              <button
                onClick={handleConnect}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Connect Google Calendar
              </button>
            )}
          </div>

          {/* Agent Status */}
          <div className="p-4 border rounded">
            <h3 className="font-medium">Agent Status</h3>
            <p className="text-sm text-gray-500 mt-1">Idle</p>
          </div>

          {/* Recent Actions */}
          <div className="p-4 border rounded">
            <h3 className="font-medium">Recent Actions</h3>
            <p className="text-sm text-gray-500 mt-1">—</p>
          </div>
        </div>
      </div>
    </section>
  );
}

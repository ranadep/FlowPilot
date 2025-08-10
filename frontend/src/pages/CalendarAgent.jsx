import { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import dayGridPlugin from "@fullcalendar/daygrid";
import axios from "axios";
import VoiceAssistant from "../components/VoiceAssistant";

export default function CalendarAgent() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef();

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:3001/events");
      const mapped = (res.data || []).map((ev) => ({
        id: ev.id,
        title: ev.summary || "No title",
        start: ev.start?.dateTime || ev.start?.date,
        end: ev.end?.dateTime || ev.end?.date,
        backgroundColor: ev.calendarColor || '#3788d8',
        borderColor: ev.calendarColor || '#3788d8',
        extendedProps: { 
          gEvent: ev,
          calendarSummary: ev.calendarSummary || 'Unknown Calendar'
        }
      }));
      setEvents(mapped);
    } catch (err) {
      console.error("Failed to fetch events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAgentAction = async (text) => {
    const res = await axios.post("http://localhost:3001/agent/interpret", { text });
    await fetchEvents();
    return res.data;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <section className="lg:col-span-3 bg-white rounded-lg shadow-sm p-4">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading calendar…</div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "timeGridWeek,timeGridDay"
            }}
            nowIndicator
            events={events}
            eventClick={(info) => {
              const ev = info.event.extendedProps.gEvent;
              const calendarName = info.event.extendedProps.calendarSummary;
              alert(`${info.event.title}\nCalendar: ${calendarName}\nTime: ${ev.start?.dateTime || ev.start?.date}`);
            }}
            height="auto"
          />
        )}
      </section>

      <aside className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Today</h3>
          <ul className="text-sm text-gray-700">
            {events
              .filter((e) => new Date(e.start).toDateString() === new Date().toDateString())
              .slice(0, 6)
              .map((e) => (
                <li key={e.id} className="py-2 border-b last:border-b-0">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(e.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" — "}
                    {new Date(e.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {e.extendedProps.calendarSummary}
                  </div>
                </li>
              ))}
          </ul>
        </div>

        <VoiceAssistant onCommand={handleAgentAction} />
        <div className="bg-white rounded-lg p-4 text-xs text-gray-500">
          <div className="font-medium text-sm mb-2">Instructions</div>
          <div>Connect Google Calendar, then click Speak and give a command like:</div>
          <ul className="list-disc list-inside mt-2">
            <li>"Schedule a 1 hour writing session tomorrow at 10am"</li>
            <li>"Move my writing session from 3pm to 5pm tomorrow"</li>
            <li>"Create a meeting on Friday at 2pm"</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

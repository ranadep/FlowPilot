import axios from "axios";
import { calendarClient } from "./googleCalendarService.js";

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "http://localhost:11434/api/chat";

export async function interpretCommand(text) {
  try {
    // Use Ollama Phi to interpret the command
    const prompt = `You are a calendar assistant. Given this user command, extract the intent and return only valid JSON with these fields:
- action: "create" | "move" | "reschedule" | "delete" | "find" | "list"
- summary: (event title/description)
- start: (ISO datetime string or null)
- end: (ISO datetime string or null)
- target: (if moving/rescheduling/deleting - text to find the event)

For date/time parsing:
- "tomorrow at 2pm" should be converted to ISO datetime
- "next Monday at 10am" should be converted to ISO datetime
- "in 1 hour" should be converted to ISO datetime
- Always include timezone offset

Examples:
- "create meeting tomorrow at 2pm for 1 hour" → {"action":"create","summary":"meeting","start":"2025-08-10T14:00:00-04:00","end":"2025-08-10T15:00:00-04:00"}
- "delete my meeting tomorrow" → {"action":"delete","summary":null,"start":null,"end":null,"target":"meeting tomorrow"}
- "remove the test event" → {"action":"delete","summary":null,"start":null,"end":null,"target":"test event"}
- "cancel my 2pm meeting" → {"action":"delete","summary":null,"start":null,"end":null,"target":"2pm meeting"}
- "list events" → {"action":"list","summary":null,"start":null,"end":null}

User command: "${text}"

Return only the JSON object, no other text.`;

    const response = await axios.post(OLLAMA_API_URL, {
      model: "phi:latest",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      stream: false
    });

    const aiResponse = response.data.message.content;
    
    // Extract JSON from the response - be more robust
    let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to find JSON-like content
      const lines = aiResponse.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
          jsonMatch = [line.trim()];
          break;
        }
      }
    }
    
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON. Response: " + aiResponse);
    }
    
    // Convert Python-style JSON to valid JSON (single quotes to double quotes)
    let jsonString = jsonMatch[0];
    jsonString = jsonString.replace(/'/g, '"');
    // Convert Python None to JSON null
    jsonString = jsonString.replace(/None/g, 'null');
    
    let intent;
    try {
      intent = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw response:", aiResponse);
      console.error("Extracted JSON:", jsonString);
      throw new Error("Invalid JSON response from AI: " + parseError.message);
    }
    
    console.log("Parsed intent:", intent);

    // Execute the intent
    return await executeIntent(intent, text);
  } catch (error) {
    console.error("Error interpreting command:", error);
    throw new Error(`Failed to interpret command: ${error.message}`);
  }
}

async function executeIntent(intent, originalText) {
  const calendar = calendarClient();
  
  switch (intent.action) {
    case "create":
      if (!intent.start || !intent.end) {
        throw new Error("Start and end times are required for creating events");
      }
      
      const event = {
        summary: intent.summary || "Scheduled by FlowPilot",
        description: originalText,
        start: { dateTime: intent.start },
        end: { dateTime: intent.end }
      };
      
      const result = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event
      });
      
      return {
        status: "created",
        message: `Created event: ${event.summary}`,
        event: result.data
      };

    case "move":
    case "reschedule":
      // Find the event first
      const searchQuery = intent.target || intent.summary || originalText;
      const events = await calendar.events.list({
        calendarId: "primary",
        q: searchQuery,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 10
      });
      
      if (!events.data.items || events.data.items.length === 0) {
        return {
          status: "not_found",
          message: `No events found matching: ${searchQuery}`
        };
      }
      
      const targetEvent = events.data.items[0];
      
      // Update the event
      if (intent.start) targetEvent.start.dateTime = intent.start;
      if (intent.end) targetEvent.end.dateTime = intent.end;
      
      const updated = await calendar.events.update({
        calendarId: "primary",
        eventId: targetEvent.id,
        requestBody: targetEvent
      });
      
      return {
        status: "updated",
        message: `Updated event: ${targetEvent.summary}`,
        event: updated.data
      };

    case "list":
    case "find":
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const upcomingEvents = await calendar.events.list({
        calendarId: "primary",
        timeMin: now.toISOString(),
        timeMax: weekLater.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 10
      });
      
      return {
        status: "listed",
        message: `Found ${upcomingEvents.data.items?.length || 0} upcoming events`,
        events: upcomingEvents.data.items || []
      };

    case "delete":
      // Find the event to delete
      const deleteQuery = intent.target || intent.summary || originalText;
      const eventsToDelete = await calendar.events.list({
        calendarId: "primary",
        q: deleteQuery,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 10
      });
      
      if (!eventsToDelete.data.items || eventsToDelete.data.items.length === 0) {
        return {
          status: "not_found",
          message: `No events found matching: ${deleteQuery}`
        };
      }
      
      const eventToDelete = eventsToDelete.data.items[0];
      
      // Delete the event
      await calendar.events.delete({
        calendarId: "primary",
        eventId: eventToDelete.id
      });
      
      return {
        status: "deleted",
        message: `Deleted event: ${eventToDelete.summary}`,
        event: eventToDelete
      };

    default:
      return {
        status: "unhandled",
        message: `Action '${intent.action}' not implemented yet`,
        intent: intent
      };
  }
}

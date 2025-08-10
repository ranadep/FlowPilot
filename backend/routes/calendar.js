import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import {
  getAuthUrl,
  handleOAuthCallback,
  calendarClient,
  loadTokens
} from "../services/googleCalendarService.js";
import { interpretCommand } from "../services/agentService.js";

dotenv.config();
const router = express.Router();
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

router.get("/auth-url", (req, res) => {
  res.json({ url: getAuthUrl() });
});

router.get("/auth-status", (req, res) => {
  const tokens = loadTokens();
  if (tokens && tokens.access_token) {
    res.json({ authenticated: true, message: "Google Calendar is connected" });
  } else {
    res.json({ authenticated: false, message: "Google Calendar not connected", authUrl: getAuthUrl() });
  }
});

router.get("/auth/clear", (req, res) => {
  try {
    const fs = require("fs");
    const TOKEN_PATH = "./tokens.json";
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
    res.json({ message: "Authentication cleared. Please re-authenticate." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code.");
  try {
    await handleOAuthCallback(code);
    res.send("Authentication successful. You can close this tab.");
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).send("Authentication failed");
  }
});

router.get("/calendars", async (req, res) => {
  try {
    const calendar = calendarClient();
    const result = await calendar.calendarList.list();
    res.json(result.data.items || []);
  } catch (err) {
    console.error("Error fetching calendars:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/events", async (req, res) => {
  try {
    const calendar = calendarClient();
    const now = new Date();
    // Fetch events from 30 days ago to 30 days in the future
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    console.log("Fetching events from:", thirtyDaysAgo.toISOString(), "to:", thirtyDaysLater.toISOString());
    
    // First, get all calendars
    const calendarsResult = await calendar.calendarList.list();
    const calendars = calendarsResult.data.items || [];
    
    console.log("Found", calendars.length, "calendars");
    
    // Fetch events from all calendars
    const allEvents = [];
    
    for (const cal of calendars) {
      try {
        //console.log("Fetching from calendar:", cal.summary, "(ID:", cal.id, ")");
        const result = await calendar.events.list({
          calendarId: cal.id,
          timeMin: thirtyDaysAgo.toISOString(),
          timeMax: thirtyDaysLater.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 100
        });
        
        if (result.data.items && result.data.items.length > 0) {
          // Add calendar info to each event
          const eventsWithCalendar = result.data.items.map(event => ({
            ...event,
            calendarSummary: cal.summary,
            calendarId: cal.id,
            calendarColor: cal.backgroundColor
          }));
          allEvents.push(...eventsWithCalendar);
          //console.log("Found", result.data.items.length, "events in", cal.summary);
        }
      } catch (err) {
        console.error("Error fetching from calendar", cal.summary, ":", err.message);
        // Continue with other calendars even if one fails
      }
    }
    
    // Sort all events by start time
    allEvents.sort((a, b) => {
      const aStart = a.start?.dateTime || a.start?.date;
      const bStart = b.start?.dateTime || b.start?.date;
      return new Date(aStart) - new Date(bStart);
    });
    
    //console.log("Total events found:", allEvents.length);
    res.json(allEvents);
  } catch (err) {
    console.error("Error fetching events:", err.message);
    res.status(401).json({
      error: "Authentication required",
      message: "Please authenticate with Google Calendar first",
      authUrl: getAuthUrl()
    });
  }
});

router.post("/events/create", async (req, res) => {
  const { summary, description, start, end } = req.body;
  if (!summary || !start || !end) {
    return res.status(400).json({ error: "summary, start, and end are required" });
  }
  try {
    const calendar = calendarClient();
    const event = {
      summary,
      description: description || "",
      start: { dateTime: new Date(start).toISOString() },
      end: { dateTime: new Date(end).toISOString() }
    };
    const created = await calendar.events.insert({ calendarId: "primary", requestBody: event });
    res.json(created.data);
  } catch (err) {
    console.error("Create event error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/agent/interpret", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  try {
    const result = await interpretCommand(text);
    res.json(result);
  } catch (err) {
    console.error("Agent interpret error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/agent/test", (req, res) => {
  const { text } = req.body;
  res.json({ 
    message: "Test successful", 
    received: text,
    timestamp: new Date().toISOString()
  });
});

export default router;

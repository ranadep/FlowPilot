import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import calendarRouter from "./routes/calendar.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" })); // allow frontend
app.use(bodyParser.json());

app.use("/", calendarRouter);

app.listen(PORT, () => {
  console.log(`Calendar + agent server running on port ${PORT}`);
});

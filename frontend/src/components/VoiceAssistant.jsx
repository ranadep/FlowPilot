import { useEffect, useRef, useState } from "react";

export default function VoiceAssistant({ onCommand }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");

  function normalizeCommand(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/\bopen my calendar\b/, "open calendar")
      .replace(/\bset meeting with\b/, "schedule meeting with")
      .replace(/\btomorrow\b/, "next day");
  }

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // keep listening until stopped
    recognition.interimResults = true; // show partial results
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError("");
      finalTranscriptRef.current = "";
    };

    recognition.onend = () => {
      setListening(false);
      if (finalTranscriptRef.current.trim()) {
        const normalized = normalizeCommand(finalTranscriptRef.current);
        sendCommand(normalized);
      }
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      finalTranscriptRef.current = final;
      setTranscript(final + interim);
    };

    recognition.onerror = (event) => {
      setListening(false);
      setError(`Speech recognition error: ${event.error}`);
    };

    recognitionRef.current = recognition;
  }, [onCommand]);

  const sendCommand = (text) => {
    const confidence = 1; // No native confidence with manual merge
    setHistory((h) => [
      { text, time: new Date().toISOString(), source: "user", confidence },
      ...h,
    ]);

    onCommand(text)
      .then((res) => {
        setHistory((h) => [
          {
            text: typeof res === "string" ? res : JSON.stringify(res, null, 2),
            time: new Date().toISOString(),
            source: "agent",
          },
          ...h,
        ]);
      })
      .catch((err) => {
        setHistory((h) => [
          {
            text: `Error: ${err.message}`,
            time: new Date().toISOString(),
            source: "agent",
          },
          ...h,
        ]);
      });
  };

  const startListening = () => {
    if (!isSupported || !recognitionRef.current) return;
    setTranscript("");
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Voice Assistant</h3>

      {error && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs">
          {error}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={listening ? stopListening : startListening}
          className={`px-3 py-2 rounded-md text-sm ${
            listening
              ? "bg-red-500 text-white"
              : "bg-sky-600 text-white hover:bg-sky-700"
          }`}
        >
          {listening ? "Stop" : "Speak"}
        </button>
      </div>

      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">Live transcript</div>
        <div className="min-h-[44px] text-sm text-gray-800 p-2 bg-gray-50 rounded">
          {transcript || <span className="text-gray-400">No command yet</span>}
        </div>
      </div>

      <div className="mb-2 flex justify-between items-center">
        <div className="text-xs text-gray-500">History</div>
      </div>

      <div className="max-h-48 overflow-auto text-xs border rounded">
        {history.length === 0 ? (
          <div className="p-3 text-gray-400 text-center">No commands yet</div>
        ) : (
          history.map((h, i) => (
            <div key={i} className="py-2 px-3 border-b last:border-b-0">
              <div className="text-[11px] text-gray-500">
                {new Date(h.time).toLocaleString()}
              </div>
              <div
                className={`text-sm ${
                  h.source === "user"
                    ? "font-medium text-blue-700"
                    : "text-gray-700"
                }`}
              >
                {h.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

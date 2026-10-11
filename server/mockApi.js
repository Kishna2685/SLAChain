import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Service State
let state = {
  mode: "normal", // 'normal' | 'slow' | 'error' | 'offline'
  normalLatencyMs: 40,
  slowLatencyMs: 1200,
  customLatencyMs: 40,
  requestCount: 0,
  history: [],
};

const recordHistory = (entry) => {
  state.history.unshift(entry);
  if (state.history.length > 30) {
    state.history.pop();
  }
};

/**
 * Health check endpoint pinged by Oracle and consumers.
 */
app.get("/health", async (req, res) => {
  state.requestCount++;
  const startTime = Date.now();

  if (state.mode === "error") {
    const elapsed = Date.now() - startTime;
    recordHistory({
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      status: 500,
      mode: state.mode,
      latency: elapsed,
      result: "FAILED (HTTP 500)",
    });
    return res.status(500).json({
      status: "error",
      message: "Internal Server Error: Database Connection Pool Exhausted",
      timestamp: Date.now(),
    });
  }

  if (state.mode === "offline") {
    // Hang request for 15 seconds to cause timeout
    await new Promise((resolve) => setTimeout(resolve, 15000));
    const elapsed = Date.now() - startTime;
    recordHistory({
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      status: 504,
      mode: state.mode,
      latency: elapsed,
      result: "TIMEOUT / OFFLINE",
    });
    return res.status(504).json({
      status: "error",
      message: "Gateway Timeout: Service Not Responding",
      timestamp: Date.now(),
    });
  }

  const delay =
    state.mode === "slow"
      ? state.slowLatencyMs + Math.floor(Math.random() * 200)
      : state.normalLatencyMs + Math.floor(Math.random() * 25);

  await new Promise((resolve) => setTimeout(resolve, delay));
  const elapsed = Date.now() - startTime;

  recordHistory({
    id: Date.now(),
    timestamp: new Date().toLocaleTimeString(),
    status: 200,
    mode: state.mode,
    latency: elapsed,
    result: state.mode === "slow" ? "DEGRADED (High Latency)" : "HEALTHY",
  });

  return res.status(200).json({
    status: state.mode === "slow" ? "degraded" : "ok",
    service: "Payments Microservice v2.4",
    mode: state.mode,
    simulatedLatencyMs: elapsed,
    timestamp: Date.now(),
  });
});

/**
 * Control endpoint to toggle simulated failures and latencies (supports POST and GET)
 */
const handleToggle = (req, res) => {
  const mode = req.params.mode || req.body?.mode || req.query?.mode;
  const slowLatencyMs = req.body?.slowLatencyMs || (req.query?.latency ? parseInt(req.query.latency) : undefined);
  const normalLatencyMs = req.body?.normalLatencyMs;

  if (mode && ["normal", "slow", "error", "offline"].includes(mode)) {
    state.mode = mode;
  } else {
    // Toggle between normal and slow
    state.mode = state.mode === "normal" ? "slow" : "normal";
  }

  if (typeof slowLatencyMs === "number" && !isNaN(slowLatencyMs)) {
    state.slowLatencyMs = slowLatencyMs;
  }
  if (typeof normalLatencyMs === "number" && !isNaN(normalLatencyMs)) {
    state.normalLatencyMs = normalLatencyMs;
  }

  console.log(`[MockApi] 🚨 Mode switched to: ${state.mode.toUpperCase()}`);
  res.json({
    success: true,
    message: `Mock API state updated to '${state.mode}'`,
    state,
  });
};

app.post("/toggle-failure", handleToggle);
app.get("/toggle-failure/:mode", handleToggle);
app.get("/toggle-failure", handleToggle);

/**
 * Telemetry endpoint for frontend inspection
 */
app.get("/status", (req, res) => {
  res.json({
    service: "Payments Microservice",
    ...state,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

/**
 * Reset service to healthy baseline
 */
app.post("/reset", (req, res) => {
  state.mode = "normal";
  state.normalLatencyMs = 40;
  state.slowLatencyMs = 1200;
  console.log("[MockApi] Reset to HEALTHY (Normal) state.");
  res.json({
    success: true,
    message: "Service state reset to normal",
    state,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("==================================================");
  console.log(`🚀 Mock Microservice Provider listening on port ${PORT}`);
  console.log(`   Health Endpoint : http://localhost:${PORT}/health`);
  console.log(`   Control Endpoint: POST/GET http://localhost:${PORT}/toggle-failure/:mode`);
  console.log(`   Status Endpoint : http://localhost:${PORT}/status`);
  console.log("==================================================");
});


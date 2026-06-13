"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Shield, Calendar, Clock, AlertOctagon, Heart, RefreshCw, 
  ArrowLeft, FileText, CheckCircle2, ChevronRight, Activity, Cpu 
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

interface TimelineEvent {
  timestamp: string;
  event: string;
  details: string;
  snapshot?: string;
}

interface ExamMetrics {
  totalExamDurationSeconds: number;
  tabSwitches: number;
  offScreenGazeSeconds: number;
  multipleFacesSeconds: number;
  abnormalAudioSeconds: number;
  totalBlinks: number;
  avgEAR: number;
  finalRiskScore: number;
}

// Default mock metrics in case the page is viewed directly
const DEFAULT_METRICS: ExamMetrics = {
  totalExamDurationSeconds: 420,
  tabSwitches: 1,
  offScreenGazeSeconds: 12,
  multipleFacesSeconds: 0,
  abnormalAudioSeconds: 5,
  totalBlinks: 54,
  avgEAR: 0.232,
  finalRiskScore: 0.223,
};

const DEFAULT_TIMELINE: TimelineEvent[] = [
  { timestamp: "12:00:15 PM", event: "exam_start", details: "Student commenced the exam session." },
  { timestamp: "12:02:40 PM", event: "gaze_deviation", details: "Off-screen gaze shift logged (0.31)" },
  { timestamp: "12:04:12 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 1)" },
  { timestamp: "12:05:30 PM", event: "abnormal_audio", details: "High volume environmental noise detected (48.5 dB)" },
  { timestamp: "12:06:15 PM", event: "fatigue_alert", details: "Prolonged eyelid closure detected: 1.8s" },
  { timestamp: "12:06:16 PM", event: "wellness_nudge", details: "Severe drowsiness & ocular strain detected. Let's take a 16-second box breathing break." },
  { timestamp: "12:06:32 PM", event: "wellness_nudge", details: "Wellness pause finished. Returning to test." },
];

export default function ReportPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<ExamMetrics>(DEFAULT_METRICS);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(DEFAULT_TIMELINE);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    // Check if invigilator is logged in
    const isAdmin = localStorage.getItem("mindguard_admin_auth");
    if (isAdmin !== "true") {
      router.push("/login?role=invigilator");
      return;
    }

    // Load actual telemetry if available in localStorage
    const savedTimeline = localStorage.getItem("mindguard_timeline");
    const savedMetrics = localStorage.getItem("mindguard_metrics");

    if (savedTimeline && savedMetrics) {
      try {
        setTimeline(JSON.parse(savedTimeline));
        setMetrics(JSON.parse(savedMetrics));
      } catch (err) {
        console.error("Failed to parse stored telemetry", err);
      }
    }

    fetchSessions();

    // Setup Supabase Realtime channel listener to update session list live
    if (supabase) {
      const channel = supabase
        .channel("public:sessions-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sessions" },
          (payload) => {
            console.log("Supabase Realtime database change event:", payload);
            fetchSessions();
          }
        )
        .subscribe();

      return () => {
        supabase?.removeChannel(channel);
      };
    }
  }, [router]);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions");
      const data = await response.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    }
  };

  const handleSelectSession = (session: any) => {
    setMetrics(session.metrics);
    setTimeline(session.timeline);
    setAiReport(session.aiReport || null);
    localStorage.setItem("mindguard_session_id", session.id);
  };

  useEffect(() => {
    const drawCharts = () => {
      // 1. Draw EAR Canvas
      const earCanvas = document.getElementById("ear-canvas") as HTMLCanvasElement | null;
      if (earCanvas) {
        const width = earCanvas.parentElement?.clientWidth || 600;
        earCanvas.width = width;
        earCanvas.height = 96;
        const ctx = earCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, width, 96);
          
          // Draw grid lines
          ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
          ctx.lineWidth = 1;
          for (let y = 16; y < 96; y += 24) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          // Draw threshold line (EAR = 0.18)
          const thresholdY = 96 - ((0.18 - 0.08) / 0.24) * 96;
          ctx.strokeStyle = "rgba(255, 0, 127, 0.2)";
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(0, thresholdY);
          ctx.lineTo(width, thresholdY);
          ctx.stroke();
          ctx.setLineDash([]); // reset

          // Generate EAR data points deterministically
          const pointsCount = 100;
          const earValues: number[] = [];
          const totalBlinks = metrics.totalBlinks || 50;
          
          for (let i = 0; i < pointsCount; i++) {
            let base = 0.24 + Math.sin(i / 4) * 0.015 + Math.cos(i / 10) * 0.008;
            
            // Introduce blinks
            if (i % Math.max(1, Math.floor(pointsCount / Math.max(1, totalBlinks / 4))) === 0 && i > 0 && i < pointsCount - 10) {
              base = 0.11; // blink
            }
            
            // Introduce fatigue closure
            if (metrics.finalRiskScore > 0.4 && i >= 45 && i <= 50) {
              base = 0.09; // long blink closure
            }

            // Introduce box breathing rest
            if (metrics.finalRiskScore > 0.4 && i >= 51 && i <= 60) {
              base = 0.26; // relaxed baseline
            }

            earValues.push(base);
          }

          // Plot EAR Line
          ctx.beginPath();
          earValues.forEach((val, index) => {
            const x = (index / (pointsCount - 1)) * width;
            const y = 96 - ((val - 0.08) / 0.24) * 96;
            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });

          // Style EAR line
          const gradient = ctx.createLinearGradient(0, 0, 0, 96);
          gradient.addColorStop(0, "#00f2fe");
          gradient.addColorStop(1, "rgba(0, 242, 254, 0.2)");
          ctx.strokeStyle = "#00f2fe";
          ctx.lineWidth = 2.5;
          ctx.stroke();
          
          // Area under curve fill
          ctx.lineTo(width, 96);
          ctx.lineTo(0, 96);
          ctx.closePath();
          ctx.fillStyle = "rgba(0, 242, 254, 0.04)";
          ctx.fill();
        }
      }

      // 2. Draw Heatmap Canvas
      const heatmapCanvas = document.getElementById("heatmap-canvas") as HTMLCanvasElement | null;
      if (heatmapCanvas) {
        const width = heatmapCanvas.parentElement?.clientWidth || 600;
        heatmapCanvas.width = width;
        heatmapCanvas.height = 24;
        const ctx = heatmapCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, width, 24);
          
          // Base bar background
          ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
          ctx.beginPath();
          ctx.roundRect(0, 4, width, 16, 8);
          ctx.fill();

          // Plot event markers based on timeline timestamps
          const timelineCount = timeline.length;
          timeline.forEach((event, index) => {
            const x = (index / Math.max(1, timelineCount - 1)) * (width - 20) + 10;
            
            let color = "#00f2fe"; // cyan default
            if (event.event === "tab_switch" || event.event === "security_alert") {
              color = "#ff007f"; // pink
            } else if (event.event === "gaze_deviation" || event.event === "abnormal_audio") {
              color = "#eab308"; // yellow
            } else if (event.event === "wellness_nudge") {
              color = "#10b981"; // emerald
            }

            if (event.event !== "exam_start" && event.event !== "exam_end") {
              // Draw marker dot
              ctx.beginPath();
              ctx.arc(x, 12, 5, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();

              // Glow outer ring
              ctx.beginPath();
              ctx.arc(x, 12, 8, 0, 2 * Math.PI);
              ctx.strokeStyle = color + "40";
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          });
        }
      }
    };

    // Draw charts after DOM settles
    setTimeout(drawCharts, 50);
    window.addEventListener("resize", drawCharts);
    return () => window.removeEventListener("resize", drawCharts);
  }, [metrics, timeline]);

  const compileAIReport = async () => {
    setLoadingAI(true);
    try {
      const response = await fetch("/api/analyze-telemetry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeline,
          metrics,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAiReport(data.report);
        setIsSimulated(data.simulated || false);

        // Update session in database with the generated report
        const sessionId = localStorage.getItem("mindguard_session_id") || "MG-DEFAULT";
        fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sessionId,
            studentName: sessionId.includes("SIM") ? "Taylor Chen (Simulated Demo)" : "Alex Rivera",
            metrics,
            timeline,
            aiReport: data.report
          })
        })
        .then(() => fetchSessions())
        .catch(err => console.error("Failed to update database report", err));
      } else {
        throw new Error(data.error || "Failed to generate report");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error compiling AI Report: " + err.message);
    } finally {
      setLoadingAI(false);
    }
  };

  const copyReportToClipboard = () => {
    if (!aiReport) return;
    navigator.clipboard.writeText(aiReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple Markdown Parser to render HTML without heavy external libraries
  const parseMarkdown = (md: string) => {
    return md.split("\n").map((line, idx) => {
      // Headers
      if (line.startsWith("# ")) {
        return <h2 key={idx} className="text-xl font-extrabold text-white mt-8 mb-4 border-b border-gray-900 pb-2">{line.replace("# ", "")}</h2>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-md font-bold text-cyan-400 mt-6 mb-3 flex items-center gap-2">{line.replace("## ", "")}</h3>;
      }
      if (line.startsWith("### ")) {
        return <h4 key={idx} className="text-sm font-semibold text-pink-400 mt-4 mb-2">{line.replace("### ", "")}</h4>;
      }
      // Bullet points
      if (line.startsWith("- ")) {
        return <li key={idx} className="text-xs text-gray-300 ml-4 list-disc mb-2">{line.replace("- ", "")}</li>;
      }
      // Bold rendering within text
      if (line.includes("**")) {
        const parts = line.split("**");
        return (
          <p key={idx} className="text-xs text-gray-300 leading-relaxed mb-3">
            {parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part)}
          </p>
        );
      }
      // Empty lines
      if (line.trim() === "") return <div key={idx} className="h-2" />;

      return <p key={idx} className="text-xs text-gray-300 leading-relaxed mb-3">{line}</p>;
    });
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 flex flex-col relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <header className="w-full border-b border-gray-900 bg-gray-950/70 backdrop-blur-md px-6 py-5 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-md font-bold text-white tracking-tight">Session Diagnostics Dashboard</h1>
            <p className="text-[9px] text-gray-500 font-mono">HUMANE SURVEILLANCE & WELLNESS OVERVIEW</p>
          </div>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
          Session Code: MG-2026-X9
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start z-10">
        
        {/* Left Section: Scores and Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Diagnostic Metrics Scoreboard */}
          <section className="glass-panel rounded-3xl p-6 border-cyan-500/15">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Cognitive Session Scoreboard
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-900">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Duration</span>
                <span className="text-sm font-extrabold text-white">{formatDuration(metrics.totalExamDurationSeconds)}</span>
              </div>
              <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-900">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Blinks Count</span>
                <span className="text-sm font-extrabold text-cyan-400">{metrics.totalBlinks}</span>
              </div>
              <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-900">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Avg Eye Ratio</span>
                <span className="text-sm font-extrabold text-white">{metrics.avgEAR.toFixed(3)}</span>
              </div>
              <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-900">
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Integrity Score</span>
                <span className={`text-sm font-extrabold ${metrics.finalRiskScore > 0.5 ? "text-pink-500" : "text-emerald-400"}`}>
                  {((1 - metrics.finalRiskScore) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Sub-Metrics details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-900 pt-6 mt-6 text-xs text-gray-400">
              <div className="flex justify-between border-r border-gray-900 pr-4">
                <span>Tab Switches:</span>
                <span className="font-semibold text-white font-mono">{metrics.tabSwitches}</span>
              </div>
              <div className="flex justify-between sm:border-r border-gray-900 sm:px-4">
                <span>Off-Screen Gaze:</span>
                <span className="font-semibold text-white font-mono">{metrics.offScreenGazeSeconds}s</span>
              </div>
              <div className="flex justify-between sm:pl-4">
                <span>Abnormal Noise:</span>
                <span className="font-semibold text-white font-mono">{metrics.abnormalAudioSeconds}s</span>
              </div>
            </div>
          </section>

          {/* Session Visual Analytics */}
          <section className="glass-panel rounded-3xl p-6 border-cyan-500/15">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Ocular Fatigue & Gaze Timeline (Edge Telemetry)
            </h2>
            
            <div className="space-y-6">
              {/* EAR Graph */}
              <div>
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-gray-400">Continuous Eye Aspect Ratio (EAR) Tracker</span>
                  <span className="text-cyan-400 font-mono font-medium">Blink Threshold: 0.18</span>
                </div>
                <div className="w-full bg-black/40 rounded-2xl p-4 border border-gray-900 overflow-hidden">
                  <canvas id="ear-canvas" className="w-full h-24" />
                </div>
              </div>

              {/* Heatmap */}
              <div>
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="text-gray-400">Anomalous Activity Distribution Heatmap</span>
                  <div className="flex gap-4 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500" /> Tab Switch</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Gaze Shift</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Wellness Nudge</span>
                  </div>
                </div>
                <div className="w-full bg-black/40 rounded-2xl p-4 border border-gray-900 overflow-hidden">
                  <canvas id="heatmap-canvas" className="w-full h-8" />
                </div>
              </div>
            </div>
          </section>

          {/* Audit Timeline */}
          <section className="glass-panel rounded-3xl p-6 border-cyan-500/15">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Proactive Audit Timeline
            </h2>

            <div className="relative border-l border-gray-900 ml-3 pl-6 space-y-6">
              {timeline.map((event, idx) => {
                let badgeColor = "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
                if (event.event === "tab_switch" || event.event === "security_alert") {
                  badgeColor = "bg-pink-500/10 border-pink-500/30 text-pink-400";
                } else if (event.event === "gaze_deviation" || event.event === "abnormal_audio") {
                  badgeColor = "bg-yellow-500/10 border-yellow-500/30 text-yellow-500";
                } else if (event.event === "wellness_nudge") {
                  badgeColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                }

                return (
                  <div key={idx} className="relative group">
                    {/* Bullet marker on timeline */}
                    <div className="absolute left-[-30px] top-1.5 w-2 h-2 rounded-full bg-gray-800 border border-[#030712] transition-colors group-hover:bg-cyan-400" />
                    
                    <div className="flex items-center gap-3 text-xs mb-1">
                      <span className="font-mono text-gray-500">{event.timestamp}</span>
                      <span className={`px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider font-mono uppercase ${badgeColor}`}>
                        {event.event.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 font-light pl-1">{event.details}</p>
                    {event.snapshot && (
                      <div className="mt-2 pl-1 animate-fade-in">
                        <img 
                          src={event.snapshot} 
                          alt="Violation Snapshot" 
                          className="w-40 h-30 rounded-lg border border-gray-800 object-cover hover:scale-105 transition-transform duration-200" 
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Historical Session Logs */}
          <section className="glass-panel rounded-3xl p-6 border-cyan-500/15">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Historical Institution Session Logs (Database)
            </h2>
            <p className="text-xs text-gray-500 font-light mb-4">
              Below are the sessions stored in the local file-based database. Select any session to review its scoreboard, charts, and AI feedback.
            </p>

            {sessions.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-800 rounded-2xl text-xs text-gray-500">
                No stored sessions found in database. Complete an exam to persist results.
              </div>
            ) : (
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {sessions.map((session, idx) => {
                  const currentId = typeof window !== "undefined" ? localStorage.getItem("mindguard_session_id") : "";
                  const isActive = currentId === session.id;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectSession(session)}
                      className={`w-full text-left p-4 rounded-xl border text-xs transition-all flex items-center justify-between group cursor-pointer ${
                        isActive
                          ? "bg-cyan-500/10 border-cyan-500 text-white font-medium shadow-md shadow-cyan-500/5"
                          : "bg-gray-900/40 border-gray-950 text-gray-400 hover:border-gray-850 hover:bg-gray-900/60 hover:text-gray-200"
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <span className={`font-bold font-mono ${isActive ? "text-cyan-400" : "text-gray-300"}`}>
                          {session.studentName}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {session.date} • ID: {session.id.substring(0, 14)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                          session.metrics.finalRiskScore > 0.6 
                            ? "bg-pink-500/10 text-pink-500" 
                            : session.metrics.finalRiskScore > 0.3 
                              ? "bg-yellow-500/10 text-yellow-500" 
                              : "bg-cyan-500/10 text-cyan-400"
                        }`}>
                          Risk: {(session.metrics.finalRiskScore * 100).toFixed(0)}%
                        </span>
                        <span className="text-gray-600 group-hover:text-gray-300 transition-colors">
                          {session.aiReport ? "📄 AI Report" : "⏳ Log Only"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Section: Gemini AI Analysis Panel (5 cols) */}
        <div className="lg:col-span-5">
          <section className="glass-panel rounded-3xl p-6 border-pink-500/15 relative overflow-hidden flex flex-col min-h-[400px]">
            {/* Background design */}
            <div className="absolute top-0 right-0 p-4 text-pink-500/5 pointer-events-none">
              <Cpu className="w-32 h-32" />
            </div>

            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500 fill-pink-500/20" />
              MindGuard AI Wellness Report
            </h2>
            <p className="text-[11px] text-gray-400 font-light mb-6">
              Invokes Google Gemini 3.1 Flash-Lite to cross-reference telemetry indicators with psychological fatigue baselines.
            </p>

            {aiReport === null ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-12 h-12 text-gray-700 mb-4" />
                <p className="text-xs text-gray-400 max-w-xs mb-6 font-light">
                  Click below to compile a compassionate assessment differentiating fatigue indicators from cheating behavior.
                </p>
                <button
                  onClick={compileAIReport}
                  disabled={loadingAI}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-pink-400 text-gray-900 font-extrabold text-xs hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2 cursor-pointer glow-pink"
                >
                  {loadingAI ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Compiling Intelligence...
                    </>
                  ) : (
                    <>
                      Compile AI Wellness Report
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Simulated/Edge indicator badge */}
                <div className="flex justify-between items-center bg-gray-900/60 border border-gray-900 rounded-xl p-3 mb-6 text-[10px]">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-pink-500" />
                    Engine: <strong className="text-gray-200">{isSimulated ? "Local Edge Emulator" : "Gemini 3.1 Flash-Lite"}</strong>
                  </span>
                  <button
                    onClick={copyReportToClipboard}
                    className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors uppercase font-mono"
                  >
                    {copied ? "Copied!" : "Copy Markdown"}
                  </button>
                </div>

                {/* Markdown text output display panel */}
                <div className="flex-1 overflow-y-auto max-h-[500px] border border-gray-900 bg-black/25 p-5 rounded-2xl scrollbar-thin">
                  {parseMarkdown(aiReport)}
                </div>

                <div className="mt-6 border-t border-gray-900 pt-4 flex gap-4">
                  <Link
                    href="/"
                    className="px-4 py-2.5 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-900 text-xs text-gray-300 font-semibold text-center flex-1 transition-all"
                  >
                    Exit Session
                  </Link>
                  <button
                    onClick={compileAIReport}
                    disabled={loadingAI}
                    className="px-4 py-2.5 rounded-xl border border-pink-500/20 text-pink-400 hover:bg-pink-500/10 text-xs font-semibold text-center flex-1 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {loadingAI ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      "Re-analyze Logs"
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

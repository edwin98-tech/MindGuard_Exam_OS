"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Shield, Calendar, Clock, AlertOctagon, Heart, RefreshCw, 
  ArrowLeft, FileText, CheckCircle2, ChevronRight, Activity, Cpu, Camera 
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

const DEFAULT_SESSIONS = [
  {
    id: "MG-CS-001",
    date: "6/14/2026, 1:20:15 PM",
    studentName: "Alex Rivera",
    metrics: {
      totalExamDurationSeconds: 600,
      tabSwitches: 0,
      offScreenGazeSeconds: 4,
      multipleFacesSeconds: 0,
      abnormalAudioSeconds: 2,
      totalBlinks: 48,
      avgEAR: 0.245,
      finalRiskScore: 0.08
    },
    timeline: [
      { timestamp: "1:20:15 PM", event: "exam_start", details: "Student commenced the exam session." },
      { timestamp: "1:23:40 PM", event: "abnormal_audio", details: "Low environmental noise detected (32.4 dB)" },
      { timestamp: "1:28:10 PM", event: "gaze_deviation", details: "Brief off-screen gaze shift logged (0.33)" },
      { timestamp: "1:30:15 PM", event: "exam_finished", details: "Student submitted the exam paper." }
    ]
  },
  {
    id: "MG-CS-002",
    date: "6/14/2026, 1:25:30 PM",
    studentName: "Jordan Smith",
    metrics: {
      totalExamDurationSeconds: 480,
      tabSwitches: 4,
      offScreenGazeSeconds: 32,
      multipleFacesSeconds: 0,
      abnormalAudioSeconds: 15,
      totalBlinks: 82,
      avgEAR: 0.198,
      finalRiskScore: 0.74
    },
    timeline: [
      { timestamp: "1:25:30 PM", event: "exam_start", details: "Student commenced the exam session." },
      { timestamp: "1:27:12 PM", event: "gaze_deviation", details: "Off-screen gaze shift logged (0.28)" },
      { timestamp: "1:28:45 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 1)" },
      { timestamp: "1:30:12 PM", event: "devtools_alert", details: "Access to browser Developer Tools blocked." },
      { timestamp: "1:31:05 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 2)" },
      { timestamp: "1:32:44 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 3)" },
      { timestamp: "1:34:10 PM", event: "abnormal_audio", details: "High volume environmental noise detected (52.3 dB)" },
      { timestamp: "1:35:00 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 4)" }
    ]
  },
  {
    id: "MG-CS-003",
    date: "6/14/2026, 1:30:45 PM",
    studentName: "Morgan Johnson",
    metrics: {
      totalExamDurationSeconds: 590,
      tabSwitches: 1,
      offScreenGazeSeconds: 8,
      multipleFacesSeconds: 0,
      abnormalAudioSeconds: 6,
      totalBlinks: 59,
      avgEAR: 0.231,
      finalRiskScore: 0.15
    },
    timeline: [
      { timestamp: "1:30:45 PM", event: "exam_start", details: "Student commenced the exam session." },
      { timestamp: "1:32:20 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 1)" },
      { timestamp: "1:35:10 PM", event: "fatigue_alert", details: "Prolonged eyelid closure detected: 1.8s" },
      { timestamp: "1:35:11 PM", event: "wellness_nudge", details: "Severe drowsiness & ocular strain detected. Let's take a 16-second box breathing break." },
      { timestamp: "1:35:27 PM", event: "wellness_nudge", details: "Wellness pause finished. Returning to test." }
    ]
  },
  {
    id: "MG-CS-004",
    date: "6/14/2026, 1:32:00 PM",
    studentName: "Casey Williams",
    metrics: {
      totalExamDurationSeconds: 520,
      tabSwitches: 2,
      offScreenGazeSeconds: 22,
      multipleFacesSeconds: 0,
      abnormalAudioSeconds: 10,
      totalBlinks: 65,
      avgEAR: 0.215,
      finalRiskScore: 0.48
    },
    timeline: [
      { timestamp: "1:32:00 PM", event: "exam_start", details: "Student commenced the exam session." },
      { timestamp: "1:34:40 PM", event: "gaze_deviation", details: "Off-screen gaze shift logged (0.32)" },
      { timestamp: "1:36:12 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 1)" },
      { timestamp: "1:38:05 PM", event: "abnormal_audio", details: "High volume environmental noise detected (46.8 dB)" },
      { timestamp: "1:40:22 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 2)" },
      { timestamp: "1:41:50 PM", event: "gaze_deviation", details: "Off-screen gaze shift logged (0.29)" }
    ]
  },
  {
    id: "MG-CS-005",
    date: "6/14/2026, 1:35:10 PM",
    studentName: "Jamie Davis",
    metrics: {
      totalExamDurationSeconds: 600,
      tabSwitches: 0,
      offScreenGazeSeconds: 0,
      multipleFacesSeconds: 0,
      abnormalAudioSeconds: 0,
      totalBlinks: 40,
      avgEAR: 0.262,
      finalRiskScore: 0.0
    },
    timeline: [
      { timestamp: "1:35:10 PM", event: "exam_start", details: "Student commenced the exam session." },
      { timestamp: "1:45:10 PM", event: "exam_finished", details: "Student completed the exam with optimal telemetry integrity." }
    ]
  },
  {
    id: "MG-CS-006",
    date: "6/14/2026, 1:38:20 PM",
    studentName: "Avery Miller",
    metrics: {
      totalExamDurationSeconds: 410,
      tabSwitches: 3,
      offScreenGazeSeconds: 45,
      multipleFacesSeconds: 12,
      abnormalAudioSeconds: 28,
      totalBlinks: 89,
      avgEAR: 0.182,
      finalRiskScore: 0.85
    },
    timeline: [
      { timestamp: "1:38:20 PM", event: "exam_start", details: "Student commenced the exam session." },
      { timestamp: "1:40:15 PM", event: "gaze_deviation", details: "Off-screen gaze shift logged (0.25)" },
      { timestamp: "1:41:40 PM", event: "security_alert", details: "Multiple faces detected in frame (2 faces)" },
      { timestamp: "1:43:02 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 1)" },
      { timestamp: "1:44:12 PM", event: "abnormal_audio", details: "High volume environmental noise detected (56.2 dB)" },
      { timestamp: "1:45:50 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 2)" },
      { timestamp: "1:46:10 PM", event: "security_alert", details: "Multiple faces detected in frame (2 faces)" },
      { timestamp: "1:47:30 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 3)" }
    ]
  },
  {
    id: "MG-CS-007",
    date: "6/14/2026, 1:40:55 PM",
    studentName: "Robin Wilson",
    metrics: {
      totalExamDurationSeconds: 580,
      tabSwitches: 1,
      offScreenGazeSeconds: 14,
      multipleFacesSeconds: 0,
      abnormalAudioSeconds: 4,
      totalBlinks: 52,
      avgEAR: 0.228,
      finalRiskScore: 0.22
    },
    timeline: [
      { timestamp: "1:40:55 PM", event: "exam_start", details: "Student commenced the exam session." },
      { timestamp: "1:42:15 PM", event: "gaze_deviation", details: "Off-screen gaze shift logged (0.31)" },
      { timestamp: "1:45:30 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 1)" },
      { timestamp: "1:47:10 PM", event: "abnormal_audio", details: "Low environmental noise detected (38.1 dB)" }
    ]
  },
  {
    id: "MG-CS-008",
    date: "6/14/2026, 1:44:10 PM",
    studentName: "Riley Moore",
    metrics: {
      totalExamDurationSeconds: 550,
      tabSwitches: 2,
      offScreenGazeSeconds: 18,
      multipleFacesSeconds: 0,
      abnormalAudioSeconds: 9,
      totalBlinks: 61,
      avgEAR: 0.221,
      finalRiskScore: 0.38
    },
    timeline: [
      { timestamp: "1:44:10 PM", event: "exam_start", details: "Student commenced the exam session." },
      { timestamp: "1:46:22 PM", event: "gaze_deviation", details: "Off-screen gaze shift logged (0.30)" },
      { timestamp: "1:48:15 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 1)" },
      { timestamp: "1:50:40 PM", event: "abnormal_audio", details: "High volume environmental noise detected (44.5 dB)" },
      { timestamp: "1:52:12 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 2)" }
    ]
  }
];

export default function ReportPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<ExamMetrics>(DEFAULT_METRICS);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(DEFAULT_TIMELINE);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionSelected, setSessionSelected] = useState(false);
  const [activeTimelineTab, setActiveTimelineTab] = useState<"all" | "pink" | "yellow" | "emerald">("all");
  const [expandedTimelineItems, setExpandedTimelineItems] = useState<Record<number, boolean>>({});

  const [proctorAlertMsg, setProctorAlertMsg] = useState("");
  const [alertStatus, setAlertStatus] = useState<string | null>(null);

  const [sessions, setSessions] = useState<any[]>(DEFAULT_SESSIONS);
  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const handleSendProctorAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proctorAlertMsg.trim()) return;

    const payload = {
      message: proctorAlertMsg.trim(),
      timestamp: new Date().toLocaleTimeString(),
      studentName: selectedSession?.studentName || "Candidate"
    };

    // 1. Supabase Broadcast
    if (supabase) {
      try {
        await supabase.channel("proctor-alerts").send({
          type: "broadcast",
          event: "alert",
          payload
        });
        console.log("Proctor alert broadcasted over Supabase Realtime:", payload);
      } catch (err) {
        console.error("Supabase Realtime broadcast failed:", err);
      }
    }

    // 2. LocalStorage sync fallback (using key mindguard_proctor_alert)
    localStorage.setItem("mindguard_proctor_alert", JSON.stringify({
      ...payload,
      id: Math.random().toString()
    }));

    setAlertStatus(`Sent alert to ${payload.studentName}`);
    setProctorAlertMsg("");
    setTimeout(() => setAlertStatus(null), 3000);
  };

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
      if (data.success && data.sessions && data.sessions.length > 0) {
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
    setSelectedSessionId(session.id);
    localStorage.setItem("mindguard_session_id", session.id);
    setActiveTimelineTab("all");
    setExpandedTimelineItems({});
    setSessionSelected(true);
  };

  const getFilteredTimeline = () => {
    return timeline
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .filter(item => {
        if (activeTimelineTab === "all") return true;
        if (activeTimelineTab === "pink") {
          return (
            item.event === "tab_switch" ||
            item.event === "security_alert" ||
            item.event === "devtools_alert" ||
            item.event === "camera_freeze"
          );
        }
        if (activeTimelineTab === "yellow") {
          return (
            item.event === "gaze_deviation" ||
            item.event === "posture_deviation" ||
            item.event === "abnormal_audio"
          );
        }
        if (activeTimelineTab === "emerald") {
          return item.event === "wellness_nudge";
        }
        return true;
      });
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
          ctx.strokeStyle = "rgba(0, 0, 0, 0.03)";
          ctx.lineWidth = 1;
          for (let y = 16; y < 96; y += 24) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }

          // Draw threshold line (EAR = 0.18)
          const thresholdY = 96 - ((0.18 - 0.08) / 0.24) * 96;
          ctx.strokeStyle = "rgba(186, 26, 26, 0.2)";
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
          gradient.addColorStop(0, "#006194");
          gradient.addColorStop(1, "rgba(0, 97, 148, 0.2)");
          ctx.strokeStyle = "#006194";
          ctx.lineWidth = 2.5;
          ctx.stroke();
          
          // Area under curve fill
          ctx.lineTo(width, 96);
          ctx.lineTo(0, 96);
          ctx.closePath();
          ctx.fillStyle = "rgba(0, 97, 148, 0.04)";
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
          ctx.fillStyle = "rgba(0, 0, 0, 0.02)";
          ctx.beginPath();
          ctx.roundRect(0, 4, width, 16, 8);
          ctx.fill();

          // Plot event markers based on timeline timestamps
          const timelineCount = timeline.length;
          timeline.forEach((event, index) => {
            const x = (index / Math.max(1, timelineCount - 1)) * (width - 20) + 10;
            
            let color = "#006194"; // blue default
            if (event.event === "tab_switch" || event.event === "security_alert") {
              color = "#ba1a1a"; // red
            } else if (event.event === "gaze_deviation" || event.event === "abnormal_audio") {
              color = "#8b4c03"; // amber/yellow
            } else if (event.event === "wellness_nudge") {
              color = "#15803d"; // green
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
              ctx.strokeStyle = color + "33";
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
  }, [metrics, timeline, sessionSelected]);

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

      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          try {
            const text = await response.text();
            if (text && text.length < 150) errorMsg = text;
          } catch {}
        }
        throw new Error(errorMsg);
      }

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
      console.error("API failed, falling back to client-side simulation:", err);
      // Hard fallback for a bulletproof demo experience
      const mockReport = `# MINDGUARD COGNITIVE WELLNESS & INTEGRITY REPORT (OFFLINE DEMO)

## 1. Executive Summary
The exam session was monitored successfully. While some minor technical deviations occurred, the behavior patterns strongly correlate with testing anxiety and physical restlessness rather than malicious intent.

## 2. Cognitive Wellness & Fatigue Analysis
The telemetry indicates moderate to high ocular fatigue. Blink rate patterns and a depressed Average Eye Aspect Ratio reflect physical tiredness and digital eye strain (DES).

## 3. Exam Integrity Evaluation
- **Focus Deviations**: Brief off-screen gazes were detected, consistent with natural cognitive redirection.
- **Environment**: No significant security anomalies flagged. The student remained the primary entity in frame.

## 4. Institutional Recommendations
- **Avoid Punitive Grading**: Do not invalidate the exam based on minor telemetry alerts.
- **Implement Rest Breaks**: The student showed clear signs of digital eye strain. Recommend 1-minute visual rest breaks for exams exceeding 60 minutes.

## 5. Personalized Student Wellness Feedback
Hey! You did an amazing job finishing your exam. We noticed your eyes were getting a bit tired towards the end. Remember to practice the **20-20-20 rule**: every 20 minutes, look at something 20 feet away for at least 20 seconds. Keep breathing, stay hydrated, and take some time to stretch!`;
      
      setAiReport(mockReport);
      setIsSimulated(true);
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
        return <h2 key={idx} className="text-lg font-extrabold text-primary mt-6 mb-3 border-b border-border-outline-variant pb-1.5">{line.replace("# ", "")}</h2>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-sm font-bold text-primary-accent mt-5 mb-2 flex items-center gap-2">{line.replace("## ", "")}</h3>;
      }
      if (line.startsWith("### ")) {
        return <h4 key={idx} className="text-xs font-semibold text-text-secondary mt-3 mb-1.5">{line.replace("### ", "")}</h4>;
      }
      // Bullet points
      if (line.startsWith("- ")) {
        return <li key={idx} className="text-xs text-on-surface-variant ml-4 list-disc mb-1.5">{line.replace("- ", "")}</li>;
      }
      // Bold rendering within text
      if (line.includes("**")) {
        const parts = line.split("**");
        return (
          <p key={idx} className="text-xs text-on-surface-variant leading-relaxed mb-2">
            {parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-primary font-bold">{part}</strong> : part)}
          </p>
        );
      }
      // Empty lines
      if (line.trim() === "") return <div key={idx} className="h-2" />;

      return <p key={idx} className="text-xs text-on-surface-variant leading-relaxed mb-2">{line}</p>;
    });
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  const renderSessionLogs = () => {
    return (
      <section className="bg-surface-lowest border border-border-outline p-6 shadow-sm">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary-accent" />
          Historical Institution Session Logs (Database)
        </h2>
        <p className="text-xs text-on-surface-variant font-light mb-4">
          Below are the sessions stored in the local file-based database. Select any session to review its scoreboard, charts, and AI feedback.
        </p>

        {sessions.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border-outline text-xs text-text-secondary">
            No stored sessions found in database. Complete an exam to persist results.
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {sessions.map((session, idx) => {
              const isActive = selectedSessionId === session.id;
              if (isActive) {
                return (
                  <div
                    key={idx}
                    className="w-full text-left p-6 border transition-ease flex flex-col gap-4 border-primary-accent bg-surface-low text-on-surface font-medium shadow-sm animate-fade-in"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold font-mono text-primary text-sm">
                          {session.studentName}
                        </span>
                        <span className="text-[10px] text-text-secondary">
                          {session.date} • ID: {session.id.substring(0, 14)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                          session.metrics.finalRiskScore > 0.6 
                            ? "bg-red-50 border border-red-200 text-red-600" 
                            : session.metrics.finalRiskScore > 0.3 
                              ? "bg-amber-50 border border-amber-200 text-amber-600" 
                              : "bg-green-50 border border-green-200 text-green-600"
                        }`}>
                          Risk: {(session.metrics.finalRiskScore * 100).toFixed(0)}%
                        </span>
                        <span className="text-text-secondary font-mono text-[10px] flex items-center gap-1">
                          📄 AI Report
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border-outline-variant my-1" />

                    {/* Proactive Audit Timeline Section */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-primary-accent" />
                        Proactive Session Audit Timeline
                      </h3>

                      {/* Timeline Filter Tabs */}
                      <div className="flex flex-wrap gap-2 mb-4 border-b border-border-outline-variant pb-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveTimelineTab("all"); setExpandedTimelineItems({}); }}
                          className={`px-2.5 py-1 text-[9px] font-mono font-bold transition-all cursor-pointer ${
                            activeTimelineTab === "all"
                              ? "bg-surface-high border border-primary text-primary"
                              : "bg-surface border border-border-outline text-text-secondary hover:text-primary"
                          }`}
                        >
                          All ({timeline.length})
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveTimelineTab("pink"); setExpandedTimelineItems({}); }}
                          className={`px-2.5 py-1 text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            activeTimelineTab === "pink"
                              ? "bg-red-50 border border-red-200 text-red-600"
                              : "bg-surface border border-border-outline text-text-secondary hover:text-red-500"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                          Security ({
                            timeline.filter(e => 
                              e.event === "tab_switch" || 
                              e.event === "security_alert" || 
                              e.event === "devtools_alert" || 
                              e.event === "camera_freeze"
                            ).length
                          })
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveTimelineTab("yellow"); setExpandedTimelineItems({}); }}
                          className={`px-2.5 py-1 text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            activeTimelineTab === "yellow"
                              ? "bg-amber-50 border border-amber-200 text-amber-600"
                              : "bg-surface border border-border-outline text-text-secondary hover:text-amber-500"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          Attention ({
                            timeline.filter(e => 
                              e.event === "gaze_deviation" || 
                              e.event === "posture_deviation" || 
                              e.event === "abnormal_audio"
                            ).length
                          })
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveTimelineTab("emerald"); setExpandedTimelineItems({}); }}
                          className={`px-2.5 py-1 text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            activeTimelineTab === "emerald"
                              ? "bg-green-50 border border-green-200 text-green-600"
                              : "bg-surface border border-border-outline text-text-secondary hover:text-green-500"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-green-650" />
                          Wellness ({
                            timeline.filter(e => e.event === "wellness_nudge").length
                          })
                        </button>
                      </div>

                      <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                        {getFilteredTimeline().length === 0 ? (
                          <div className="text-text-secondary text-xs py-4 font-light text-center border border-dashed border-border-outline rounded-xl">
                            No logged anomalies for this filter.
                          </div>
                        ) : (
                          getFilteredTimeline().map((event) => {
                            const isExpanded = !!expandedTimelineItems[event.originalIndex];
                            
                            let activeClasses = "bg-surface-high border-primary text-primary shadow-sm";
                            let inactiveClasses = "bg-surface-lowest border-border-outline text-text-secondary hover:border-primary-accent";
                            let badgeColor = "bg-surface border border-border-outline text-text-secondary";
                            
                            if (
                              event.event === "tab_switch" ||
                              event.event === "security_alert" ||
                              event.event === "devtools_alert" ||
                              event.event === "camera_freeze"
                            ) {
                              badgeColor = "bg-red-50 border border-red-200 text-red-600";
                              activeClasses = "bg-red-50 border-red-300 text-red-800 shadow-sm";
                            } else if (
                              event.event === "gaze_deviation" ||
                              event.event === "posture_deviation" ||
                              event.event === "abnormal_audio"
                            ) {
                              badgeColor = "bg-amber-50 border border-amber-200 text-amber-600";
                              activeClasses = "bg-amber-50 border-amber-300 text-amber-800 shadow-sm";
                            } else if (event.event === "wellness_nudge") {
                              badgeColor = "bg-green-50 border border-green-200 text-green-600";
                              activeClasses = "bg-green-50 border-green-300 text-green-800 shadow-sm";
                            }

                            return (
                              <div 
                                key={event.originalIndex} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedTimelineItems(prev => ({
                                    ...prev,
                                    [event.originalIndex]: !prev[event.originalIndex]
                                  }));
                                }}
                                className={`w-full text-left p-3 border text-[11px] transition-all flex flex-col gap-2 cursor-pointer select-none rounded-lg ${
                                  isExpanded ? activeClasses : inactiveClasses
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="font-mono text-text-secondary shrink-0">{event.timestamp}</span>
                                    <span className={`px-2 py-0.5 rounded border text-[8px] font-bold tracking-wider font-mono uppercase shrink-0 ${badgeColor}`}>
                                      {event.event.replace("_", " ")}
                                    </span>
                                    {!isExpanded && (
                                      <span className="text-on-surface-variant font-light truncate max-w-[120px] sm:max-w-xs">
                                        {event.details}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {event.snapshot && (
                                      <Camera className="w-3.5 h-3.5 text-text-secondary opacity-80" />
                                    )}
                                    <span className="text-text-secondary text-[9px] font-mono shrink-0">
                                      {isExpanded ? "▲" : "▼"}
                                    </span>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="pt-2.5 border-t border-border-outline/30 animate-fade-in space-y-2.5">
                                    <p className="text-[11px] text-on-surface-variant font-light leading-relaxed">{event.details}</p>
                                    {event.snapshot && (
                                      <div className="relative w-44 rounded-lg overflow-hidden border border-border-outline shadow-sm">
                                        <img 
                                          src={event.snapshot} 
                                          alt="Violation Snapshot" 
                                          className="w-full h-auto object-cover" 
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Inactive cards remain simple buttons
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectSession(session)}
                  className="w-full text-left p-4 border transition-ease flex items-center justify-between group cursor-pointer bg-surface-lowest border-border-outline text-text-secondary hover:border-primary-accent hover:bg-surface-low"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-bold font-mono text-primary">
                      {session.studentName}
                    </span>
                    <span className="text-[10px] text-text-secondary">
                      {session.date} • ID: {session.id.substring(0, 14)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                      session.metrics.finalRiskScore > 0.6 
                        ? "bg-red-50 border border-red-200 text-red-600" 
                        : session.metrics.finalRiskScore > 0.3 
                          ? "bg-amber-50 border border-amber-200 text-amber-600" 
                          : "bg-green-50 border border-green-200 text-green-600"
                    }`}>
                      Risk: {(session.metrics.finalRiskScore * 100).toFixed(0)}%
                    </span>
                    <span className="text-text-secondary group-hover:text-primary transition-colors font-mono text-[10px]">
                      📄 AI Report
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col relative overflow-hidden font-body-md antialiased">
      {/* Link Material symbols */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* Navbar */}
      <header className="w-full border-b border-border-outline-variant bg-surface-lowest px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-8 h-8 rounded-full bg-surface-low border border-border-outline flex items-center justify-center text-text-secondary hover:text-primary transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" className="w-40 h-auto">
            {/* Outer Decorative Shield */}
            <path d="M35 15 C35 15 70 10 90 5 C110 10 145 15 145 15 C145 55 140 95 90 115 C40 95 35 55 35 15Z" fill="none" stroke="#BFC7D2" strokeWidth="1" strokeDasharray="2 2"/>
            
            {/* Primary Shield Body */}
            <path d="M40 20 C40 20 70 15 90 10 C110 15 140 20 140 20 C140 50 135 85 90 110 C45 85 40 50 40 20Z" fill="#006194"/>
            
            {/* Enhanced Neural Network Brain */}
            <circle cx="90" cy="40" r="3.5" fill="#FFFFFF"/>
            <circle cx="70" cy="55" r="3" fill="#FFFFFF"/>
            <circle cx="110" cy="55" r="3" fill="#FFFFFF"/>
            <circle cx="90" cy="65" r="4.5" fill="#00F0FF"/>
            <circle cx="65" cy="75" r="3" fill="#FFFFFF"/>
            <circle cx="115" cy="75" r="3" fill="#FFFFFF"/>
            <circle cx="90" cy="90" r="3.5" fill="#FFFFFF"/>
            
            <g stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.6">
              <line x1="90" y1="40" x2="70" y2="55"/>
              <line x1="90" y1="40" x2="110" y2="55"/>
              <line x1="70" y1="55" x2="90" y2="65"/>
              <line x1="110" y1="55" x2="90" y2="65"/>
              <line x1="90" y1="65" x2="65" y2="75"/>
              <line x1="90" y1="65" x2="115" y2="75"/>
              <line x1="65" y1="75" x2="90" y2="90"/>
              <line x1="115" y1="75" x2="90" y2="90"/>
              <line x1="70" y1="55" x2="65" y2="75"/>
              <line x1="110" y1="55" x2="115" y2="75"/>
            </g>

            {/* Typographic Branding */}
            <text x="160" y="72" fontFamily="Outfit, sans-serif" letterSpacing="-1.5">
              <tspan fill="#131B2E" fontWeight="600" fontSize="48">MIND</tspan>
              <tspan fill="#006194" fontWeight="800" fontSize="48">GUARD</tspan>
            </text>
            
            {/* Subtitle */}
            <g transform="translate(160, 110)">
              <rect width="12" height="1" fill="#BFC7D2" y="5"/>
              <text x="20" y="10" fontFamily="Outfit, sans-serif" fontWeight="500" fontSize="12" fill="#505F76" letterSpacing="4">
                EXAM OS PLATFORM
              </text>
            </g>
          </svg>
        </div>
        <span className="text-[10px] px-2.5 py-1 bg-surface-low text-primary-accent border border-border-outline-variant font-mono">
          Session Code: MG-2026-X9
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 z-10 flex flex-col justify-start">
        {!sessionSelected ? (
          <div className="w-full max-w-3xl mx-auto space-y-6 animate-fade-in py-12">
            <div className="text-center space-y-3 mb-8">
              <h2 className="text-2xl font-extrabold text-primary tracking-tight">Active Student Session Registry</h2>
              <p className="text-xs text-on-surface-variant font-light max-w-lg mx-auto">
                Select a student session from the institution log registry below to view detailed cognitive metrics, eye aspect ratios, proctoring gaze timelines, and compile AI wellness reports.
              </p>
            </div>
            {renderSessionLogs()}
          </div>
        ) : (
          <div className="space-y-6 w-full">
            {/* Details sub-header with Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-lowest border border-border-outline p-4 rounded-xl shadow-sm print:hidden animate-fade-in">
              <div>
                <h1 className="text-sm font-bold text-primary font-mono">{selectedSession?.studentName || "Candidate"}'s Forensic Diagnostic Report</h1>
                <p className="text-[10px] text-text-secondary font-light">Session ID: {selectedSession?.id} • Date: {selectedSession?.date}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSessionSelected(false);
                    setSelectedSessionId(null);
                  }}
                  className="px-4 py-2 border border-border-outline bg-surface-low hover:bg-surface text-xs text-on-surface-variant font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Registry
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-primary-accent transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Print Diagnostics Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
            {/* Left Section: Scores and Timeline (7 cols) */}
            <div className="lg:col-span-7 space-y-8 animate-fade-in">
              
              {/* Diagnostic Metrics Scoreboard */}
              <section className="bg-surface-lowest border border-border-outline p-6 rounded-xl shadow-sm">
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-accent" />
                  Cognitive Session Scoreboard
                </h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="p-4 rounded-xl bg-surface-low border border-border-outline">
                    <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Duration</span>
                    <span className="text-sm font-extrabold text-primary">{formatDuration(metrics.totalExamDurationSeconds)}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-low border border-border-outline">
                    <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Blinks Count</span>
                    <span className="text-sm font-extrabold text-primary-accent">{metrics.totalBlinks}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-low border border-border-outline">
                    <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Avg Eye Ratio</span>
                    <span className="text-sm font-extrabold text-primary">{metrics.avgEAR.toFixed(3)}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-low border border-border-outline">
                    <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block mb-1">Integrity Score</span>
                    <span className={`text-sm font-extrabold ${metrics.finalRiskScore > 0.5 ? "text-red-500" : "text-emerald-600"}`}>
                      {((1 - metrics.finalRiskScore) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Sub-Metrics details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border-outline-variant pt-6 mt-6 text-xs text-on-surface-variant">
                  <div className="flex justify-between border-r border-border-outline-variant pr-4">
                    <span>Tab Switches:</span>
                    <span className="font-semibold text-primary font-mono">{metrics.tabSwitches}</span>
                  </div>
                  <div className="flex justify-between sm:border-r border-border-outline-variant sm:px-4">
                    <span>Off-Screen Gaze:</span>
                    <span className="font-semibold text-primary font-mono">{metrics.offScreenGazeSeconds}s</span>
                  </div>
                  <div className="flex justify-between sm:pl-4">
                    <span>Abnormal Noise:</span>
                    <span className="font-semibold text-primary font-mono">{metrics.abnormalAudioSeconds}s</span>
                  </div>
                </div>
              </section>

              {/* Session Visual Analytics */}
              <section className="bg-surface-lowest border border-border-outline p-6 rounded-xl shadow-sm">
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-accent" />
                  Ocular Fatigue & Gaze Timeline (Edge Telemetry)
                </h2>
                
                <div className="space-y-6">
                  {/* EAR Graph */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-text-secondary">Continuous Eye Aspect Ratio (EAR) Tracker</span>
                      <span className="text-primary-accent font-mono font-medium">Blink Threshold: 0.18</span>
                    </div>
                    <div className="w-full bg-surface-low rounded-xl p-4 border border-border-outline overflow-hidden">
                      <canvas id="ear-canvas" className="w-full h-24" />
                    </div>
                  </div>

                  {/* Heatmap */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="text-text-secondary">Anomalous Activity Distribution Heatmap</span>
                      <div className="flex gap-4 text-[10px]">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Tab Switch</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Gaze Shift</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Wellness Nudge</span>
                      </div>
                    </div>
                    <div className="w-full bg-surface-low rounded-xl p-4 border border-border-outline overflow-hidden">
                      <canvas id="heatmap-canvas" className="w-full h-8" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Historical Session Logs */}
              {renderSessionLogs()}
            </div>

            {/* Right Section: Proctor Messaging & Gemini AI Analysis Panel (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Proctor Intervention Panel */}
              <section className="bg-surface-lowest border border-border-outline p-6 rounded-xl shadow-sm space-y-4 print:hidden">
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-500">campaign</span>
                  Proctor Intervention & Alerts
                </h2>
                <p className="text-[11px] text-text-secondary font-light">
                  Direct real-time communication link to the active student's exam browser tab. 
                  Sends warnings or encouragements immediately.
                </p>
                
                <form onSubmit={handleSendProctorAlert} className="space-y-3">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Type alert/intervention message..."
                      value={proctorAlertMsg}
                      onChange={(e) => setProctorAlertMsg(e.target.value)}
                      className="flex-1 px-3 py-2 border border-border-outline rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-surface-lowest text-on-surface"
                    />
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-primary-accent transition-all cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                  
                  {/* Preset quick alerts */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button 
                      type="button" 
                      onClick={() => setProctorAlertMsg("Great job, keep going! Take a deep breath.")}
                      className="px-2 py-1 bg-surface border border-border-outline text-[9px] text-text-secondary rounded hover:bg-surface-low cursor-pointer"
                    >
                      Encourage
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setProctorAlertMsg("Warning: Face off-screen detected. Please look at the screen.")}
                      className="px-2 py-1 bg-surface border border-border-outline text-[9px] text-text-secondary rounded hover:bg-surface-low cursor-pointer"
                    >
                      Face Off-Screen
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setProctorAlertMsg("Warning: Refrain from opening extra browser tabs.")}
                      className="px-2 py-1 bg-surface border border-border-outline text-[9px] text-text-secondary rounded hover:bg-surface-low cursor-pointer"
                    >
                      Tab Warning
                    </button>
                  </div>
                </form>

                {alertStatus && (
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide animate-pulse">
                    ✓ {alertStatus}
                  </p>
                )}
              </section>

              <section className="bg-surface-lowest border border-border-outline p-6 rounded-xl relative overflow-hidden flex flex-col min-h-[400px] shadow-sm">
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-primary-accent fill-primary-accent/10" />
                  MindGuard AI Wellness Report
                </h2>
                <p className="text-[11px] text-text-secondary font-light mb-6">
                  Invokes Google Gemini 3.1 Flash-Lite to cross-reference telemetry indicators with psychological fatigue baselines.
                </p>

                {aiReport === null ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="w-12 h-12 text-border-outline mb-4" />
                    <p className="text-xs text-text-secondary max-w-xs mb-6 font-light">
                      Click below to compile a compassionate assessment differentiating fatigue indicators from cheating behavior.
                    </p>
                    <div className="flex flex-col gap-3 w-full max-w-[240px]">
                      <button
                        onClick={compileAIReport}
                        disabled={loadingAI}
                        className="px-6 py-3 bg-primary-accent hover:bg-primary text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer w-full"
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
                      <button
                        onClick={() => {
                          setSessionSelected(false);
                          setSelectedSessionId(null);
                        }}
                        className="px-4 py-2.5 border border-border-outline bg-surface-low hover:bg-surface text-xs text-on-surface-variant font-semibold text-center transition-all w-full cursor-pointer"
                      >
                        Back to Registry
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col animate-fade-in">
                    {/* Simulated/Edge indicator badge */}
                    <div className="flex justify-between items-center bg-surface-low border border-border-outline rounded-lg p-3 mb-6 text-[10px]">
                      <span className="text-text-secondary flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-primary-accent" />
                        Engine: <strong className="text-primary">{isSimulated ? "Local Edge Emulator" : "Gemini 3.1 Flash-Lite"}</strong>
                      </span>
                      <button
                        onClick={copyReportToClipboard}
                        className="text-primary-accent hover:underline font-bold transition-colors uppercase font-mono"
                      >
                        {copied ? "Copied!" : "Copy Markdown"}
                      </button>
                    </div>

                    {/* Markdown text output display panel */}
                    <div className="flex-1 overflow-y-auto max-h-[500px] border border-border-outline bg-surface-low/30 p-5 rounded-lg">
                      {parseMarkdown(aiReport)}
                    </div>

                    <div className="mt-6 border-t border-border-outline-variant pt-4 flex gap-4">
                      <button
                        onClick={() => {
                          setSessionSelected(false);
                          setSelectedSessionId(null);
                        }}
                        className="px-4 py-2.5 border border-border-outline bg-surface-low hover:bg-surface text-xs text-on-surface-variant font-semibold text-center flex-1 transition-all cursor-pointer"
                      >
                        Back to Registry
                      </button>
                      <button
                        onClick={compileAIReport}
                        disabled={loadingAI}
                        className="px-4 py-2.5 border border-primary-accent/30 text-primary-accent hover:bg-primary-accent/10 text-xs font-semibold text-center flex-1 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
          </div>
        </div>
      )}
      </main>
    </div>
  );
}

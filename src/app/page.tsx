import Link from "next/link";
import { Shield, Brain, Activity, Clock, FileText, ArrowRight, Eye, AlertCircle } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-gray-100 relative overflow-hidden">
      {/* Abstract background glowing shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-pink-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5 text-gray-900 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              MindGuard <span className="text-cyan-400 font-medium">Exam OS</span>
            </h1>
            <p className="text-[10px] text-gray-500 tracking-wider uppercase font-semibold">Humane Integrity Layer</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] px-3 py-1 rounded-full border border-gray-800 bg-gray-900/60 text-gray-400 font-mono font-medium">
            FAR AWAY 2026 - Theme A
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-12 pb-24 z-10 flex flex-col items-center text-center justify-center">
        <div className="max-w-3xl flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Redefining Examination Integrity</span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Humane, Privacy-First <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-pink-500 bg-clip-text text-transparent">
              Proctoring Redefined
            </span>
          </h2>

          <p className="mt-6 text-base sm:text-lg text-gray-400 leading-relaxed font-light">
            Traditional proctoring software penalizes natural behaviors like eye strain, blinking, and shifts in posture.
            <strong className="text-cyan-300 font-normal"> MindGuard Exam OS</strong> uses client-side edge computer vision (MediaPipe) 
            to filter out fatigue anomalies locally, while employing Gemini 3.1 Flash-Lite post-exam to construct deep, 
            compassionate behavioral intelligence reports.
          </p>

          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link
              href="/login?role=student"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 glow-cyan"
            >
              Start Mock Exam
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
            <Link
              href="/login?role=invigilator"
              className="px-8 py-4 rounded-xl border border-gray-800 bg-gray-900/50 text-gray-200 font-semibold hover:border-gray-700 hover:bg-gray-900/80 hover:text-white transition-all flex items-center gap-2"
            >
              View Invigilator Reports
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-24 w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Card 1 */}
          <div className="glass-panel p-6 rounded-2xl glow-border-cyan group transition-all">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-5 text-cyan-400 group-hover:bg-cyan-500/20 transition-all">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Edge Gaze & Blink Tracking</h3>
            <p className="text-sm text-gray-400 leading-relaxed font-light">
              Computes Eye Aspect Ratio (EAR) and Gaze Ratio ($G_x$) locally at 30fps. Your video feed never leaves your device, guaranteeing absolute user privacy.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-6 rounded-2xl glow-border-pink group transition-all">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-5 text-pink-400 group-hover:bg-pink-500/20 transition-all">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Cognitive Wellness Overlays</h3>
            <p className="text-sm text-gray-400 leading-relaxed font-light">
              Detects fatigue thresholds and blink bursts. Instead of terminating the exam, the system opens calming guided box-breathing prompts to help students refocus.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-6 rounded-2xl glow-border-cyan group transition-all">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-5 text-cyan-400 group-hover:bg-cyan-500/20 transition-all">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Tamper-Evident Logs</h3>
            <p className="text-sm text-gray-400 leading-relaxed font-light">
              Stores a secure, chronological ledger of environment markers (tab swaps, multiple faces, abnormal noise thresholds) to form an objective audit trail.
            </p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-gray-900 bg-gray-950/40 py-8 z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© 2026 MindGuard. Built for the FAR AWAY 2026 Hackathon (Zuup / Zylon Labs).</p>
          <div className="flex gap-4">
            <span className="hover:text-cyan-400 transition-colors">Privacy First</span>
            <span>•</span>
            <span className="hover:text-pink-400 transition-colors">Humane Proctoring</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

import Link from "next/link";
import { Shield, Brain, Activity, Clock, ArrowRight, Eye } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface relative overflow-hidden font-body-md antialiased">
      {/* Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <Link href="/" className="cursor-pointer">
          <svg width="240" height="80" viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" className="w-48 h-auto">
            {/* Outer Decorative Shield */}
            <path d="M35 15 C35 15 70 10 90 5 C110 10 145 15 145 15 C145 55 140 95 90 115 C40 95 35 55 35 15Z" fill="none" stroke="#BFC7D2" strokeWidth="1" strokeDasharray="2 2"/>
            
            {/* Primary Shield Body */}
            <path d="M40 20 C40 20 70 15 90 10 C110 15 140 20 140 20 C140 50 135 85 90 110 C45 85 40 50 40 20Z" fill="#006194"/>
            
            {/* Enhanced Neural Network Brain */}
            <circle cx="90" cy="40" r="3.5" fill="#FFFFFF"/>
            <circle cx="70" cy="55" r="3" fill="#FFFFFF"/>
            <circle cx="110" cy="55" r="3" fill="#FFFFFF"/>
            <circle cx="90" cy="65" r="4.5" fill="#00F0FF"/> {/* Center Pulse Node */}
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
            
            {/* Subtitle with expanded vertical space */}
            <g transform="translate(160, 110)">
              <rect width="12" height="1" fill="#BFC7D2" y="5"/>
              <text x="20" y="10" fontFamily="Outfit, sans-serif" fontWeight="500" fontSize="12" fill="#505F76" letterSpacing="4">
                EXAM OS PLATFORM
              </text>
            </g>
          </svg>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 pt-12 pb-24 z-10 flex flex-col items-center text-center justify-center">
        <div className="max-w-3xl flex flex-col items-center">
          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-primary leading-tight">
            Humane, Privacy-First <br />
            <span className="text-primary-accent">
              Proctoring Redefined
            </span>
          </h2>

          <p className="mt-6 text-base sm:text-lg text-text-secondary leading-relaxed font-light">
            Traditional proctoring software penalizes natural behaviors like eye strain, blinking, and shifts in posture.
            <strong className="text-primary-accent font-medium"> MindGuard Exam OS</strong> uses client-side edge computer vision (MediaPipe) 
            to filter out fatigue anomalies locally, while employing Gemini 3.1 Flash-Lite post-exam to construct deep, 
            compassionate behavioral intelligence reports.
          </p>

          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link
              href="/login?role=student"
              className="px-8 py-4 rounded-xl bg-primary-accent hover:bg-primary text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              Start Mock Exam
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
            <Link
              href="/login?role=invigilator"
              className="px-8 py-4 rounded-xl border border-border-outline bg-surface-lowest hover:bg-surface text-on-surface font-semibold hover:border-primary-accent transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              View Invigilator Reports
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-24 w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Card 1 */}
          <div className="bg-surface-lowest border border-border-outline p-6 rounded-2xl group hover:border-primary-accent transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-surface-low flex items-center justify-center mb-5 text-primary-accent group-hover:bg-primary-accent group-hover:text-white transition-all">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-primary mb-2">Edge Gaze & Blink Tracking</h3>
            <p className="text-sm text-text-secondary leading-relaxed font-light">
              Computes Eye Aspect Ratio (EAR) and Gaze Ratio ($G_x$) locally at 30fps. Your video feed never leaves your device, guaranteeing absolute user privacy.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-lowest border border-border-outline p-6 rounded-2xl group hover:border-primary-accent transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-surface-low flex items-center justify-center mb-5 text-primary-accent group-hover:bg-primary-accent group-hover:text-white transition-all">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-primary mb-2">Cognitive Wellness Overlays</h3>
            <p className="text-sm text-text-secondary leading-relaxed font-light">
              Detects fatigue thresholds and blink bursts. Instead of terminating the exam, the system opens calming guided box-breathing prompts to help students refocus.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-lowest border border-border-outline p-6 rounded-2xl group hover:border-primary-accent transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-surface-low flex items-center justify-center mb-5 text-primary-accent group-hover:bg-primary-accent group-hover:text-white transition-all">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-primary mb-2">Tamper-Evident Logs</h3>
            <p className="text-sm text-text-secondary leading-relaxed font-light">
              Stores a secure, chronological ledger of environment markers (tab swaps, multiple faces, abnormal noise thresholds) to form an objective audit trail.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border-outline-variant bg-surface-low py-8 z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-text-secondary">
          <p>© 2026 MindGuard. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-primary-accent transition-colors cursor-pointer">Privacy First</span>
            <span>•</span>
            <span className="hover:text-primary-accent transition-colors cursor-pointer">Humane Proctoring</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

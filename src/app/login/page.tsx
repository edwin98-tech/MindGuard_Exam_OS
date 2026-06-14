"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, User, Key, Eye, EyeOff, AlertCircle, RefreshCw, CheckCircle2, GraduationCap, Settings, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Set default role based on query param (e.g. ?role=student)
  const initialRole = searchParams.get("role") === "invigilator" ? "invigilator" : "student";
  const [role, setRole] = useState<"student" | "invigilator">(initialRole);

  // Student form states
  const [studentId, setStudentId] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Invigilator form states
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear errors when toggling roles
  useEffect(() => {
    setError(null);
  }, [role]);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !dob.trim()) {
      setError("Roll Number and Password (DOB) are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rollNo: studentId.trim(),
          dob: dob.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setLoginSuccess(true);
        // Save student details to localStorage
        localStorage.setItem("mindguard_student_name", data.name);
        localStorage.setItem("mindguard_student_id", studentId.trim());
        localStorage.setItem("mindguard_role", "student");
        setTimeout(() => {
          router.push("/exam");
        }, 1200);
      } else {
        setError(data.error || "Authentication failed. Try Roll No 'CS-2026-001' and DOB '12042005'.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Database verification failed. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleInvigilatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) {
      setError("Passcode is required.");
      return;
    }

    setLoading(true);
    setError(null);

    // Simple hackathon demonstration auth: check passcode against '1234' or 'admin'
    setTimeout(() => {
      if (passcode === "1234" || passcode.toLowerCase() === "admin") {
        setLoginSuccess(true);
        localStorage.setItem("mindguard_role", "invigilator");
        localStorage.setItem("mindguard_admin_auth", "true");
        setTimeout(() => {
          router.push("/report");
        }, 1200);
      } else {
        setError("Invalid security passcode. Try '1234' for demo access.");
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-body-md text-on-background antialiased relative">
      {/* Branding */}
      <div className="mb-8 flex flex-col items-center justify-center z-10">
        <svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" className="w-60 h-auto">
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

      {/* Login Card Container */}
      <main className="w-full max-w-[440px] z-10">
        <div className="bg-surface-lowest border border-border-outline p-8 rounded-none transition-ease shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-primary mb-1">Welcome back</h2>
            <p className="text-on-surface-variant text-xs font-light">Select your portal to proceed to secure session.</p>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
              type="button"
              className={`flex flex-col items-center justify-center p-4 border transition-ease group cursor-pointer ${
                role === "student" 
                  ? "border-primary-accent bg-surface-low text-primary-accent font-bold" 
                  : "border-border-outline text-text-secondary hover:border-primary-accent"
              }`} 
              onClick={() => setRole("student")}
            >
              <GraduationCap className={`w-8 h-8 mb-2 shrink-0 ${
                role === "student" ? "text-primary-accent" : "text-text-secondary group-hover:text-primary-accent"
              }`} />
              <span className="text-xs font-medium">Student Portal</span>
            </button>
            <button 
              type="button"
              className={`flex flex-col items-center justify-center p-4 border transition-ease group cursor-pointer ${
                role === "invigilator" 
                  ? "border-primary-accent bg-surface-low text-primary-accent font-bold" 
                  : "border-border-outline text-text-secondary hover:border-primary-accent"
              }`} 
              onClick={() => setRole("invigilator")}
            >
              <Settings className={`w-8 h-8 mb-2 shrink-0 ${
                role === "invigilator" ? "text-primary-accent" : "text-text-secondary group-hover:text-primary-accent"
              }`} />
              <span className="text-xs font-medium">Invigilator Console</span>
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-2 mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={role === "student" ? handleStudentSubmit : handleInvigilatorSubmit}>
            {role === "student" ? (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="id-input">Student Roll Number</label>
                    <span className="text-[9px] text-text-secondary font-mono">Demo: CS-2026-001</span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">
                      <User className="w-4 h-4" />
                    </span>
                    <input 
                      className="w-full bg-transparent border border-border-outline pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-primary-accent focus:border-primary-accent text-sm transition-ease outline-none" 
                      id="id-input" 
                      placeholder="e.g. CS-2026-001" 
                      type="text"
                      required
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="password-input">Password (DOB)</label>
                    <span className="text-[9px] text-text-secondary font-mono">Demo: 12042005</span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">
                      <Key className="w-4 h-4" />
                    </span>
                    <input 
                      className="w-full bg-transparent border border-border-outline pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-primary-accent focus:border-primary-accent text-sm transition-ease outline-none" 
                      id="password-input" 
                      placeholder="DDMMYYYY" 
                      type="text"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="passcode-input">Security Passcode</label>
                  <span className="text-[9px] text-text-secondary font-mono">Demo: 1234</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">
                    <Key className="w-4 h-4" />
                  </span>
                  <input 
                    className="w-full bg-transparent border border-border-outline pl-10 pr-12 py-2.5 focus:ring-1 focus:ring-primary-accent focus:border-primary-accent text-sm transition-ease outline-none" 
                    id="passcode-input" 
                    placeholder="••••••••" 
                    type={showPasscode ? "text" : "password"}
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-primary-accent cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input 
                className="w-4 h-4 border-border-outline rounded-none text-primary-accent focus:ring-0 cursor-pointer" 
                id="remember" 
                type="checkbox"
              />
              <label className="text-xs text-on-surface-variant cursor-pointer select-none" htmlFor="remember">Keep this terminal authorized</label>
            </div>

            <button 
              className={`w-full text-white py-3 px-4 text-xs font-bold uppercase tracking-wider transition-ease flex items-center justify-center gap-2 mt-6 cursor-pointer ${
                loginSuccess 
                  ? "bg-emerald-600 hover:bg-emerald-700" 
                  : "bg-primary-accent hover:bg-primary"
              }`} 
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : loginSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Authorization Granted
                </>
              ) : (
                <>
                  Initialize Secure Link
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Meta */}
        <div className="mt-4 flex justify-between items-center px-1">
          <div className="flex items-center gap-1 text-on-surface-variant">
            <Shield className="w-3.5 h-3.5 text-primary-accent" />
            <span className="text-[10px] font-bold uppercase">System Status: Nominal</span>
          </div>
          <div className="flex gap-4">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase">v2.4.0-proctor</span>
          </div>
        </div>
      </main>

      {/* Decorative microprocessor card */}
      <div className="fixed bottom-10 right-10 opacity-20 pointer-events-none hidden md:block">
        <div className="w-48 h-48 border border-border-outline p-2 bg-white">
          <img 
            className="w-full h-full object-cover grayscale brightness-110" 
            alt="Hardware Microprocessor" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSwCJX5ezm1WtnJbhPdRp80SCVJAAwrImb0PTIRZkja5e4cYjIvLKulSP--IFvug53ZhBe5zLdeQlbeINsBfj7xM4zttZd53DbgLQdajdcFlPuYNYJuV2C6JRDF2ytmqhrg_EbrUO5Ravcx-cCStZx9T6DsO_Q3SMgqdhVOCf385146PWtRqPnFQ1sDXZPUyQZRcSpjj5XRxEBja-TV1v5Xuokqy2F6twzKFh0ZB3OJEURxcoq159cEAS-e7TQsRZ_afi2mDtl2wca"
          />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-primary flex items-center justify-center">
        <div className="animate-pulse text-xs font-bold text-primary-accent">Loading Portal...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

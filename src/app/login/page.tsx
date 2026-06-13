"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, User, Key, Eye, EyeOff, Brain, ChevronRight, AlertCircle, Cpu, RefreshCw } from "lucide-react";

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
        // Save student details to localStorage
        localStorage.setItem("mindguard_student_name", data.name);
        localStorage.setItem("mindguard_student_id", studentId.trim());
        localStorage.setItem("mindguard_role", "student");
        router.push("/exam");
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

    // Simple hackathon demonstration auth: check passcode against '1234' or 'admin'
    if (passcode === "1234" || passcode.toLowerCase() === "admin") {
      localStorage.setItem("mindguard_role", "invigilator");
      localStorage.setItem("mindguard_admin_auth", "true");
      router.push("/report");
    } else {
      setError("Invalid security passcode. Try '1234' for demo access.");
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 flex flex-col relative overflow-hidden w-full">
      {/* Background decoration */}
      <div className={`absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
        role === "student" ? "bg-cyan-500/10" : "bg-pink-500/10"
      }`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
        role === "student" ? "bg-cyan-500/5" : "bg-pink-500/5"
      }`} />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10 animate-fade-in">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-400 to-pink-500 flex items-center justify-center transition-transform group-hover:scale-105">
            <Shield className="w-4.5 h-4.5 text-gray-900 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">MindGuard Exam OS</h1>
            <p className="text-[9px] text-gray-500 font-mono">SECURE LOGIN PORTAL</p>
          </div>
        </Link>
      </header>

      {/* Main Form Section */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className={`w-full max-w-md glass-panel rounded-3xl p-8 border-cyan-500/10 transition-all duration-500 ${
          role === "student" ? "pulse-glow-cyan" : "pulse-glow-pink"
        }`}>
          
          {/* Tab Toggles */}
          <div className="flex bg-black/45 p-1 rounded-xl mb-8 border border-gray-900">
            <button
              onClick={() => setRole("student")}
              className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                role === "student"
                  ? "bg-cyan-500 text-gray-900 shadow-md shadow-cyan-500/10"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Student Portal
            </button>
            <button
              onClick={() => setRole("invigilator")}
              className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                role === "invigilator"
                  ? "bg-pink-500 text-gray-900 shadow-md shadow-pink-500/10"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Invigilator Console
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-white">
              {role === "student" ? "Welcome Student" : "Invigilator Sign In"}
            </h2>
            <p className="text-xs text-gray-400 font-light mt-1">
              {role === "student"
                ? "Enter your details to initiate camera calibration and commence the test."
                : "Authorize with security passcode to review diagnostics logs and AI reports."}
            </p>
          </div>

          {error && (
            <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 mb-6 border ${
              role === "student" 
                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" 
                : "bg-pink-500/10 border-pink-500/20 text-pink-400"
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Student Form */}
          {role === "student" && (
            <form onSubmit={handleStudentSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Student Roll Number</label>
                  <span className="text-[9px] text-gray-600 font-mono">Demo: CS-2026-001</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. CS-2026-001"
                    className="w-full pl-11 pr-4 py-3 bg-black/40 border border-gray-900 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Password (Date of Birth)</label>
                  <span className="text-[9px] text-gray-600 font-mono">Demo: 12042005</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    placeholder="DDMMYYYY"
                    className="w-full pl-11 pr-4 py-3 bg-black/40 border border-gray-900 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-extrabold text-xs hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    Verify & Proceed to Calibration
                    <ChevronRight className="w-4.5 h-4.5 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Invigilator Form */}
          {role === "invigilator" && (
            <form onSubmit={handleInvigilatorSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Security Passcode</label>
                  <span className="text-[9px] text-gray-600 font-mono">Demo: 1234</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type={showPasscode ? "text" : "password"}
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter security passcode..."
                    className="w-full pl-11 pr-12 py-3 bg-black/40 border border-gray-900 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-pink-400 text-gray-900 font-extrabold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-pink-500/10"
              >
                Authenticate & View Database
                <ChevronRight className="w-4.5 h-4.5 stroke-[2.5]" />
              </button>
            </form>
          )}

        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030712] text-gray-100 flex items-center justify-center">
        <div className="animate-pulse text-xs text-cyan-400">Loading Portal...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

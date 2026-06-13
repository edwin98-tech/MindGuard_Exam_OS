"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Shield, Camera, Mic, Play, ChevronLeft, ChevronRight, CheckCircle2, 
  AlertTriangle, RefreshCw, Eye, Smile, Activity, Heart, Clock, LogOut, Cpu 
} from "lucide-react";
import { useFaceMesh, FaceMeshTrackingResult } from "../../hooks/useFaceMesh";
import { calculateRiskScore, TelemetryMetrics } from "../../utils/formulas";

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

const EXAM_QUESTIONS: Question[] = [
  {
    id: 1,
    question: "Which of the following is a primary characteristic of an Edge AI agent?",
    options: [
      "It requires high-bandwidth server connections to process basic inputs.",
      "It executes machine learning inference locally on the client device.",
      "It stores all video streams on centralized databases.",
      "It is restricted only to text processing."
    ],
    correctAnswer: 1
  },
  {
    id: 2,
    question: "What does the Eye Aspect Ratio (EAR) measure in cognitive vision models?",
    options: [
      "The color intensity of the iris.",
      "The ratio of horizontal to vertical eye coordinates, indicating blink or fatigue state.",
      "The degree of pupil dilation relative to surrounding light.",
      "The horizontal angle of gaze deviation."
    ],
    correctAnswer: 1
  },
  {
    id: 3,
    question: "In Next.js 14 App Router, what is the default rendering paradigm for pages inside the app directory?",
    options: [
      "Client Components",
      "Server Components",
      "Static Site Generation only",
      "Server Side Rendering only"
    ],
    correctAnswer: 1
  },
  {
    id: 4,
    question: "What is the primary benefit of running a hybrid proctoring architecture?",
    options: [
      "Higher cloud hosting costs.",
      "Instant disqualification of students based on minor blinking.",
      "Zero-latency edge processing for fatigue filtering combined with cloud AI post-exam auditing.",
      "Requiring students to purchase dedicated hardware tracking rigs."
    ],
    correctAnswer: 2
  },
  {
    id: 5,
    question: "How does the Box Breathing technique assist students experiencing test anxiety?",
    options: [
      "It speeds up their reaction time.",
      "It activates the parasympathetic nervous system to lower heart rate and restore calm.",
      "It increases carbon dioxide levels to trigger alert states.",
      "It validates their answers to MCQ questions."
    ],
    correctAnswer: 1
  }
];

export default function ExamPage() {
  const router = useRouter();
  
  // Scaffolding Stages: "pre-check" | "active" | "wellness-intervention" | "finished"
  const [stage, setStage] = useState<"pre-check" | "active" | "wellness-intervention" | "finished">("pre-check");
  const stageRef = useRef(stage);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    const savedName = localStorage.getItem("mindguard_student_name");
    if (!savedName) {
      router.push("/login?role=student");
    }
  }, [router]);

  // Calibration status
  const [webcamAllowed, setWebcamAllowed] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationInstruction, setCalibrationInstruction] = useState("Grant webcam permissions to start.");

  // Audio/Mic status
  const [abnormalAudioSeconds, setAbnormalAudioSeconds] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  // Exam Answers & State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [examTimeRemaining, setExamTimeRemaining] = useState(600); // 10 minutes

  // Edge Telemetry logs & telemetry metric states
  const [telemetryLogs, setTelemetryLogs] = useState<{ timestamp: string; event: string; details: string; snapshot?: string }[]>([]);
  const [blinkCount, setBlinkCount] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [offScreenGazeSeconds, setOffScreenGazeSeconds] = useState(0);
  const [multipleFacesSeconds, setMultipleFacesSeconds] = useState(0);
  const [avgEAR, setAvgEAR] = useState(0.26);
  const [currentEAR, setCurrentEAR] = useState(0.26);
  const [currentGaze, setCurrentGaze] = useState(0.5);
  const [faceCount, setFaceCount] = useState(0);
  const [stressLevel, setStressLevel] = useState<"Low" | "Medium" | "High">("Low");
  const [fatigueScore, setFatigueScore] = useState(0); // 0-100%
  const [riskScore, setRiskScore] = useState(0);

  // New proctoring checks states
  const [isSlouching, setIsSlouching] = useState(false);
  const [isCameraFrozen, setIsCameraFrozen] = useState(false);

  // Box Breathing cycle states
  const [breathPhase, setBreathPhase] = useState<"In" | "Hold In" | "Out" | "Hold Out">("In");
  const [breathSecondsLeft, setBreathSecondsLeft] = useState(4);
  const [breathCyclesCompleted, setBreathCyclesCompleted] = useState(0);

  // Elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic values helper references to read in loop
  const earHistoryRef = useRef<number[]>([]);
  const blinkCooldownRef = useRef(false);

  // Helper to capture a compressed base64 frame thumbnail
  const captureBase64Snapshot = (): string | null => {
    if (!canvasRef.current) return null;
    try {
      const snapCanvas = document.createElement("canvas");
      snapCanvas.width = 160;
      snapCanvas.height = 120;
      const snapCtx = snapCanvas.getContext("2d");
      if (snapCtx) {
        snapCtx.drawImage(canvasRef.current, 0, 0, 160, 120);
        return snapCanvas.toDataURL("image/jpeg", 0.6); // 60% quality jpeg
      }
    } catch (err) {
      console.warn("Failed to capture snapshot:", err);
    }
    return null;
  };

  // Add event helper to list
  const addTelemetryLog = (event: string, details: string) => {
    const time = new Date().toLocaleTimeString();
    
    // Capture snapshot for severe violation events
    let snapshot: string | undefined = undefined;
    const isViolationEvent = 
      event === "security_alert" || 
      event === "gaze_deviation" || 
      event === "tab_switch" || 
      event === "fatigue_alert" ||
      event === "camera_freeze" ||
      event === "posture_deviation" ||
      event === "devtools_alert";

    if (isViolationEvent) {
      snapshot = captureBase64Snapshot() || undefined;
    }

    setTelemetryLogs(prev => [{ timestamp: time, event, details, snapshot }, ...prev]);
  };

  // FaceMesh event callback handler
  const handleTrackingUpdate = (result: FaceMeshTrackingResult) => {
    if (stageRef.current !== "active" && stageRef.current !== "wellness-intervention") return;

    setCurrentEAR(result.earAvg);
    setCurrentGaze(result.gazeAvg);
    setFaceCount(result.faceCount);

    // Track posture slouching
    setIsSlouching(prev => {
      if (result.isSlouching && !prev) {
        addTelemetryLog("posture_deviation", "Poor posture/slouching detected. Please sit up straight.");
      }
      return result.isSlouching;
    });

    // Track camera freezing
    setIsCameraFrozen(prev => {
      if (result.isFrozen && !prev) {
        addTelemetryLog("camera_freeze", "Warning: Video feed has frozen or is static.");
      }
      return result.isFrozen;
    });

    // Track multiple faces
    if (result.faceCount > 1) {
      setMultipleFacesSeconds(prev => {
        const nextVal = prev + 1;
        if (nextVal % 5 === 0) {
          addTelemetryLog("security_alert", `Multiple faces detected in frame (${result.faceCount} faces)`);
        }
        return nextVal;
      });
    }

    // Gaze tracking off-screen counting
    if (result.offScreenGazeCount > 20) { // ~20 frames of off-screen gaze
      setOffScreenGazeSeconds(prev => {
        const nextVal = prev + 1;
        if (nextVal % 5 === 0) {
          addTelemetryLog("gaze_deviation", `Off-screen gaze shift logged (${(result.gazeAvg).toFixed(2)})`);
        }
        return nextVal;
      });
    }

    // EAR history accumulation
    if (result.earAvg > 0) {
      earHistoryRef.current.push(result.earAvg);
      if (earHistoryRef.current.length > 300) earHistoryRef.current.shift(); // keep last 10s at 30fps
      
      const sum = earHistoryRef.current.reduce((a, b) => a + b, 0);
      setAvgEAR(sum / earHistoryRef.current.length);
    }

    // Blink detection
    if (result.isBlinking) {
      if (!blinkCooldownRef.current) {
        blinkCooldownRef.current = true;
        setBlinkCount(prev => {
          const nextBlink = prev + 1;
          
          // Fatigue detection logic: blink burst
          if (result.eyeClosedDurationMs > 1500) {
            addTelemetryLog("fatigue_alert", `Prolonged eyelid closure detected: ${(result.eyeClosedDurationMs/1000).toFixed(1)}s`);
            setFatigueScore(f => {
              const newFatigue = Math.min(f + 25, 100);
              if (newFatigue >= 70) {
                // Trigger box breathing automatically if fatigue spikes
                triggerWellnessIntervention("Severe drowsiness & ocular strain detected. Let's take a 16-second box breathing break.");
              }
              return newFatigue;
            });
          }
          return nextBlink;
        });
      }
    } else {
      blinkCooldownRef.current = false;
    }
  };

  // Connect to useFaceMesh hook
  const { isLoaded, error, startTracking, stopTracking } = useFaceMesh(
    videoRef,
    canvasRef,
    handleTrackingUpdate
  );

  // Trigger Guided Box Breathing
  const triggerWellnessIntervention = (reason: string) => {
    setStage("wellness-intervention");
    addTelemetryLog("wellness_nudge", reason);
    setBreathPhase("In");
    setBreathSecondsLeft(4);
    setBreathCyclesCompleted(0);
  };

  // TabShield security listeners (Visibility, DevTools, resizing)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && stageRef.current === "active") {
        setTabSwitches(prev => {
          const nextCount = prev + 1;
          addTelemetryLog("tab_switch", `Browser tab switched or window minimized (Violation count: ${nextCount})`);
          return nextCount;
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (stageRef.current !== "active") return;
      
      const isDevToolsKey = 
        e.key === "F12" || 
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C" || e.key === "i" || e.key === "j" || e.key === "c"));
         
      if (isDevToolsKey) {
        e.preventDefault();
        addTelemetryLog("devtools_alert", "Access to browser Developer Tools blocked.");
        alert("Warning: Developer Tools access is strictly prohibited during the exam.");
      }
    };

    const handleResize = () => {
      if (stageRef.current !== "active") return;
      addTelemetryLog("security_alert", `Browser window size changed to ${window.innerWidth}x${window.innerHeight}`);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Web Audio microphone level checking
  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 512;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkAudio = () => {
        if (stageRef.current !== "active") {
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // If environmental volume exceeds baseline noise
        if (average > 45) {
          setAbnormalAudioSeconds(prev => {
            const nextVal = prev + 1;
            if (nextVal % 5 === 0) {
              addTelemetryLog("abnormal_audio", `High volume environmental noise detected (${average.toFixed(1)} dB)`);
            }
            return nextVal;
          });
        }
        requestAnimationFrame(checkAudio);
      };
      checkAudio();
    } catch (err) {
      console.warn("Microphone access not granted or audio analysis failed.", err);
    }
  };

  // Update overall risk score dynamically based on formula.ts
  useEffect(() => {
    if (stage !== "active") return;
    const metrics: TelemetryMetrics = {
      tabSwitches,
      offScreenGaze: offScreenGazeSeconds,
      multipleFaces: multipleFacesSeconds,
      abnormalAudio: abnormalAudioSeconds,
    };
    const computed = calculateRiskScore(metrics);
    setRiskScore(computed);

    // Compute stress indicators
    if (computed > 0.5) {
      setStressLevel("High");
    } else if (computed > 0.2 || blinkCount > 35) {
      setStressLevel("Medium");
    } else {
      setStressLevel("Low");
    }
  }, [tabSwitches, offScreenGazeSeconds, multipleFacesSeconds, abnormalAudioSeconds, blinkCount, stage]);

  // Exam remaining timer loop
  useEffect(() => {
    if (stage !== "active") return;

    const timerInterval = setInterval(() => {
      setExamTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [stage]);

  // Guided box breathing countdown loop
  useEffect(() => {
    if (stage !== "wellness-intervention") return;

    const breatheInterval = setInterval(() => {
      setBreathSecondsLeft(prev => {
        if (prev <= 1) {
          // Progress phase
          setBreathPhase(currentPhase => {
            if (currentPhase === "In") {
              return "Hold In";
            } else if (currentPhase === "Hold In") {
              return "Out";
            } else if (currentPhase === "Out") {
              return "Hold Out";
            } else {
              setBreathCyclesCompleted(cycles => {
                const nextCycles = cycles + 1;
                if (nextCycles >= 1) {
                  // End breathing after 1 full cycle (16 seconds)
                  setTimeout(() => {
                    setStage("active");
                    addTelemetryLog("wellness_nudge", "Wellness pause finished. Returning to test.");
                  }, 1000);
                }
                return nextCycles;
              });
              return "In";
            }
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(breatheInterval);
  }, [stage]);

  // Run Calibration pre-check loop
  const handleStartCalibration = async () => {
    if (!isLoaded) return;
    setIsCalibrating(true);
    setCalibrationProgress(5);
    setCalibrationInstruction("Connecting to webcam feed...");

    try {
      await startTracking();
      setWebcamAllowed(true);
      
      const steps = [
        { progress: 20, text: "Look straight at the screen..." },
        { progress: 50, text: "Look left..." },
        { progress: 80, text: "Look right..." },
        { progress: 100, text: "Calibration successfully finished!" }
      ];

      for (const step of steps) {
        await new Promise(r => setTimeout(r, 1200));
        setCalibrationProgress(step.progress);
        setCalibrationInstruction(step.text);
      }

      setIsCalibrating(false);
    } catch (err) {
      setIsCalibrating(false);
      setCalibrationInstruction("Calibration failed. Check permissions.");
    }
  };

  // Start the actual examination
  const handleBeginExam = () => {
    setStage("active");
    addTelemetryLog("exam_start", "Student commenced the exam session.");
    startAudioAnalysis();
  };

  // End and submit exam
  const handleSubmitExam = () => {
    // Stop camera and microphone
    stopTracking();
    if (audioStream) {
      audioStream.getTracks().forEach(t => t.stop());
    }

    setStage("finished");
    
    // Save telemetry logs and final parameters to LocalStorage
    const finalMetrics = {
      totalExamDurationSeconds: 600 - examTimeRemaining,
      tabSwitches,
      offScreenGazeSeconds,
      multipleFacesSeconds,
      abnormalAudioSeconds,
      totalBlinks: blinkCount,
      avgEAR,
      finalRiskScore: riskScore
    };

    localStorage.setItem("mindguard_timeline", JSON.stringify(telemetryLogs));
    localStorage.setItem("mindguard_metrics", JSON.stringify(finalMetrics));
    
    const sessionId = "MG-" + Date.now();
    localStorage.setItem("mindguard_session_id", sessionId);

    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sessionId,
        studentName: localStorage.getItem("mindguard_student_name") || "Anonymous Student",
        metrics: finalMetrics,
        timeline: telemetryLogs
      })
    }).catch(err => console.error("Failed to save to database", err));

    router.push("/report");
  };

  const handleSimulateDemoMode = () => {
    stopTracking();
    if (audioStream) {
      audioStream.getTracks().forEach(t => t.stop());
    }

    const simulatedMetrics = {
      totalExamDurationSeconds: 480,
      tabSwitches: 3,
      offScreenGazeSeconds: 28,
      multipleFacesSeconds: 5,
      abnormalAudioSeconds: 12,
      totalBlinks: 72,
      avgEAR: 0.218,
      finalRiskScore: 0.655,
    };

    const simulatedTimeline = [
      { timestamp: "12:05:00 PM", event: "exam_start", details: "Student commenced the exam session." },
      { timestamp: "12:06:12 PM", event: "gaze_deviation", details: "Off-screen gaze shift logged (0.28)" },
      { timestamp: "12:07:34 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 1)" },
      { timestamp: "12:08:45 PM", event: "abnormal_audio", details: "High volume environmental noise detected (52.3 dB)" },
      { timestamp: "12:09:12 PM", event: "fatigue_alert", details: "Prolonged eyelid closure detected: 2.1s" },
      { timestamp: "12:09:13 PM", event: "wellness_nudge", details: "Severe drowsiness & ocular strain detected. Let's take a 16-second box breathing break." },
      { timestamp: "12:09:29 PM", event: "wellness_nudge", details: "Wellness pause finished. Returning to test." },
      { timestamp: "12:10:44 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 2)" },
      { timestamp: "12:11:05 PM", event: "security_alert", details: "Multiple faces detected in frame (2 faces)" },
      { timestamp: "12:12:10 PM", event: "tab_switch", details: "Browser tab switched or window minimized (Violation count: 3)" },
      { timestamp: "12:13:00 PM", event: "gaze_deviation", details: "Off-screen gaze shift logged (0.33)" },
    ];

    localStorage.setItem("mindguard_timeline", JSON.stringify(simulatedTimeline));
    localStorage.setItem("mindguard_metrics", JSON.stringify(simulatedMetrics));
    
    const sessionId = "MG-SIM-" + Date.now();
    localStorage.setItem("mindguard_session_id", sessionId);

    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sessionId,
        studentName: "Taylor Chen (Simulated Demo)",
        metrics: simulatedMetrics,
        timeline: simulatedTimeline
      })
    }).catch(err => console.error("Failed to save simulation to database", err));

    router.push("/report");
  };

  // Progress UI helpers
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 flex flex-col relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="w-full border-b border-gray-900 bg-gray-950/70 backdrop-blur-md px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-pink-500 flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-gray-900 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-md font-bold text-white tracking-tight">MindGuard Exam OS</h1>
            <p className="text-[9px] text-gray-500 font-mono">ACTIVE ENVIRONMENT MANAGER</p>
          </div>
        </div>

        {stage === "active" && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs font-mono font-medium">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>TIME LEFT: </span>
              <span className="text-cyan-400 font-bold text-sm w-12 text-right">{formatTime(examTimeRemaining)}</span>
            </div>
            <button
              onClick={handleSubmitExam}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-bold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Submit Exam
            </button>
          </div>
        )}
      </header>

      {/* Main stage panels */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col z-10 overflow-hidden">
        {/* PRE-CHECK DIAGNOSTICS */}
        {stage === "pre-check" && (
          <div className="max-w-2xl mx-auto w-full glass-panel rounded-3xl p-8 border-cyan-500/20 my-auto">
            <h2 className="text-2xl font-extrabold text-white mb-2 flex items-center gap-2">
              <Camera className="w-6 h-6 text-cyan-400" />
              Pre-Exam Environment Verification
            </h2>
            <p className="text-sm text-gray-400 font-light mb-6">
              Before commencing the exam, the edge proctor needs to calibrate your camera stream. 
              This is processed 100% client-side inside your browser for total privacy.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-8">
              <div className="relative aspect-video rounded-2xl bg-black border border-gray-800 overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  width="640"
                  height="480"
                  className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                />
                {!webcamAllowed && (
                  <div className="absolute inset-0 bg-gray-950/90 flex flex-col items-center justify-center p-4 text-center">
                    <Camera className="w-10 h-10 text-gray-600 mb-3" />
                    <p className="text-xs text-gray-400">Webcam stream inactive</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
                  <span className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">Calibration Progress</span>
                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-2">
                    <div 
                      className="bg-cyan-400 h-full transition-all duration-500" 
                      style={{ width: `${calibrationProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-300 font-medium">{calibrationInstruction}</p>
                </div>

              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs flex items-start gap-3 mb-6">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-4 border-t border-gray-900 pt-6">
              {calibrationProgress < 100 ? (
                <>
                  <button
                    onClick={handleSimulateDemoMode}
                    className="px-6 py-3 rounded-xl border border-pink-500/30 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Cpu className="w-4 h-4 text-pink-400" />
                    Simulate Demo Mode
                  </button>
                  <button
                    onClick={handleStartCalibration}
                    disabled={isCalibrating || !isLoaded}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-bold text-sm hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center gap-2 cursor-pointer"
                  >
                  {isCalibrating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Calibrating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 stroke-[2.5]" />
                      Allow & Calibrate Camera
                    </>
                  )}
                </button>
              </>
            ) : (
                <button
                  onClick={handleBeginExam}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-extrabold text-sm hover:scale-[1.02] transition-all flex items-center gap-2 glow-cyan"
                >
                  Start Examination
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ACTIVE EXAMINATION PORTAL */}
        {stage === "active" && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch overflow-hidden">
            {/* Left Column: Exam Test Panel */}
            <div className="lg:col-span-8 flex flex-col justify-between glass-panel rounded-3xl p-6 md:p-8 border-cyan-500/10 h-full">
              <div>
                {/* Question index */}
                <div className="flex justify-between items-center border-b border-gray-900 pb-4 mb-6">
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    Question {currentQuestionIdx + 1} of {EXAM_QUESTIONS.length}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 font-semibold font-mono uppercase">
                    Core CS Concept
                  </span>
                </div>

                {/* Active Question */}
                <h3 className="text-lg md:text-xl font-bold text-white leading-relaxed mb-6">
                  {EXAM_QUESTIONS[currentQuestionIdx].question}
                </h3>

                {/* Options list */}
                <div className="space-y-4">
                  {EXAM_QUESTIONS[currentQuestionIdx].options.map((option, idx) => {
                    const isSelected = selectedAnswers[EXAM_QUESTIONS[currentQuestionIdx].id] === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedAnswers(prev => ({
                          ...prev,
                          [EXAM_QUESTIONS[currentQuestionIdx].id]: idx
                        }))}
                        className={`w-full text-left p-5 rounded-xl border text-sm transition-all flex items-center gap-4 group ${
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500 text-white font-medium shadow-lg shadow-cyan-500/5"
                            : "bg-gray-900/40 border-gray-800 text-gray-400 hover:border-gray-700 hover:bg-gray-900/60 hover:text-gray-200"
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-mono font-bold transition-all ${
                          isSelected
                            ? "bg-cyan-400 border-cyan-400 text-gray-900"
                            : "border-gray-800 text-gray-500 group-hover:border-gray-600"
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Nav */}
              <div className="flex justify-between items-center border-t border-gray-900 pt-6 mt-8">
                <button
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                  className="px-4 py-2.5 rounded-xl border border-gray-800 bg-gray-900/40 text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-gray-900/40 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex gap-2">
                  {EXAM_QUESTIONS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentQuestionIdx 
                          ? "bg-cyan-400 w-4" 
                          : selectedAnswers[EXAM_QUESTIONS[idx].id] !== undefined
                            ? "bg-cyan-800"
                            : "bg-gray-800"
                      }`}
                    />
                  ))}
                </div>

                {currentQuestionIdx < EXAM_QUESTIONS.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                    className="px-5 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 hover:text-white hover:border-gray-700 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitExam}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 font-extrabold transition-all flex items-center gap-2 glow-cyan"
                  >
                    Submit Exam
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: MindGuard Proctor Panel */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Webcam Video canvas */}
              <div className="glass-panel rounded-3xl p-4 border-cyan-500/10 relative overflow-hidden flex flex-col">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  Edge Face-Mesh Stream
                </span>
                
                <div className="relative aspect-video rounded-2xl bg-black border border-gray-900 overflow-hidden">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                    playsInline
                    muted
                  />
                  <canvas
                    ref={canvasRef}
                    width="640"
                    height="480"
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              </div>

              {/* Edge Telemetry Indicators */}
              <div className="glass-panel rounded-3xl p-5 border-cyan-500/10 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-900 pb-2 mb-4">
                    Cognitive Telemetry Logs
                  </h4>

                  <div className="space-y-4">
                    {/* Attention indicator */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Gaze Tracking:</span>
                      {currentGaze < 0.35 || currentGaze > 0.65 ? (
                        <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 font-bold font-mono">GAZE SHIFTED</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold font-mono">CENTERED</span>
                      )}
                    </div>

                    {/* Eye aspect ratio meter */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Eye Aspect Ratio (EAR):</span>
                        <span className="font-mono text-gray-300 font-semibold">{currentEAR.toFixed(3)}</span>
                      </div>
                      <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${currentEAR < 0.18 ? "bg-secondary" : "bg-primary"}`}
                          style={{ width: `${Math.min((currentEAR / 0.3) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Total blink count */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Blink Count:</span>
                      <span className="font-mono text-cyan-400 font-bold text-sm">{blinkCount}</span>
                    </div>

                    {/* Stress Level */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Stress Indicator:</span>
                      <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] ${
                        stressLevel === "High" 
                          ? "bg-pink-500/10 text-pink-500" 
                          : stressLevel === "Medium"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-cyan-500/10 text-cyan-400"
                      }`}>
                        {stressLevel}
                      </span>
                    </div>

                    {/* Fatigue Score */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">Exhaustion Factor:</span>
                        <span className={`font-mono font-bold ${fatigueScore > 60 ? "text-pink-500" : "text-gray-300"}`}>{fatigueScore}%</span>
                      </div>
                      <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-pink-500 h-full transition-all duration-300"
                          style={{ width: `${fatigueScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Posture Status */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Posture Check:</span>
                      {isSlouching ? (
                        <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-500 font-bold font-mono">SLOUCHING</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold font-mono">OPTIMAL</span>
                      )}
                    </div>

                    {/* Camera Stream Status */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Camera Feed:</span>
                      {isCameraFrozen ? (
                        <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-500 font-bold font-mono animate-pulse">STREAM FROZEN</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold font-mono">ACTIVE</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Risk score gauge */}
                <div className="border-t border-gray-900 pt-4 mt-4">
                  <div className="flex justify-between items-center mb-1 text-xs">
                    <span className="text-gray-500 font-bold uppercase tracking-wider">Humane Risk Index:</span>
                    <span className={`font-mono font-extrabold text-sm ${
                      riskScore > 0.6 
                        ? "text-pink-500" 
                        : riskScore > 0.3 
                          ? "text-yellow-500" 
                          : "text-cyan-400"
                    }`}>
                      {(riskScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-950 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        riskScore > 0.6 
                          ? "bg-secondary" 
                          : riskScore > 0.3 
                            ? "bg-yellow-500" 
                            : "bg-primary"
                      }`}
                      style={{ width: `${riskScore * 100}%` }}
                    />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => triggerWellnessIntervention("Student requested a voluntary stress reset interval.")}
                      className="w-full py-2 rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-900 hover:border-pink-500/30 hover:text-pink-400 text-xs font-semibold text-gray-400 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current text-pink-500" />
                      Take Calming Break
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WELLNESS INTERVENTION MODAL */}
        {stage === "wellness-intervention" && (
          <div className="max-w-md mx-auto w-full glass-panel rounded-3xl p-8 border-pink-500/20 text-center my-auto pulse-glow-pink">
            <Heart className="w-12 h-12 text-pink-500 mx-auto fill-pink-500/20 animate-pulse mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Refocus & Breathe</h2>
            <p className="text-xs text-gray-400 font-light mb-6">
              Cognitive overload triggers mistakes. Your exam progress is temporarily paused. 
              Follow the guided box-breathing cycle to activate calm.
            </p>

            {/* Circular breathing prompt */}
            <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div 
                className={`absolute inset-2 border-2 border-pink-500/30 rounded-full transition-all duration-1000 ${
                  breathPhase === "In" 
                    ? "scale-105 border-pink-500" 
                    : breathPhase === "Hold In"
                      ? "scale-110 border-pink-400"
                      : breathPhase === "Out"
                        ? "scale-95 border-pink-500/30"
                        : "scale-90 border-pink-500/10"
                }`}
              />
              
              {/* Inner core */}
              <div className="w-36 h-36 rounded-full bg-gray-950 border border-gray-900 flex flex-col items-center justify-center">
                <span className="text-[10px] text-pink-400 uppercase tracking-widest font-bold font-mono">
                  {breathPhase}
                </span>
                <span className="text-4xl font-extrabold text-white my-1 font-mono">
                  {breathSecondsLeft}s
                </span>
                <span className="text-[9px] text-gray-500">
                  Cycle {breathCyclesCompleted}/1
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setStage("active");
                addTelemetryLog("wellness_nudge", "Student bypassed wellness interval.");
              }}
              className="px-6 py-2.5 rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-900 hover:border-gray-700 text-xs text-gray-300 font-semibold transition-all w-full"
            >
              Resume Examination
            </button>
          </div>
        )}
      </div>

      {/* Realtime Event Monitor Logs console drawer */}
      {stage === "active" && (
        <div className="w-full border-t border-gray-900 bg-gray-950/60 py-3 px-6 z-10">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1.5 uppercase font-bold shrink-0">
              <Smile className="w-3.5 h-3.5 text-cyan-400" />
              Event Ledger:
            </span>
            <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-6 text-[10px] font-mono text-gray-400">
              {telemetryLogs.length === 0 ? (
                <span>No anomalies logged. Secure integrity layer active.</span>
              ) : (
                telemetryLogs.slice(0, 4).map((log, i) => (
                  <span key={i} className="flex gap-1.5 items-center">
                    <span className="text-gray-600 font-semibold">[{log.timestamp}]</span>
                    <span className={`font-bold ${
                      log.event === "security_alert" 
                        ? "text-pink-400" 
                        : log.event === "gaze_deviation" || log.event === "tab_switch"
                          ? "text-yellow-500"
                          : "text-cyan-400"
                    }`}>{log.event.toUpperCase()}</span>
                    <span className="text-gray-500">({log.details})</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

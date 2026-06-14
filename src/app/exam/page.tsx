"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, Camera, Mic, Play, ChevronLeft, ChevronRight, CheckCircle2, 
  AlertTriangle, RefreshCw, Eye, Smile, Activity, Heart, Clock, LogOut, Cpu 
} from "lucide-react";
import { useFaceMesh, FaceMeshTrackingResult } from "../../hooks/useFaceMesh";
import { calculateRiskScore, TelemetryMetrics } from "../../utils/formulas";
import { supabase } from "../../utils/supabaseClient";

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

  // Interactive Calibration steps (Option 3)
  const [calibrationStep, setCalibrationStep] = useState<number>(1);
  const [step1Passed, setStep1Passed] = useState(false);
  const [step2Passed, setStep2Passed] = useState(false);
  const [step3Passed, setStep3Passed] = useState(false);
  const [calibratedBaselineEAR, setCalibratedBaselineEAR] = useState<number | null>(null);
  const [calibratedBaselinePosture, setCalibratedBaselinePosture] = useState<number | null>(null);

  const calibrationStepRef = useRef<number>(1);
  const step1CenterFramesRef = useRef<number>(0);
  const step2EarValuesRef = useRef<number[]>([]);
  const step3PostureValuesRef = useRef<number[]>([]);

  // Proctor alert message state (Option 5)
  const [proctorAlert, setProctorAlert] = useState<{ message: string; timestamp: string } | null>(null);

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

  const isStressAdapted = fatigueScore >= 50 || stressLevel === "High";

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
  // Throttle display state updates: only push to React state every 3 frames (~10fps)
  const frameThrottleRef = useRef(0);

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
    if (stageRef.current === "pre-check") {
      if (!isCalibrating) return;

      if (calibrationStepRef.current === 1) {
        setCalibrationInstruction("Center your face inside the targeting ring...");
        if (result.faceCount >= 1) {
          step1CenterFramesRef.current += 1;
          setCalibrationProgress(Math.min(10 + Math.round((step1CenterFramesRef.current / 10) * 25), 35));
          if (step1CenterFramesRef.current >= 10) { // ~0.3 seconds at 30fps
            setStep1Passed(true);
            calibrationStepRef.current = 2;
            setCalibrationStep(2);
            setCalibrationInstruction("Blink pattern calibration: Keep looking at the screen...");
          }
        }
      } else if (calibrationStepRef.current === 2) {
        if (result.faceCount >= 1) {
          step2EarValuesRef.current.push(result.earAvg);
          const progressPercent = Math.min(35 + Math.round((step2EarValuesRef.current.length / 20) * 35), 70);
          setCalibrationProgress(progressPercent);
          if (step2EarValuesRef.current.length >= 20) { // ~0.6 seconds
            const averageEAR = step2EarValuesRef.current.reduce((a, b) => a + b, 0) / step2EarValuesRef.current.length;
            setCalibratedBaselineEAR(averageEAR);
            setStep2Passed(true);
            calibrationStepRef.current = 3;
            setCalibrationStep(3);
            setCalibrationInstruction("Posture baseline calibration: Sit straight and look at the camera...");
          }
        }
      } else if (calibrationStepRef.current === 3) {
        if (result.faceCount >= 1 && result.noseY !== undefined) {
          step3PostureValuesRef.current.push(result.noseY);
          const progressPercent = Math.min(70 + Math.round((step3PostureValuesRef.current.length / 10) * 30), 100);
          setCalibrationProgress(progressPercent);
          if (step3PostureValuesRef.current.length >= 10) { // ~0.3 seconds
            const averagePosture = step3PostureValuesRef.current.reduce((a, b) => a + b, 0) / step3PostureValuesRef.current.length;
            setCalibratedBaselinePosture(averagePosture);
            setStep3Passed(true);
            calibrationStepRef.current = 4;
            setCalibrationStep(4);
            setIsCalibrating(false);
            setCalibrationInstruction("Calibration completed! You are ready to start the exam.");
            setCalibrationProgress(100);
          }
        }
      }
      return;
    }


    if (stageRef.current !== "active" && stageRef.current !== "wellness-intervention") return;

    // Throttle display-only state updates to every 3 frames to prevent re-render flooding
    frameThrottleRef.current += 1;
    const shouldUpdateDisplay = frameThrottleRef.current % 3 === 0;

    if (shouldUpdateDisplay) {
      setCurrentEAR(result.earAvg);
      setCurrentGaze(result.gazeAvg);
      setFaceCount(result.faceCount);
    }

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
      if (earHistoryRef.current.length > 300) earHistoryRef.current.shift();
      if (shouldUpdateDisplay) {
        const sum = earHistoryRef.current.reduce((a, b) => a + b, 0);
        setAvgEAR(sum / earHistoryRef.current.length);
      }
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

  // Setup proctor real-time messaging listeners (Supabase Broadcast + localStorage sync)
  useEffect(() => {
    if (stage !== "active") return;

    const handleIncomingAlert = (message: string) => {
      const time = new Date().toLocaleTimeString();
      setProctorAlert({ message, timestamp: time });
      addTelemetryLog("proctor_intervention", `Message from Proctor: "${message}"`);
      
      // Clear notification after 10s
      setTimeout(() => {
        setProctorAlert(prev => {
          if (prev && prev.message === message) return null;
          return prev;
        });
      }, 10000);
    };

    // 1. Supabase Broadcast Channel subscription
    let channel: any = null;
    if (supabase) {
      channel = supabase
        .channel("proctor-alerts")
        .on("broadcast", { event: "alert" }, ({ payload }) => {
          console.log("Proctor broadcast alert received:", payload);
          if (payload && payload.message) {
            handleIncomingAlert(payload.message);
          }
        })
        .subscribe();
    }

    // 2. Storage event fallback
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "mindguard_proctor_alert" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.message) {
            handleIncomingAlert(parsed.message);
          }
        } catch (err) {
          console.error("Failed to parse proctor alert from local storage:", err);
        }
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [stage]);

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
    setIsCalibrating(true);
    setCalibrationProgress(5);
    setCalibrationInstruction("Requesting webcam access...");

    // Step 1: Request camera permission IMMEDIATELY — do not wait for MediaPipe
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play().catch(() => {});
      }
      setWebcamAllowed(true);
      setCalibrationProgress(10);
      setCalibrationInstruction("Webcam connected. Position your face in the center of the targeting ring...");
    } catch (err) {
      setIsCalibrating(false);
      setCalibrationInstruction("Camera permission denied. Please allow webcam access and try again.");
      return;
    }

    // Step 2: If MediaPipe is already loaded, start face tracking immediately
    if (isLoaded) {
      try {
        await startTracking();
      } catch (err) {
        console.warn("startTracking failed, live feed is still showing:", err);
      }
    } else {
      // MediaPipe is still loading — it will be ready shortly
      // The video feed is already live. We poll until isLoaded becomes true.
      setCalibrationInstruction("Loading AI face detection modules... (webcam is live)");
      const waitForMediaPipe = async () => {
        let attempts = 0;
        const maxAttempts = 30; // wait up to ~15 seconds
        while (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 500));
          attempts++;
          if (window.FaceMesh && window.Camera) {
            try {
              await startTracking();
              setCalibrationInstruction("AI face detection active. Position your face in the ring...");
            } catch (err) {
              console.warn("startTracking after wait failed:", err);
            }
            return;
          }
        }
        setCalibrationInstruction("AI modules unavailable — using webcam-only mode.");
      };
      waitForMediaPipe();
    }
  };

  // Manually advance calibration step on button click
  const handleManualCapture = () => {
    if (!isCalibrating || calibrationStepRef.current >= 4) return;
    const step = calibrationStepRef.current;

    if (step === 1) {
      setStep1Passed(true);
      calibrationStepRef.current = 2;
      setCalibrationStep(2);
      setCalibrationProgress(35);
      setCalibrationInstruction("Blink pattern calibration: Keep looking at the screen...");
    } else if (step === 2) {
      const earVals = step2EarValuesRef.current;
      const avg = earVals.length > 0 ? earVals.reduce((a, b) => a + b, 0) / earVals.length : 0.25;
      setCalibratedBaselineEAR(avg);
      setStep2Passed(true);
      calibrationStepRef.current = 3;
      setCalibrationStep(3);
      setCalibrationProgress(70);
      setCalibrationInstruction("Posture baseline: Sit straight and look at the camera...");
    } else if (step === 3) {
      const postureVals = step3PostureValuesRef.current;
      const avg = postureVals.length > 0 ? postureVals.reduce((a, b) => a + b, 0) / postureVals.length : 0.5;
      setCalibratedBaselinePosture(avg);
      setStep3Passed(true);
      calibrationStepRef.current = 4;
      setCalibrationStep(4);
      setIsCalibrating(false);
      setCalibrationProgress(100);
      setCalibrationInstruction("Calibration completed! You are ready to start the exam.");
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
    <div className={`min-h-screen bg-background text-on-surface flex flex-col relative overflow-hidden transition-all duration-700 ${
      stage !== "pre-check" && isStressAdapted ? "stress-adapted" : ""
    }`}>
      {/* Link Material symbols */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-surface border-b border-border-outline-variant transition-ease">
        <div className="flex items-center gap-4">
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
          {stage !== "pre-check" && isStressAdapted && (
            <div className="px-3 py-1 bg-green-100 text-emerald-800 rounded-full border border-green-200 flex items-center gap-1.5 animate-pulse">
              <span className="material-symbols-outlined text-[14px]">psychology</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">ADAPTIVE VIEW ACTIVE</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-6">
          {stage === "active" && (
            <div className="flex items-center gap-1.5 bg-surface-low px-3 py-1.5 border border-border-outline-variant rounded-lg">
              <span className="material-symbols-outlined text-primary text-[20px]">timer</span>
              <span className="font-mono text-sm font-bold text-primary timer-glow" id="exam-timer">{formatTime(examTimeRemaining)}</span>
            </div>
          )}
          {stage === "active" && (
            <button 
              onClick={handleSubmitExam} 
              className="px-4 py-2 bg-primary-accent hover:bg-primary text-white text-xs font-bold uppercase tracking-wider transition-ease cursor-pointer"
            >
              Submit Exam
            </button>
          )}
        </div>
      </header>

      {/* SideNavBar (Left) */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 z-40 flex flex-col p-4 bg-surface-container border-r border-border-outline-variant transition-ease hidden md:flex">
        <div className="mb-6 p-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold">ST</div>
          <div>
            <p className="text-xs font-bold text-on-surface">Candidate Portal</p>
            <p className="text-[10px] text-text-secondary">Proctor Mode Enabled</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 p-3 bg-secondary-container text-on-secondary-container font-bold rounded-lg border border-border-outline-variant">
            <span className="material-symbols-outlined">quiz</span>
            <span className="text-xs">Exams Portal</span>
          </div>
        </nav>
        
        {/* Simple proctor feed placeholder to preserve sidebar space */}
        {webcamAllowed && (
          <div className="mt-auto p-3 bg-surface-lowest rounded-xl border border-border-outline-variant flex flex-col items-center justify-center h-28 text-center">
            <span className="text-[10px] text-primary-accent font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Live Biometrics
            </span>
            <p className="text-[9px] text-text-secondary font-light leading-snug">Proctor feed overlay active on desktop</p>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-64 md:mr-80 pt-16 min-h-[calc(100vh-64px)] flex flex-col items-center relative transition-ease overflow-y-auto">
        {/* Wellness Guided Box Breathing Overlay */}
        {stage === "wellness-intervention" && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-45 flex items-center justify-center p-6 rounded-3xl border border-emerald-500/20">
            <div className="max-w-md w-full text-center">
              <Heart className="w-12 h-12 text-emerald-600 mx-auto fill-emerald-600/10 animate-pulse mb-4" />
              <h2 className="text-xl font-bold text-primary mb-2">Refocus & Breathe</h2>
              <p className="text-xs text-text-secondary font-light mb-6">
                Cognitive overload triggers mistakes. Your exam progress is temporarily paused. 
                Follow the guided box-breathing cycle to activate calm.
              </p>

              {/* Circular breathing prompt */}
              <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
                <div 
                  className={`absolute inset-2 border-2 rounded-full transition-all duration-1000 ${
                    breathPhase === "In" 
                      ? "scale-105 border-emerald-500" 
                      : breathPhase === "Hold In"
                        ? "scale-110 border-emerald-400"
                        : breathPhase === "Out"
                          ? "scale-95 border-emerald-500/30"
                          : "scale-90 border-emerald-500/10"
                  }`}
                />
                
                <div className="w-36 h-36 rounded-full bg-surface-lowest border border-border-outline flex flex-col items-center justify-center">
                  <span className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold font-mono">
                    {breathPhase}
                  </span>
                  <span className="text-4xl font-extrabold text-primary my-1 font-mono">
                    {breathSecondsLeft}s
                  </span>
                  <span className="text-[9px] text-text-secondary">
                    Cycle {breathCyclesCompleted}/1
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setStage("active");
                  addTelemetryLog("wellness_nudge", "Student bypassed wellness interval.");
                }}
                className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all cursor-pointer shadow-md"
              >
                Resume Examination
              </button>
            </div>
          </div>
        )}

        <div className="w-full max-w-4xl p-8 flex-1 flex flex-col justify-between">
          {/* Proctor Alert Toast (Option 5) */}
          {proctorAlert && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start justify-between gap-3 animate-bounce shadow-md print:hidden">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-amber-600 flex-shrink-0 animate-pulse">chat_bubble</span>
                <div>
                  <p className="font-bold uppercase tracking-wider text-[10px] text-amber-700">Message from Proctor ({proctorAlert.timestamp})</p>
                  <p className="mt-0.5 leading-relaxed text-sm font-medium">{proctorAlert.message}</p>
                </div>
              </div>
              <button 
                onClick={() => setProctorAlert(null)}
                className="text-amber-500 hover:text-amber-700 text-xs font-bold uppercase shrink-0 ml-4 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {stage === "pre-check" ? (
            <div className="flex flex-col justify-between h-full max-w-2xl mx-auto py-12 relative">
              <div>
                <h2 className="text-2xl font-extrabold text-primary mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[28px] text-primary-accent">camera</span>
                  Pre-Exam Environment Verification
                </h2>
                <p className="text-sm text-text-secondary font-light mb-6">
                  Before commencing the exam, the edge proctor needs to calibrate your camera stream. 
                  This is processed 100% client-side inside your browser for total privacy.
                </p>

                {/* Vertical spacer for centered webcam target overlay */}
                {webcamAllowed && (
                  <div className="h-[200px] sm:h-[290px] w-full" />
                )}

                <div className="space-y-6">
                  <div className="p-5 bg-surface-lowest border border-border-outline space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Calibration Progress</span>
                      <span className="text-xs font-mono font-bold text-primary-accent">{calibrationProgress}%</span>
                    </div>
                    <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary-accent h-full transition-all duration-300" 
                        style={{ width: `${calibrationProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-on-surface font-medium">{calibrationInstruction}</p>

                    {/* Step-by-Step checklist (Option 3) */}
                    {webcamAllowed && (
                      <div className="border-t border-border-outline-variant pt-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          {step1Passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <div className={`w-4 h-4 rounded-full border-2 ${calibrationStep === 1 ? "border-primary-accent animate-pulse" : "border-border-outline"} shrink-0`} />
                          )}
                          <span className={`${calibrationStep === 1 ? "font-bold text-primary" : "text-text-secondary"}`}>
                            Step 1: Center your face inside the targeting ring
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {step2Passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <div className={`w-4 h-4 rounded-full border-2 ${calibrationStep === 2 ? "border-primary-accent animate-pulse" : "border-border-outline"} shrink-0`} />
                          )}
                          <span className={`${calibrationStep === 2 ? "font-bold text-primary" : "text-text-secondary"}`}>
                            Step 2: Ocular EAR blink pattern registration
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {step3Passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <div className={`w-4 h-4 rounded-full border-2 ${calibrationStep === 3 ? "border-primary-accent animate-pulse" : "border-border-outline"} shrink-0`} />
                          )}
                          <span className={`${calibrationStep === 3 ? "font-bold text-primary" : "text-text-secondary"}`}>
                            Step 3: Posture height baseline confirmation
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5 bg-surface-low border border-border-outline space-y-3">
                    <h4 className="text-xs font-bold text-primary-accent uppercase tracking-wider animate-pulse">Calibration Action Required</h4>
                    <p className="text-xs text-text-secondary leading-relaxed font-light">
                      Click the button below to start the webcam stream. Once active, look straight at the camera feed in the sidebar, and follow the proctoring alignment checkpoints.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-3">
                    <span className="material-symbols-outlined text-[20px] text-red-600 flex-shrink-0">error_outline</span>
                    <p>{error}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 border-t border-border-outline pt-6 mt-12">
                {calibrationProgress < 100 ? (
                  <>
                    <button
                      onClick={handleSimulateDemoMode}
                      className="px-6 py-3 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">developer_board</span>
                      Simulate Demo Mode
                    </button>
                    <button
                      onClick={handleStartCalibration}
                      disabled={isCalibrating}
                      className="px-6 py-3 bg-primary-accent text-white font-bold text-xs hover:bg-primary disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isCalibrating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Calibrating...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                          Allow & Calibrate Camera
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleBeginExam}
                    className="px-8 py-3 bg-primary-accent text-white font-extrabold text-xs hover:bg-primary transition-all flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    Start Examination
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full">
              <div>
                {/* Question index */}
                <div className={`flex justify-between items-center border-b pb-4 mb-6 border-border-outline-variant`}>
                  <span className="text-xs text-text-secondary font-bold uppercase tracking-wider flex items-center gap-2">
                    Question {currentQuestionIdx + 1} of {EXAM_QUESTIONS.length}
                    {isStressAdapted && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-emerald-800 rounded-full border border-green-200 animate-pulse">
                        <span className="material-symbols-outlined text-[12px]">spa</span>
                        Adaptive View Active
                      </span>
                    )}
                  </span>
                  <span className="text-xs px-2.5 py-1 bg-surface-low border border-border-outline-variant rounded font-semibold font-mono uppercase text-text-secondary">
                    Core CS Concept
                  </span>
                </div>

                {/* Active Question */}
                <h3 className={`font-bold transition-all duration-500 text-on-surface leading-relaxed ${
                  isStressAdapted 
                    ? "text-2xl font-semibold leading-loose mb-8" 
                    : "text-lg md:text-xl mb-6"
                }`}>
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
                        className={`w-full text-left transition-all duration-300 flex items-center gap-4 group cursor-pointer ${
                          isStressAdapted
                            ? `p-6 rounded-xl border text-base md:text-lg ${
                                isSelected
                                  ? "bg-[#f0f4e8] border-[#4c6a38] text-on-surface font-semibold shadow-inner"
                                  : "bg-white border-border-outline text-text-secondary hover:border-primary-accent hover:bg-surface-container"
                              }`
                            : `p-5 rounded-xl border text-sm ${
                                isSelected
                                  ? "bg-secondary-container border-primary-accent text-on-surface font-semibold ring-1 ring-primary-accent"
                                  : "bg-white border-border-outline text-text-secondary hover:border-primary-accent hover:bg-surface-container"
                              }`
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-mono font-bold transition-all shrink-0 ${
                          isStressAdapted
                            ? isSelected
                              ? "bg-[#4c6a38] border-[#4c6a38] text-white"
                              : "border-border-outline text-text-secondary group-hover:border-primary-accent"
                            : isSelected
                              ? "bg-primary-accent border-primary-accent text-white"
                              : "border-border-outline text-text-secondary group-hover:border-primary-accent"
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
              <div className="flex justify-between items-center border-t pt-6 mt-8 border-border-outline-variant">
                <button
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                  className="px-4 py-2.5 rounded-full border border-border-outline text-on-surface hover:bg-surface-container disabled:opacity-30 transition-all flex items-center gap-2 cursor-pointer font-bold text-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Previous
                </button>

                <div className="flex gap-2">
                  {EXAM_QUESTIONS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentQuestionIdx 
                          ? isStressAdapted ? "bg-[#4c6a38] w-4" : "bg-primary-accent w-4" 
                          : selectedAnswers[EXAM_QUESTIONS[idx].id] !== undefined
                            ? "bg-text-secondary w-2"
                            : "bg-border-outline w-2"
                      }`}
                    />
                  ))}
                </div>

                {currentQuestionIdx < EXAM_QUESTIONS.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                    className="px-5 py-2.5 rounded-full bg-primary-accent text-white hover:bg-primary transition-all flex items-center gap-2 cursor-pointer font-bold text-xs"
                  >
                    Next
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                ) : (
                  <div className="w-[80px]" />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Right Sidebar - Proctor Telemetry (only shown during active exam) */}
      {stage !== "pre-check" && (
      <aside className="fixed right-0 top-16 h-[calc(100vh-64px)] w-80 z-40 bg-surface border-l border-border-outline-variant flex flex-col transition-ease">
        <div className="p-4 border-b border-border-outline-variant bg-surface-low">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-3">Live Proctoring</h3>
          <div className="p-3 bg-surface-lowest rounded-lg border border-border-outline-variant flex justify-between items-center text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-emerald-500">verified_user</span>
              Proctor Mode: Safe
            </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {stage === "pre-check" ? (
            <div className="flex flex-col items-center justify-center text-center p-4 min-h-[200px]">
              <span className="material-symbols-outlined text-[32px] text-text-secondary/40 mb-2">shield</span>
              <p className="text-xs font-bold text-on-surface uppercase tracking-wider mb-1">Calibration Mode</p>
              <p className="text-[10px] text-text-secondary font-light">Proctoring telemetry will initialize once the exam begins.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">Cognitive Telemetry</h4>
                <div className="space-y-4">
                  {/* Gaze Stability */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary">Gaze Stability</span>
                      <span className={`font-bold ${currentGaze < 0.35 || currentGaze > 0.65 ? "text-amber-500" : "text-primary-accent"}`}>
                        {currentGaze < 0.35 || currentGaze > 0.65 ? "Gaze Shifted" : "Optimal"}
                      </span>
                    </div>
                    <div className="telemetry-bar">
                      <div className="telemetry-progress bg-primary-accent" style={{ width: `${Math.round(currentGaze * 100)}%` }}></div>
                    </div>
                  </div>

                  {/* EAR */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary">Engagement (EAR)</span>
                      <span className={`font-bold ${currentEAR < 0.18 ? "text-red-500" : "text-green-600"}`}>
                        {currentEAR < 0.18 ? "Closed" : "Optimal"}
                      </span>
                    </div>
                    <div className="telemetry-bar">
                      <div className="telemetry-progress bg-green-500" style={{ width: `${Math.min((currentEAR / 0.3) * 100, 100)}%` }}></div>
                    </div>
                  </div>

                  {/* Stress index */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-secondary">Stress Index</span>
                      <span className={`font-bold ${stressLevel === "High" ? "text-red-500" : "text-tertiary"}`}>{stressLevel}</span>
                    </div>
                    <div className="telemetry-bar">
                      <div className="telemetry-progress bg-tertiary-container" style={{ width: `${Math.round(riskScore * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Indicators */}
              <div className="p-3 bg-surface-container rounded-lg border border-border-outline-variant space-y-2">
                <p className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Environment Security</p>
                <div className="flex justify-between items-center text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-green-500">mic</span>
                    Audio Clean
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-green-500">visibility</span>
                    Single Face
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="p-4 border-t border-border-outline-variant mt-auto space-y-2 bg-surface-container-low">
          <button 
            onClick={() => triggerWellnessIntervention("Student requested a voluntary stress reset interval.")}
            className="w-full py-2.5 bg-green-50 text-green-800 border border-green-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-green-100 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">spa</span>
            Take Calming Break
          </button>
          {stage === "active" && (
            <button 
              onClick={() => setFatigueScore(prev => prev === 55 ? 0 : 55)}
              className="w-full py-2.5 bg-surface-lowest text-text-secondary border border-border-outline rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-surface transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              {fatigueScore >= 50 ? "Clear Simulated Fatigue" : "Simulate High Fatigue"}
            </button>
          )}
        </div>
      </aside>
      )}


      {/* Live Proctoring Webcam Feed — always mounted so videoRef is never null */}
      <div
        className={`transition-all duration-500 border border-border-outline-variant bg-surface-lowest p-2 rounded-xl shadow-lg z-50 ${
          stage === "pre-check"
            ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-[62%] w-[320px] sm:w-[480px] aspect-video"
            : "fixed md:bottom-6 md:left-6 bottom-4 right-4 w-40 md:w-52 aspect-video"
        } ${!webcamAllowed ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            playsInline
            autoPlay
            muted
          />
          <canvas
            ref={canvasRef}
            width="640"
            height="480"
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />

          {/* Circular targeting ring overlay in pre-check stage */}
          {stage === "pre-check" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Outer spinning ring */}
              <div className={`w-36 h-36 sm:w-52 sm:h-52 rounded-full border-4 border-dashed transition-colors duration-300 ${
                step1Passed ? "border-emerald-500/60" : "border-primary-accent/40"
              } animate-[spin_60s_linear_infinite]`}></div>

              {/* Inner solid ring */}
              <div className={`absolute w-32 h-32 sm:w-48 sm:h-48 rounded-full border-2 transition-colors duration-300 ${
                step1Passed ? "border-emerald-500" : "border-primary-accent/80"
              }`}></div>

              {/* Guide silhouette */}
              <svg className={`absolute w-20 h-20 sm:w-28 sm:h-28 transition-colors duration-300 ${
                step1Passed ? "text-emerald-500/20" : "text-primary-accent/30"
              }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" />
                <path d="M4 19a8 8 0 0 1 16 0" />
              </svg>

              {/* Status banner on feed */}
              <div className="absolute bottom-2 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[9px] font-bold text-white uppercase tracking-wider font-mono">
                {calibrationStep === 1 && "Align Face"}
                {calibrationStep === 2 && "Recording Eyes"}
                {calibrationStep === 3 && "Hold Still (Posture)"}
                {calibrationStep === 4 && "Completed!"}
              </div>
            </div>
          )}

          {/* Capture & Continue button — always inside relative container so absolute works */}
          {stage === "pre-check" && isCalibrating && calibrationStep < 4 && (
            <button
              onClick={handleManualCapture}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-5 py-2 bg-primary-accent hover:bg-primary text-white text-[11px] font-bold uppercase tracking-widest rounded-full shadow-xl transition-all animate-pulse cursor-pointer whitespace-nowrap"
            >
              <Camera className="w-4 h-4 flex-shrink-0" />
              {calibrationStep === 1 && "Capture Face →"}
              {calibrationStep === 2 && "Capture Eyes →"}
              {calibrationStep === 3 && "Capture Posture →"}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}


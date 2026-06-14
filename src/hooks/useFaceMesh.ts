import { useEffect, useState, useRef } from "react";
import { Point3D, calculateEAR, calculateGazeRatio } from "../utils/formulas";

// Declare global properties for MediaPipe scripts loaded from CDN
declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    FACEMESH_TESSELATION: any;
    FACEMESH_RIGHT_EYE: any;
    FACEMESH_LEFT_EYE: any;
    FACEMESH_RIGHT_IRIS: any;
    FACEMESH_LEFT_IRIS: any;
  }
}

export interface FaceMeshTrackingResult {
  earLeft: number;
  earRight: number;
  earAvg: number;
  gazeLeft: number;
  gazeRight: number;
  gazeAvg: number;
  faceCount: number;
  isBlinking: boolean;
  eyeClosedDurationMs: number;
  offScreenGazeCount: number;
  isSlouching: boolean;
  isFrozen: boolean;
  noseX: number;
  noseY: number;
  isFaceCentered: boolean;
}

export function useFaceMesh(
  videoElementRef: React.RefObject<HTMLVideoElement | null>,
  canvasElementRef: React.RefObject<HTMLCanvasElement | null>,
  onTrackingUpdate: (result: FaceMeshTrackingResult) => void
) {
  const onTrackingUpdateRef = useRef(onTrackingUpdate);
  useEffect(() => {
    onTrackingUpdateRef.current = onTrackingUpdate;
  }, [onTrackingUpdate]);

  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const faceMeshRef = useRef<any>(null);
  const isBlinkingRef = useRef<boolean>(false);
  const blinkStartRef = useRef<number | null>(null);
  const offScreenGazeFramesRef = useRef<number>(0);
  const baselineYRef = useRef<number | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastPixelSampleRef = useRef<number[]>([]);
  const frozenFramesRef = useRef<number>(0);
  const isFrozenRef = useRef<boolean>(false);

  const lastRecreateTimeRef = useRef<number>(0);
  const recreateCountRef = useRef<number>(0);
  const isHookActiveRef = useRef<boolean>(true);

  const initFaceMeshInstance = () => {
    if (!window.FaceMesh) return;

    if (faceMeshRef.current) {
      try {
        faceMeshRef.current.close();
      } catch (e) {
        console.warn("Failed to close old faceMesh:", e);
      }
    }

    const faceMesh = new window.FaceMesh({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    faceMesh.setOptions({
      maxNumFaces: 2,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results: any) => {
      if (!isHookActiveRef.current) return;
      processResults(results);
    });

    faceMeshRef.current = faceMesh;
    console.log("MediaPipe FaceMesh instance initialized.");
  };

  useEffect(() => {
    isHookActiveRef.current = true;

    async function initializeMediaPipe() {
      try {
        // Load CDN scripts sequentially
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js");
        // Also load drawing helpers for drawing on canvas
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");

        if (!isHookActiveRef.current) return;

        if (!window.FaceMesh || !window.Camera) {
          throw new Error("MediaPipe libraries failed to initialize from CDN.");
        }

        initFaceMeshInstance();
        setIsLoaded(true);
      } catch (err: any) {
        console.error(err);
        if (isHookActiveRef.current) setError(err.message || "Failed to load proctoring modules.");
      }
    }

    initializeMediaPipe();

    return () => {
      isHookActiveRef.current = false;
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (faceMeshRef.current) {
        try {
          faceMeshRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  const startTracking = async () => {
    if (!isLoaded || !videoElementRef.current || !faceMeshRef.current) return;

    try {
      // First, always grab a direct getUserMedia stream so the video element
      // shows a live feed even before MediaPipe's Camera utility takes over.
      let directStream: MediaStream | null = null;
      try {
        directStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        const videoEl = videoElementRef.current;
        if (videoEl) {
          videoEl.srcObject = directStream;
          await videoEl.play().catch(() => {});
        }
      } catch (mediaErr) {
        console.warn("Direct getUserMedia failed, relying on MediaPipe Camera only:", mediaErr);
      }

      const camera = new window.Camera(videoElementRef.current, {
        onFrame: async () => {
          const video = videoElementRef.current;
          if (video && faceMeshRef.current) {
            // Check readyState, video size, and client visibility size to prevent WebAssembly aborts/crashes
            if (
              video.readyState >= 2 &&
              video.videoWidth > 0 &&
              video.videoHeight > 0 &&
              video.clientWidth > 0 &&
              video.clientHeight > 0
            ) {
              try {
                await faceMeshRef.current.send({ image: video });
              } catch (err: any) {
                console.warn("MediaPipe faceMesh.send failed:", err);
                const errMsg = err?.message || String(err);
                if (errMsg.includes("abort") || errMsg.includes("RuntimeError") || errMsg.includes("Cannot call")) {
                  const now = performance.now();
                  // Rate limit recreations: max 3 attempts within 10 seconds
                  if (now - lastRecreateTimeRef.current > 10000) {
                    recreateCountRef.current = 0;
                  }
                  if (recreateCountRef.current < 3) {
                    recreateCountRef.current += 1;
                    lastRecreateTimeRef.current = now;
                    console.log(`Self-healing: WASM aborted. Recreating FaceMesh instance (attempt ${recreateCountRef.current}/3)...`);
                    try {
                      initFaceMeshInstance();
                    } catch (recreateErr) {
                      console.error("Self-healing failed to recreate FaceMesh:", recreateErr);
                    }
                  } else {
                    console.error("Self-healing: Max recreation attempts exceeded.");
                  }
                }
              }
            }
          }
        },
        width: 640,
        height: 480,
      });

      cameraRef.current = camera;
      await camera.start();
    } catch (err: any) {
      console.error("Failed to start camera:", err);
      setError("Webcam access denied. Please grant camera permission.");
    }
  };

  const stopTracking = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
  };

  const processResults = (results: any) => {
    const canvas = canvasElementRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Always draw webcam frame first so we never show a black screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
      if (results.image) {
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      } else if (videoElementRef.current && videoElementRef.current.readyState >= 2) {
        // Fallback: draw directly from video element if results.image is missing
        ctx.drawImage(videoElementRef.current, 0, 0, canvas.width, canvas.height);
      }
    } catch (drawErr) {
      console.warn("Failed to draw image to canvas:", drawErr);
    }

    const faceCount = results.multiFaceLandmarks ? results.multiFaceLandmarks.length : 0;

    // Camera freeze detection
    let isFrozen = isFrozenRef.current;
    try {
      const sampleCoords = [
        { x: 100, y: 100 }, { x: 200, y: 100 }, { x: 300, y: 100 }, { x: 400, y: 100 },
        { x: 100, y: 200 }, { x: 200, y: 200 }, { x: 300, y: 200 }, { x: 400, y: 200 },
        { x: 100, y: 300 }, { x: 200, y: 300 }, { x: 300, y: 300 }, { x: 400, y: 300 },
        { x: 100, y: 400 }, { x: 200, y: 400 }, { x: 300, y: 400 }, { x: 400, y: 400 },
      ];
      const currentPixels: number[] = [];
      for (const coord of sampleCoords) {
        if (coord.x < canvas.width && coord.y < canvas.height) {
          const pixel = ctx.getImageData(coord.x, coord.y, 1, 1).data;
          currentPixels.push(pixel[0] + pixel[1] + pixel[2]);
        }
      }
      if (lastPixelSampleRef.current.length > 0) {
        let diffSum = 0;
        for (let i = 0; i < currentPixels.length; i++) {
          diffSum += Math.abs(currentPixels[i] - lastPixelSampleRef.current[i]);
        }
        if (diffSum < 1) {
          frozenFramesRef.current += 1;
          if (frozenFramesRef.current > 90) { // ~3s at 30fps
            isFrozen = true;
            isFrozenRef.current = true;
          }
        } else {
          frozenFramesRef.current = 0;
          isFrozen = false;
          isFrozenRef.current = false;
        }
      }
      lastPixelSampleRef.current = currentPixels;
    } catch (err) {
      console.warn("Freeze detection error:", err);
    }

    let trackingData: FaceMeshTrackingResult = {
      earLeft: 0,
      earRight: 0,
      earAvg: 0,
      gazeLeft: 0.5,
      gazeRight: 0.5,
      gazeAvg: 0.5,
      faceCount,
      isBlinking: false,
      eyeClosedDurationMs: 0,
      offScreenGazeCount: 0,
      isSlouching: false,
      isFrozen,
      noseX: 0.5,
      noseY: 0.5,
      isFaceCentered: false,
    };

    if (faceCount > 0) {
      const landmarks = results.multiFaceLandmarks[0];

      // Slouching detection using nose tip y-axis height
      const noseTip = landmarks[1];
      frameCountRef.current += 1;
      if (frameCountRef.current <= 100) {
        if (baselineYRef.current === null) {
          baselineYRef.current = noseTip.y;
        } else {
          baselineYRef.current = baselineYRef.current * 0.9 + noseTip.y * 0.1;
        }
      }
      const slouchThreshold = 0.12;
      const isSlouching = baselineYRef.current !== null && (noseTip.y - baselineYRef.current) > slouchThreshold;

      // EAR Calculation Landmarks
      // Left eye EAR landmarks (indices based on MediaPipe mesh)
      const pLeft = {
        p1: landmarks[263], // left eye outer corner
        p2: landmarks[385], // upper top left
        p3: landmarks[386], // upper top right
        p4: landmarks[362], // left eye inner corner
        p5: landmarks[374], // lower bottom right
        p6: landmarks[380], // lower bottom left
      };
      
      // Right eye EAR landmarks
      const pRight = {
        p1: landmarks[33],  // right eye outer corner
        p2: landmarks[160], // upper top left
        p3: landmarks[159], // upper top right
        p4: landmarks[133], // right eye inner corner
        p5: landmarks[145], // lower bottom right
        p6: landmarks[144], // lower bottom left
      };

      const earLeft = calculateEAR(pLeft.p1, pLeft.p2, pLeft.p3, pLeft.p4, pLeft.p5, pLeft.p6);
      const earRight = calculateEAR(pRight.p1, pRight.p2, pRight.p3, pRight.p4, pRight.p5, pRight.p6);
      const earAvg = (earLeft + earRight) / 2.0;

      // Iris centers for pupil tracking
      const leftPupil = landmarks[468];
      const rightPupil = landmarks[473];

      const gazeLeft = calculateGazeRatio(leftPupil, landmarks[362], landmarks[263]);
      const gazeRight = calculateGazeRatio(rightPupil, landmarks[33], landmarks[133]);
      const gazeAvg = (gazeLeft + gazeRight) / 2.0;

      // Calculate Blinking status and duration
      const EAR_THRESHOLD = 0.18;
      let isBlinking = earAvg < EAR_THRESHOLD;
      let eyeClosedDurationMs = 0;

      if (isBlinking) {
        if (!isBlinkingRef.current) {
          isBlinkingRef.current = true;
          blinkStartRef.current = performance.now();
        } else if (blinkStartRef.current) {
          eyeClosedDurationMs = performance.now() - blinkStartRef.current;
        }
      } else {
        isBlinkingRef.current = false;
        blinkStartRef.current = null;
      }

      // Gaze off-screen detection
      const GAZE_LOWER_BOUND = 0.35;
      const GAZE_UPPER_BOUND = 0.65;
      const isOffScreen = gazeAvg < GAZE_LOWER_BOUND || gazeAvg > GAZE_UPPER_BOUND;
      if (isOffScreen) {
        offScreenGazeFramesRef.current += 1;
      } else {
        offScreenGazeFramesRef.current = 0;
      }

      const noseX = noseTip.x;
      const noseY = noseTip.y;
      // Wide centering zone — just check face is roughly in frame, not pixel-perfect
      const isFaceCentered = faceCount === 1 && noseX >= 0.20 && noseX <= 0.80 && noseY >= 0.20 && noseY <= 0.80;

      trackingData = {
        earLeft,
        earRight,
        earAvg,
        gazeLeft,
        gazeRight,
        gazeAvg,
        faceCount,
        isBlinking,
        eyeClosedDurationMs,
        offScreenGazeCount: offScreenGazeFramesRef.current,
        isSlouching,
        isFrozen,
        noseX,
        noseY,
        isFaceCentered,
      };

      // Draw custom glowing neon wireframe mesh on Canvas
      drawCustomFaceMesh(ctx, landmarks);
    }

    onTrackingUpdateRef.current(trackingData);
  };

  // Draws a premium glowing cyberpunk face mesh wireframe
  const drawCustomFaceMesh = (ctx: CanvasRenderingContext2D, landmarks: Point3D[]) => {
    const isStressActive = typeof document !== "undefined" && document.querySelector(".stress-adapted") !== null;
    const primaryColor = isStressActive ? "#d97706" : "#00f2fe"; // Warm Amber or Ocean Blue
    const secondaryColor = isStressActive ? "rgba(217, 119, 6, 0.08)" : "rgba(0, 242, 254, 0.08)";
    const accentColor = isStressActive ? "#dc2626" : "#ff007f"; // Red or pink

    // We can draw the face connections if the helper is loaded
    if (window.drawConnectors && window.FACEMESH_TESSELATION) {
      // Background tesselation - subtle lines
      window.drawConnectors(ctx, landmarks, window.FACEMESH_TESSELATION, {
        color: secondaryColor,
        lineWidth: 0.5,
      });

      // Eyes
      window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_EYE, {
        color: primaryColor,
        lineWidth: 1.5,
      });
      window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_EYE, {
        color: primaryColor,
        lineWidth: 1.5,
      });

      // Iris
      if (window.FACEMESH_LEFT_IRIS && window.FACEMESH_RIGHT_IRIS) {
        window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_IRIS, {
          color: accentColor,
          lineWidth: 1.5,
        });
        window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_IRIS, {
          color: accentColor,
          lineWidth: 1.5,
        });
      }
    } else {
      // Fallback: draw outline dots
      ctx.fillStyle = isStressActive ? "rgba(217, 119, 6, 0.4)" : "rgba(0, 242, 254, 0.4)";
      landmarks.forEach((pt, index) => {
        // Draw every 5th landmark for performance and simplicity
        if (index % 6 === 0) {
          ctx.beginPath();
          ctx.arc(pt.x * ctx.canvas.width, pt.y * ctx.canvas.height, 1, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }
  };

  return {
    isLoaded,
    error,
    startTracking,
    stopTracking,
  };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

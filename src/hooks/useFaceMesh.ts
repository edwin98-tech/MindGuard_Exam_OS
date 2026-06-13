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
}

export function useFaceMesh(
  videoElementRef: React.RefObject<HTMLVideoElement | null>,
  canvasElementRef: React.RefObject<HTMLCanvasElement | null>,
  onTrackingUpdate: (result: FaceMeshTrackingResult) => void
) {
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

  useEffect(() => {
    let active = true;

    async function initializeMediaPipe() {
      try {
        // Load CDN scripts sequentially
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js");
        // Also load drawing helpers for drawing on canvas
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");

        if (!active) return;

        if (!window.FaceMesh || !window.Camera) {
          throw new Error("MediaPipe libraries failed to initialize from CDN.");
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
          if (!active) return;
          processResults(results);
        });

        faceMeshRef.current = faceMesh;
        setIsLoaded(true);
      } catch (err: any) {
        console.error(err);
        if (active) setError(err.message || "Failed to load proctoring modules.");
      }
    }

    initializeMediaPipe();

    return () => {
      active = false;
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
    };
  }, []);

  const startTracking = async () => {
    if (!isLoaded || !videoElementRef.current || !faceMeshRef.current) return;

    try {
      const camera = new window.Camera(videoElementRef.current, {
        onFrame: async () => {
          if (videoElementRef.current && faceMeshRef.current) {
            await faceMeshRef.current.send({ image: videoElementRef.current });
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

    // Clear and draw webcam frame in background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

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
      };

      // Draw custom glowing neon wireframe mesh on Canvas
      drawCustomFaceMesh(ctx, landmarks);
    }

    onTrackingUpdate(trackingData);
  };

  // Draws a premium glowing cyberpunk face mesh wireframe
  const drawCustomFaceMesh = (ctx: CanvasRenderingContext2D, landmarks: Point3D[]) => {
    // We can draw the face connections if the helper is loaded
    if (window.drawConnectors && window.FACEMESH_TESSELATION) {
      // Background tesselation - subtle cyan lines
      window.drawConnectors(ctx, landmarks, window.FACEMESH_TESSELATION, {
        color: "rgba(0, 242, 254, 0.08)",
        lineWidth: 0.5,
      });

      // Eyes - cyan
      window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_EYE, {
        color: "#00f2fe",
        lineWidth: 1.5,
      });
      window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_EYE, {
        color: "#00f2fe",
        lineWidth: 1.5,
      });

      // Iris - bright pink/purple
      if (window.FACEMESH_LEFT_IRIS && window.FACEMESH_RIGHT_IRIS) {
        window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_IRIS, {
          color: "#ff007f",
          lineWidth: 1.5,
        });
        window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_IRIS, {
          color: "#ff007f",
          lineWidth: 1.5,
        });
      }
    } else {
      // Fallback: draw outline dots
      ctx.fillStyle = "rgba(0, 242, 254, 0.4)";
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

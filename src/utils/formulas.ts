export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface TelemetryMetrics {
  tabSwitches: number;
  offScreenGaze: number;
  multipleFaces: number;
  abnormalAudio: number;
}

/**
 * Calculates the Euclidean distance between two 3D points.
 */
export function calculateDistance3D(pA: Point3D, pB: Point3D): number {
  return Math.sqrt(
    Math.pow(pA.x - pB.x, 2) +
    Math.pow(pA.y - pB.y, 2) +
    Math.pow(pA.z - pB.z, 2)
  );
}

/**
 * Calculates the Eye Aspect Ratio (EAR) based on 6 eyelid landmarks.
 * Formula: EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
export function calculateEAR(
  p1: Point3D,
  p2: Point3D,
  p3: Point3D,
  p4: Point3D,
  p5: Point3D,
  p6: Point3D
): number {
  const d26 = calculateDistance3D(p2, p6);
  const d35 = calculateDistance3D(p3, p5);
  const d14 = calculateDistance3D(p1, p4);

  if (d14 === 0) return 0;
  return (d26 + d35) / (2.0 * d14);
}

/**
 * Estimates gaze tracking ratio (Gx) by calculating the horizontal relative position
 * of the pupil center between the outer and inner eye corners.
 * Formula: Gx = ||pupil - leftCorner|| / ||rightCorner - leftCorner||
 */
export function calculateGazeRatio(
  pupil: Point3D,
  leftCorner: Point3D,
  rightCorner: Point3D
): number {
  const distPupilLeft = calculateDistance3D(pupil, leftCorner);
  const distRightLeft = calculateDistance3D(rightCorner, leftCorner);

  if (distRightLeft === 0) return 0.5;
  return distPupilLeft / distRightLeft;
}

/**
 * Computes custom Behavior Risk Scoring based on telemetry data:
 * Risk = 0.35 * tabSwitches + 0.25 * offScreenGaze + 0.20 * multipleFaces + 0.20 * abnormalAudio
 * Normalizes inputs to clamp the output between 0 and 1.
 */
export function calculateRiskScore(metrics: TelemetryMetrics): number {
  // Normalize metrics based on reasonable proctoring thresholds
  // e.g. 3 tab switches is maximum penalty (1.0)
  // 15 seconds of off-screen gaze is maximum penalty (1.0)
  // 10 seconds of multiple faces is maximum penalty (1.0)
  // 15 seconds of abnormal audio is maximum penalty (1.0)
  const tabSwitchFactor = Math.min(metrics.tabSwitches / 3, 1.0);
  const offScreenGazeFactor = Math.min(metrics.offScreenGaze / 15, 1.0);
  const multipleFacesFactor = Math.min(metrics.multipleFaces / 10, 1.0);
  const abnormalAudioFactor = Math.min(metrics.abnormalAudio / 15, 1.0);

  const risk =
    0.35 * tabSwitchFactor +
    0.25 * offScreenGazeFactor +
    0.20 * multipleFacesFactor +
    0.20 * abnormalAudioFactor;

  return Math.min(Math.max(risk, 0), 1.0);
}

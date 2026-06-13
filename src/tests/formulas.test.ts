import { 
  calculateDistance3D, 
  calculateEAR, 
  calculateGazeRatio, 
  calculateRiskScore, 
  Point3D, 
  TelemetryMetrics 
} from "../utils/formulas";

describe("formulas.ts mathematical unit tests", () => {
  
  describe("calculateDistance3D", () => {
    it("should calculate correct 3D Euclidean distance for standard coordinates", () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 };
      const p2: Point3D = { x: 3, y: 4, z: 0 };
      expect(calculateDistance3D(p1, p2)).toBeCloseTo(5);
    });

    it("should calculate correct 3D distance for positive/negative space coordinates", () => {
      const p1: Point3D = { x: 1, y: 2, z: 3 };
      const p2: Point3D = { x: 4, y: 6, z: 15 }; // dx=3, dy=4, dz=12 -> dist = sqrt(9 + 16 + 144) = sqrt(169) = 13
      expect(calculateDistance3D(p1, p2)).toBeCloseTo(13);
    });
  });

  describe("calculateEAR (Eye Aspect Ratio)", () => {
    it("should calculate expected open eye aspect ratio", () => {
      // Open eye landmarks
      const p1: Point3D = { x: 0, y: 0, z: 0 };  // corner left
      const p2: Point3D = { x: 2, y: 3, z: 0 };  // top left
      const p3: Point3D = { x: 4, y: 3, z: 0 };  // top right
      const p4: Point3D = { x: 6, y: 0, z: 0 };  // corner right
      const p5: Point3D = { x: 4, y: -3, z: 0 }; // bottom right
      const p6: Point3D = { x: 2, y: -3, z: 0 }; // bottom left
      
      // d26 = 6, d35 = 6, d14 = 6
      // EAR = (6 + 6) / (2 * 6) = 12 / 12 = 1.0
      const ear = calculateEAR(p1, p2, p3, p4, p5, p6);
      expect(ear).toBeCloseTo(1.0);
    });

    it("should return 0 when eye horizontal distance is 0", () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 };
      const ear = calculateEAR(p1, p1, p1, p1, p1, p1);
      expect(ear).toBe(0);
    });
  });

  describe("calculateGazeRatio", () => {
    it("should calculate correct horizontal gaze offset", () => {
      const leftCorner: Point3D = { x: 10, y: 0, z: 0 };
      const rightCorner: Point3D = { x: 20, y: 0, z: 0 };
      
      // Pupil in center (x = 15)
      const centerPupil: Point3D = { x: 15, y: 0, z: 0 };
      // distPupilLeft = 5, distRightLeft = 10 -> ratio = 0.5
      expect(calculateGazeRatio(centerPupil, leftCorner, rightCorner)).toBeCloseTo(0.5);

      // Pupil looking left (x = 12)
      const leftPupil: Point3D = { x: 12, y: 0, z: 0 };
      // distPupilLeft = 2, distRightLeft = 10 -> ratio = 0.2
      expect(calculateGazeRatio(leftPupil, leftCorner, rightCorner)).toBeCloseTo(0.2);
    });

    it("should return 0.5 default if corner distance is 0", () => {
      const p1: Point3D = { x: 0, y: 0, z: 0 };
      expect(calculateGazeRatio(p1, p1, p1)).toBe(0.5);
    });
  });

  describe("calculateRiskScore", () => {
    it("should return 0 for clean telemetry (no anomalies)", () => {
      const metrics: TelemetryMetrics = {
        tabSwitches: 0,
        offScreenGaze: 0,
        multipleFaces: 0,
        abnormalAudio: 0,
      };
      expect(calculateRiskScore(metrics)).toBe(0);
    });

    it("should compute expected risk based on formula weightings", () => {
      const metrics: TelemetryMetrics = {
        tabSwitches: 1,      // 1/3 penalty -> 0.35 * 0.333 = 0.1167
        offScreenGaze: 15,   // max penalty -> 0.25 * 1.0 = 0.25
        multipleFaces: 0,    // 0
        abnormalAudio: 0,    // 0
      };
      // risk = 0.35 * (1/3) + 0.25 * (15/15) + 0.2 * 0 + 0.2 * 0
      // risk = 0.1166667 + 0.25 = 0.366667
      expect(calculateRiskScore(metrics)).toBeCloseTo(0.3667);
    });

    it("should clamp maximum risk score to 1.0", () => {
      const metrics: TelemetryMetrics = {
        tabSwitches: 10,
        offScreenGaze: 100,
        multipleFaces: 50,
        abnormalAudio: 50,
      };
      expect(calculateRiskScore(metrics)).toBe(1.0);
    });
  });

});

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { timeline, metrics } = body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined. Falling back to local simulation engine.");
      const mockAnalysis = generateMockAnalysis(metrics);
      return NextResponse.json({ success: true, report: mockAnalysis, simulated: true });
    }

    const prompt = `
You are MindGuard AI, a cognitive wellness proctoring assistant. Analyze the following exam telemetry log to compile a compassionate, humane, and professional cognitive wellness and exam integrity report.

Traditional proctoring software treats students like structural adversaries. Your goal is to distinguish fatigue, stress, and anxiety from actual cheating (malpractice).

Here is the student's exam telemetry metrics:
- Total Exam Duration: ${metrics.totalExamDurationSeconds} seconds
- Tab Switches: ${metrics.tabSwitches}
- Off-Screen Gaze Duration: ${metrics.offScreenGazeSeconds} seconds
- Multiple Faces Detected Duration: ${metrics.multipleFacesSeconds} seconds
- Abnormal Audio Duration: ${metrics.abnormalAudioSeconds} seconds
- Total Blinks detected: ${metrics.totalBlinks}
- Average Eye Aspect Ratio (EAR): ${metrics.avgEAR.toFixed(3)} (typical open is ~0.25-0.30, closed is <0.18)
- Computed Risk Score: ${(metrics.finalRiskScore * 100).toFixed(1)}%

Here is the raw timeline of triggered anomalies during the exam:
${JSON.stringify(timeline, null, 2)}

Provide a detailed markdown report structured EXACTLY as follows:

# MINDGUARD COGNITIVE WELLNESS & INTEGRITY REPORT

## 1. Executive Summary
[Provide a high-level summary of the session. Comment on whether the student completed the test with integrity, and note any wellness or fatigue concerns.]

## 2. Cognitive Wellness & Fatigue Analysis
[Analyze the blink rate and EAR metrics. Explain if the student showed signs of eye strain, fatigue, or drowsiness (e.g., closed eyes for long periods, high blink frequency).]

## 3. Exam Integrity Evaluation
[Analyze tab switches, off-screen gazes, multiple face indicators, or abnormal audio. Clearly state if these point to actual malicious malpractice or if they align with normal human distractions, anxiety, or physical discomfort (e.g. stretching neck, looking away to think).]

## 4. Institutional Recommendations
[Provide constructive, supportive suggestions to the school or proctor. Instead of immediately recommending disqualification, suggest humane accommodations like rest breaks, scheduling adjustments, or support if fatigue/stress was high.]

## 5. Personalized Student Wellness Feedback
[Provide a warm, encouraging message directly to the student with practical, science-backed tips for exam anxiety, eye strain relief, and mental health.]
`;

    // Try sending request to Gemini 2.5 Flash API with local fallback safety net
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Gemini API request failed (status ${response.status}). Falling back to local wellness engine. Details:`, errorText);
        const mockAnalysis = generateMockAnalysis(metrics);
        return NextResponse.json({ success: true, report: mockAnalysis, simulated: true, warning: `Gemini API returned status ${response.status}` });
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error("Invalid response format received from Gemini API.");
      }

      return NextResponse.json({ success: true, report: generatedText, simulated: false });
    } catch (apiErr: any) {
      console.warn("Gemini API call failed with exception. Falling back to local wellness engine. Error:", apiErr);
      const mockAnalysis = generateMockAnalysis(metrics);
      return NextResponse.json({ success: true, report: mockAnalysis, simulated: true, warning: apiErr.message });
    }
  } catch (err: any) {
    console.error("Error in analyze-telemetry endpoint:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to analyze telemetry",
      },
      { status: 500 }
    );
  }
}

// Fallback logic to generate realistic, professional markdown reports locally
function generateMockAnalysis(metrics: any): string {
  const riskPercent = (metrics.finalRiskScore * 100).toFixed(1);
  const fatigueDetected = metrics.totalBlinks > 50 || metrics.avgEAR < 0.22;
  const integrityConcern = metrics.tabSwitches > 1 || metrics.offScreenGazeSeconds > 25;

  let summary = "";
  if (integrityConcern) {
    summary = "The exam session was completed successfully. While the integrity score shows some minor distractions (such as screen tab shifts or gazing away), there is no conclusive evidence of malicious malpractice. The behavior patterns are highly indicative of testing anxiety and physical restlessness.";
  } else {
    summary = "The student completed the examination session with high integrity. Gaze directions remained predominantly centered, and tab activity was minimal. Some physiological indicators suggest moderate physical exhaustion towards the latter half.";
  }

  let fatigueAnalysis = "";
  if (fatigueDetected) {
    fatigueAnalysis = `The telemetry records a high blink rate (${metrics.totalBlinks} blinks) and a depressed Average Eye Aspect Ratio (${metrics.avgEAR.toFixed(3)}), reflecting substantial ocular fatigue. A micro-blink burst was detected mid-session. These physiological markers are highly correlated with digital eye strain (DES), physical tiredness, or stress, rather than cheating.`;
  } else {
    fatigueAnalysis = `The student's Eye Aspect Ratio (${metrics.avgEAR.toFixed(3)}) and blink patterns remain within healthy baseline ranges. There are no physiological indicators of acute drowsiness or severe physical fatigue during this session.`;
  }

  let integrityAnalysis = "";
  if (metrics.tabSwitches > 0) {
    integrityAnalysis += `- **Tab Switching**: The student exited the exam screen ${metrics.tabSwitches} time(s). This is flagged as a technical distraction but may represent accidental notifications or system updates rather than cheating.\n`;
  }
  if (metrics.offScreenGazeSeconds > 0) {
    integrityAnalysis += `- **Off-Screen Gaze**: ${metrics.offScreenGazeSeconds} total seconds of off-screen gaze were registered. These events occurred in brief intervals (under 3 seconds each), consistent with natural cognitive redirection (staring away to think or relieve neck tension).\n`;
  }
  if (integrityAnalysis === "") {
    integrityAnalysis = "No security anomalies or critical gaze shifts were flagged. The student remained fully focused on the active browser window throughout the exam.";
  }

  return `# MINDGUARD COGNITIVE WELLNESS & INTEGRITY REPORT (SIMULATED ENGINE)

## 1. Executive Summary
${summary}

## 2. Cognitive Wellness & Fatigue Analysis
${fatigueAnalysis}

## 3. Exam Integrity Evaluation
${integrityAnalysis}

## 4. Institutional Recommendations
- **Avoid Punitive Grading**: Do not invalidate the exam based on the tab switches or gaze alerts. Telemetry indicates these were transient and anxiety-driven.
- **Implement Rest Breaks**: The student showed clear signs of digital eye strain. We recommend introducing mandatory 1-minute visual rest breaks for exams exceeding 60 minutes.
- **Flexible Scheduling**: For future assessments, allow the student to select a morning slot when cognitive fatigue parameters are lower.

## 5. Personalized Student Wellness Feedback
Hey! You did an amazing job finishing your exam. We noticed your eyes were getting a bit tired towards the end. Remember to practice the **20-20-20 rule**: every 20 minutes, look at something 20 feet away for at least 20 seconds. Keep breathing, stay hydrated, and take some time to stretch. You've got this!`;
}

# PRODUCT REQUIREMENT DOCUMENT (PRD)

## Project Name: MindGuard Exam OS
## Track: Theme A - Examinations (FAR AWAY 2026 Hackathon)
## Stack: Next.js 14+ (App Router), Tailwind CSS, Antigravity Edge Agent, Google Stitch Web Components
## Author: Solo Builder Workflow (AI-Assisted Deployment)

---

## 1. Executive Summary & Core Objective
MindGuard Exam OS is a privacy-first, humane, browser-based examination environment engineered to shift the proctoring paradigm away from hostile, punitive surveillance and toward cognitive wellness optimization. 

Traditional proctoring software treats students like structural adversaries—penalizing normal human behaviors like eye strain, shifting posture, or heavy blinking due to exhaustion. This design causes massive test anxiety and introduces high failure rates due to network dropouts or rigid cloud pricing traps.

MindGuard solves this by deploying a hybrid infrastructure. By running low-latency client-side edge computer vision pipelines inside an **Antigravity Edge Agent** and rendering UI states with high-performance **Google Stitch Web Components**, the system filters out natural fatigue anomalies locally and for free. Cloud infrastructure (Google Gemini 3.1 Flash-Lite) is invoked exclusively *after* the exam ends to compile deep behavioral intelligence. 

The ultimate goal of this MVP is to prove that educational institutions can securely enforce exam integrity without punishing tired, anxious, or neurodivergent students.

---

## 2. System Architecture & Component Mapping

The application operates as an entirely decoupled, edge-heavy pipeline. It processes stream variables at 30fps entirely inside the user's browser, eliminating real-time server network costs.

```
+--------------------------------------------------------------------------+
|                          Client Webcam Stream                            |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                  Local MediaPipe Face Mesh Engine                        |
| - Extracts 468/478 3D facial landmarks                                   |
| - Computes EAR and Pupil Center coordinates                              |
+--------------------------------------------------------------------------+
                                     |
                  +------------------+------------------+
                  |                                     | (Local Analytics)
                  v                                     v
+-----------------------------------+ +------------------------------------+
|   Gaze Tracking G_x Calculation   | |      Eye Aspect Ratio (EAR)        |
| - Identifies off-screen focus     | | - Identifies micro-blinks          |
+-----------------------------------+ +------------------------------------+
                  |                                     |
                  +------------------+------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                        Telemetry Log Aggregator                          |
+--------------------------------------------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
|                  Gemini 3.1 Flash-Lite Engine (Cloud)                    |
| - Generates personalized wellness/fatigue feedback                       |
| - Dispatches secure proctor alerts                                       |
+--------------------------------------------------------------------------+
```

### Components:
- **Client Webcam Stream**: Captures video feed locally at 30fps.
- **Local MediaPipe Face Mesh Engine**: Runs client-side TensorFlow.js/MediaPipe models to extract 468 3D landmarks.
- **Gaze Tracking & EAR Calculators**: Computes pupil position relative to corners and aspect ratio of eyes to determine fatigue vs. distraction.
- **Telemetry Log Aggregator**: Buffers and normalizes interaction logs (blinks, gaze shifts, tab switches, window focus loss).
- **Gemini 3.1 Flash-Lite Engine (Cloud)**: Triggered post-exam or during critical intervals to analyze aggregated behavioral telemetry, distinguish anxiety/fatigue from cheating, and generate personalized cognitive feedback.

---

## 3. Core Mathematical Formulations

To ensure objective evaluation and eliminate generic "AI wrapper" classifications, the edge agent computes specific metrics:

### 3.1 Eye Aspect Ratio (EAR)
To detect blinking frequency and duration, we map eye landmarks (upper eyelid center, lower eyelid center, and outer/inner corners) and compute EAR:
$$\text{EAR} = \frac{||p_2 - p_6|| + ||p_3 - p_5||}{2||p_1 - p_4||}$$
*A drop in EAR below 0.20 indicates a blink.*

### 3.2 Gaze Tracking Ratio ($G_x$)
Gaze direction is estimated by tracking the pupil center relative to the eye corners:
$$G_x = \frac{||\text{pupil} - \text{left corner}||}{||\text{right corner} - \text{left corner}||}$$
*Significant deviations from $G_x \approx 0.5$ indicate the student is looking away from the exam screen.*

### 3.3 Custom Behavior Risk Scoring Model
We implement an algorithmic risk evaluation rule engine:
$$\text{Risk} = 0.35 \cdot \text{tabSwitches} + 0.25 \cdot \text{offScreenGaze} + 0.20 \cdot \text{multipleFaces} + 0.20 \cdot \text{abnormalAudio}$$

---

## 4. Key Features & Edge Interventions

- **Fatigue-Aware Proctoring**: Instead of instant penalties, the system detects micro-blink bursts and heavy eyelids. If fatigue is detected, sensitivity is adjusted dynamically.
- **Intervention Engine**: Opens a non-obtrusive wellness overlay to guide students through science-backed breathing exercises (e.g., 20-second box breathing) to lower anxiety.
- **TabShield Lite**: Tracks tab switching, fullscreen exits, copying attempts, and device changes, saving them locally to SQLite/LocalStorage.
- **Audit Timeline**: Logs a tamper-evident, chronologically ordered event timeline containing risk labels and telemetry metrics.
- **ExamPulse/ExamReady Diagnostics**: Pre-exam environment verification ensuring webcam, browser API access, and lighting are sufficient before commencing.

---

## 5. Technology Stack

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS
- **Design System**: Google Stitch Web Components
- **Client-Side ML**: MediaPipe Face Mesh, TensorFlow.js
- **Agentic Orchestration**: Antigravity Edge Agent & Gemini 3.1 Flash-Lite API
- **Data Persistence**: SQLite (local node wrapper / client storage)
- **Deployment**: Vercel (free tier)

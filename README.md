# MindGuard Exam OS

MindGuard Exam OS is a privacy-first, humane, browser-based examination environment engineered to shift the proctoring paradigm away from hostile, punitive surveillance and toward cognitive wellness optimization. 

Traditional proctoring software treats students like structural adversaries—penalizing normal human behaviors like eye strain, shifting posture, or heavy blinking due to exhaustion. This design causes massive test anxiety and introduces high failure rates.

MindGuard solves this by deploying a hybrid infrastructure. By running low-latency client-side edge computer vision pipelines and rendering UI states with high-performance web components, the system filters out natural fatigue anomalies locally and for free. 

## Key Features

- **Fatigue-Aware Proctoring**: Detects micro-blink bursts and heavy eyelids. If fatigue is detected, sensitivity is adjusted dynamically.
- **Intervention Engine**: Opens a non-obtrusive wellness overlay to guide students through science-backed breathing exercises to lower anxiety.
- **TabShield Lite**: Tracks tab switching, fullscreen exits, copying attempts, and device changes, saving them locally.
- **Audit Timeline**: Logs a tamper-evident, chronologically ordered event timeline containing risk labels and telemetry metrics.
- **ExamPulse/ExamReady Diagnostics**: Pre-exam environment verification ensuring webcam, browser API access, and lighting are sufficient before commencing.

## Technology Stack

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS
- **Design System**: Google Stitch Web Components
- **Client-Side ML**: MediaPipe Face Mesh, TensorFlow.js
- **Agentic Orchestration**: Antigravity Edge Agent & Gemini 3.1 Flash-Lite API
- **Data Persistence**: Supabase (PostgreSQL, Realtime, Edge Functions)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Core Mathematical Formulations

To ensure objective evaluation, the edge agent computes specific metrics:

### Eye Aspect Ratio (EAR)
To detect blinking frequency and duration, we map eye landmarks and compute EAR. A drop in EAR below 0.20 indicates a blink.

### Gaze Tracking Ratio ($G_x$)
Gaze direction is estimated by tracking the pupil center relative to the eye corners. Significant deviations from $G_x \approx 0.5$ indicate the student is looking away from the exam screen.

### Custom Behavior Risk Scoring Model
We implement an algorithmic risk evaluation rule engine based on tab switches, off-screen gaze, multiple faces, and abnormal audio.

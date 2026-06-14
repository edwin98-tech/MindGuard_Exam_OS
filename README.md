# 🛡️ MindGuard Exam OS

<p align="center">
  <img src="src/app/icon.svg" width="100" height="100" alt="MindGuard Shield Logo" />
</p>

MindGuard Exam OS is a **privacy-first, humane, browser-based examination environment** engineered to shift the proctoring paradigm away from hostile, punitive surveillance and toward cognitive wellness optimization.

Traditional proctoring software treats students like structural adversaries—penalizing normal human behaviors like eye strain, shifting posture, or heavy blinking due to exhaustion. This design causes massive test anxiety and introduces high failure rates.

MindGuard solves this by deploying a **hybrid edge-heavy infrastructure**. By running low-latency client-side computer vision pipelines and rendering responsive UI states with high-performance web components, the system filters out natural fatigue anomalies locally. Cloud orchestration (via Google Gemini 3.1 Flash-Lite) is invoked asynchronously to compile deep behavioral and cognitive wellness feedback.

---

## 🚀 Key Architectural Strengths

### 1. Zero-Connection Offline Database Resiliency
MindGuard is designed to function **fully offline and without database connectivity** during live demonstrations or internet drops:
* **Automatic JSON Fallback**: If the remote Supabase database is unreachable, MindGuard automatically falls back to local JSON databases (`src/db/sessions.json` and `src/db/students.json`) to verify logins, fetch history, and save exam progress.
* **LocalStorage Sync**: Interactions, webcam calibration states, and proctor events are buffered in the user's `localStorage` for offline session persistence.

### 2. Client-Side Offline AI Fallback Engine
Even if the Google Gemini API is offline, rate-limited, or lacks a configure key, the dashboard's **AI Audit Report** will compile instantly. The system catches connection errors and dynamically generates a local, structured wellness report showing full telemetry breakdowns.

---

## 🌟 Advanced MVP Enhancements (Implemented)

### 📍 Option 3: Interactive Face-in-Ring Onboarding & Calibration
Before starting the exam, students go through a step-by-step interactive onboarding portal inside their browser:
* **Visual Calibration Ring**: The webcam feed is placed inside a clean visual target ring.
* **Interactive Checklist**: Telemetry metrics are calibrated live:
  1. **Face Centering**: Confirms the user's nose is properly aligned in the center.
  2. **EAR Blinking Baseline**: Analyzes Eye Aspect Ratio (EAR) patterns to establish a blink baseline.
  3. **Posture Check**: Captures slouching/posture deviations and calculates a reference baseline.
* **Continuous Webcam Layout Shifts**: Once calibrated, the webcam feed transitions smoothly to the sidebar without unmounting or restarting.

### 📄 Option 4: A4 PDF Diagnostics Report Stylesheet
Allows institutions to print physical copies of a student's cognitive wellness exam audit. 
* Adds a print trigger at the top of the Invigilator Dashboard details page.
* Incorporates a custom `@media print` CSS stylesheet in `globals.css` that hides navigation bars, side lists, and interactive buttons, reformatting charts, heatmaps, and AI feedback into a clean, professional multi-page A4 document.

### 💬 Option 5: Real-Time Proctor Alerts & Interventions
Allows invigilators to actively support students or nudge them back to focus in real-time:
* **Intervention Widget**: Proctors can choose to send encouragement (e.g., "Take a deep breath!") or warnings (e.g., "Please stay in screen focus").
* **Supabase Realtime Broadcast & Local Fallback**: Commands are broadcasted live over WebSockets. If the database is not connected, the system relies on a local storage sync fallback.
* **Toast Notification Banners**: Incoming messages appear instantly as top-banners on the active student dashboard, allowing direct communication without interruptive overlays.

---

## 📐 Core Mathematical Formulations

### 1. Eye Aspect Ratio (EAR)
Used to detect blinking frequency and duration from facial landmarks:
$$\text{EAR} = \frac{||p_2 - p_6|| + ||p_3 - p_5||}{2||p_1 - p_4||}$$
*A drop in EAR below 0.20 indicates a blink.*

### 2. Gaze Tracking Ratio ($G_x$)
Estimated by tracking the pupil center relative to the eye corners:
$$G_x = \frac{||\text{pupil} - \text{left corner}||}{||\text{right corner} - \text{left corner}||}$$
*Significant deviations from $G_x \approx 0.5$ indicate the student is looking away from the exam.*

### 3. Custom Behavior Risk Scoring Model
Evaluates anomalous interactions algorithmically:
$$\text{Risk} = 0.35 \cdot \text{tabSwitches} + 0.25 \cdot \text{offScreenGaze} + 0.20 \cdot \text{multipleFaces} + 0.20 \cdot \text{abnormalAudio}$$

---

## 🛠️ Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/edwin98-tech/MindGuard_Exam_OS.git
   cd MindGuard_Exam_OS
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables** (Optional)
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```
   *Note: If these variables are not defined, MindGuard will run perfectly in local simulation mode.*

4. **Seed Mock Student Sessions**
   Populate the database (local JSON file and Supabase) with 8 detailed, realistic student registry profiles:
   ```bash
   node scratch/seed_sessions.js
   ```

5. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 📁 Key File Map
* `src/app/exam/page.tsx`: Student exam interface, calibration portal, and proctor toast alerts.
* `src/app/report/page.tsx`: Invigilator registry, EAR charts, timeline heatmaps, and proctor alert controller.
* `src/app/api/analyze-telemetry/route.ts`: API route for Gemini AI report generation with offline fallback logic.
* `src/utils/db.ts`: Local JSON database helper and Supabase Client mapper.
* `src/hooks/useFaceMesh.ts`: MediaPipe Face Mesh edge telemetry processing (EAR, gaze, centering metrics).
* `scratch/seed_sessions.js`: Mock student database seeder.

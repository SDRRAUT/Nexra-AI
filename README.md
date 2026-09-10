<div align="center">

# 🌟 Srushti AI (Spark)
### Next-Generation Autonomous Life, Study & Schedule OS

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Capacitor 8](https://img.shields.io/badge/Capacitor-8.5-119EFF?style=for-the-badge&logo=capacitor)](https://capacitorjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![IndexedDB Dexie](https://img.shields.io/badge/IndexedDB-Dexie.js-FF6F00?style=for-the-badge)](https://dexie.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

*A privacy-first, offline-resilient, hybrid web and Android personal assistant designed to autonomously manage your schedule, focus flow, exams, and holistic life balance.*

[Features](#-key-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Android APK](#-android-apk-build) • [Architecture](#-architecture)

---

</div>

## 🚀 Key Features

### ⚡ 1. Autonomous Schedule Overload & Conflict Resolver
- **Proactive Burnout Prevention:** Monitors daily planned workload against safe capacity thresholds (e.g. >5h of deep focus) and flags overlapping meetings or tasks.
- **1-Tap Resolution:** Proposes intelligent schedule adjustments, moving flexible or low-priority tasks to the next optimal day with a single tap.
- **Calendar Health Indicators:** Integrated directly into the Home overview and the interactive 7-day horizontal Calendar strip.

### ⏱️ 2. Live Focus Companion & Ambient Soundscapes
- **Circular Pomodoro Timer:** Presets for 25m Focus, 45m Deep Work, 60m Ultra, and 5m Rest with smooth SVG progress animations.
- **100% Offline Procedural Soundscapes:** Built on the HTML5 Web Audio API—generates realistic Rain, Ocean Waves, and White Noise via procedural audio synthesis. **Zero audio assets to download, zero bandwidth usage, and 100% offline APK support.**
- **Floating Dynamic Island Pill:** Minimizes seamlessly into an interactive floating pill so you can track focus duration while navigating anywhere in the app.

### 📚 3. Exam & Syllabus Deconstruction Wizard
- **3-Step Intelligent Breakdown:** Turn exam dates, subject names, and multi-chapter syllabi into actionable calendar study blocks.
- **Buffer & Mock Exam Planning:** Automatically spaces out revision sessions, assigns mock exam milestones, and creates buffer rest days prior to target dates.
- **Two-Way Sync:** Auto-generates calendar events and interactive task items in local storage.

### 🧭 4. "Wheel of Life" Interactive Hexagonal Radar
- **Holistic Life Tracking:** Visualizes 6 core dimensions—Career & Study, Physical Health, Mental Wellbeing, Finances, Social & Relationships, and Growth & Projects.
- **Dynamic Scoring:** Automatically syncs with your completed tasks and habit consistency.
- **Interactive Check-In:** Drag sliders to record daily sentiment check-ins and receive tailored AI balance advice to realign your priorities.

### 🎙️ 5. Multimodal Voice & AI Assistant
- **Voice-to-Task Synthesis:** Native speech-to-text integration through Android SpeechRecognizer and Web Speech API fallbacks.
- **Context-Aware Recommendations:** Srushti evaluates missed tasks, streaks, and current energy levels to offer actionable suggestions.

### 📱 6. True Offline-First Architecture
- **Dexie.js / IndexedDB Backbone:** All tasks, events, habits, goals, and logs are persisted instantly on the device.
- **Android APK Ready:** Native Capacitor bridge featuring Android system back-gesture interception, status bar theming, and offline persistence.

---

## 🛠 Tech Stack

| Domain | Technology |
|---|---|
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Mobile Runtime** | [Capacitor 8](https://capacitorjs.com/) (Android SDK 35) |
| **Local Database** | [Dexie.js (IndexedDB)](https://dexie.org/) |
| **Backend ORM** | [Prisma 5](https://www.prisma.io/) (SQLite) |
| **Audio Engine** | Procedural Web Audio API Synthesis |
| **Date & Time** | [date-fns 4](https://date-fns.org/) + `date-fns-tz` |
| **Styling** | Vanilla CSS Design System with CSS Variables, Dark Mode, & Micro-animations |

---

## 🏁 Quick Start

### Prerequisites
- [Node.js 20+](https://nodejs.org/)
- npm 10+

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SDRRAUT/SRUSHTI-AI.git
   cd SRUSHTI-AI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   *(Optional: Provide your `GOOGLE_GENERATIVE_AI_API_KEY` for cloud Gemini AI responses. Local features and offline tools work out of the box without an API key).*

4. **Initialize Local Database:**
   ```bash
   npx prisma generate
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Production Build:**
   ```bash
   npm run build
   npm start
   ```

---

## 📱 Android APK Build

Srushti AI includes native Android integration configured through Capacitor.

### 1. Build Static Web Assets
```bash
npm run build
```

### 2. Synchronize with Capacitor
```bash
npx cap sync android
```

### 3. Open in Android Studio or Compile APK
```bash
npx cap open android
```
Inside Android Studio:
- Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
- Generated APK will be available in:
  `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📂 Project Structure

```
SRUSHTI-AI/
├── android/                   # Capacitor Android Native Project
│   └── app/src/main/
│       ├── AndroidManifest.xml # Permissions (Microphone, Audio, Notifications)
│       └── java/.../          # Native MainActivity Bridge
├── prisma/                    # Prisma schema & SQLite DB configuration
├── public/                    # PWA icons, splash art, onboarding graphics
├── src/
│   ├── api/                   # Next.js App Router API endpoints
│   ├── app/                   # App routes (Home, Calendar, Life, Chat, etc.)
│   ├── components/
│   │   ├── calendar/          # ScheduleOptimizerModal, calendar components
│   │   ├── focus/             # FocusCompanionModal, Pomodoro ring, floating pill
│   │   ├── layout/            # AppHeader, BottomNav, GestureBack
│   │   ├── life/              # WheelOfLifeRadar hexagonal visualization
│   │   ├── onboarding/        # First-launch Onboarding Wizard
│   │   └── study/             # ExamDeconstructionWizard
│   └── lib/
│       ├── ai/                # Gemini client, context extractors, tool calls
│       ├── audio/             # Procedural Web Audio API soundscapes engine
│       ├── data/              # Hybrid Client/Server unified data access layer
│       ├── db/                # Dexie IndexedDB client & Prisma connection
│       ├── notifications/     # Native Capacitor & Web notification schedulers
│       └── voice/             # Native + Web Speech synthesis & recognition
├── capacitor.config.ts        # Capacitor mobile configuration
├── next.config.ts             # Next.js configuration
└── package.json
```

---

## 🔒 Privacy & Offline Philosophy

- **100% Local-First:** All user tasks, schedule entries, and personal notes are stored directly in your browser/device's IndexedDB.
- **No Cloud Required for Core Work:** Timer soundscapes, Pomodoro sessions, schedule conflict detection, and syllabus planning function with complete fidelity in airplane mode.
- **Permission Transparency:** Audio recording and notification permissions are requested strictly on-demand when activating voice mode or notification reminders.

---

## 🤝 Contributing

Contributions are warmly welcome!
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'feat: Add AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <sub>Crafted with passion by Team SDR. Dedicated to deep focus and balance.</sub>
</div>

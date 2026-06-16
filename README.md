# 🌿 EcoShift

### **Gamified Enterprise Sustainability & Carbon Ledger**
*Shift Today, Sustain Tomorrow. Built for hackathons, scaling for planet-scale impact.*

---

## 📖 Overview

**EcoShift** is a state-of-the-art B2B/B2C gamified environmental accountability platform designed to drive individual and team action toward carbon reduction. By bridging B2B corporate department goals with daily individual lifestyle habits, EcoShift makes sustainability cooperative, tangible, and highly engaging.

Featuring a live **Living-World Biosphere Simulator**, double-entry carbon ledger tracking, AI-powered OCR utility auditing, IoT-styled home automation, and scalable B2B Department Scoreboards, the application represents a complete enterprise grade solution for carbon offset accountability.

---

## 🚀 Key Features

### 🌍 1. Living-World Biosphere Simulator
An interactive visual ecosystem representation directly controlled by the user's **Eco Score (0 to 100)**:
*   **Dynamic Visuals:** The sky transitions dynamically from a polluted dark Smogscape to a vibrant, green-blue Utopia.
*   **Interactive Props:** Trees grow as users log eco-actions; windmills spin when clean energy is activated; clouds drift; and a futuristic electric bullet train runs across the landscape when the user reaches high-performance levels.
*   **Milestones:** Level milestones adjust in real-time (Smogscape, Wind Valley, Solar Oasis, Eco-City, Utopia).

### 💳 2. Carbon-to-Cash Ledger
A transparent tracking system mapping environmental actions to economic benefits:
*   **Double-Entry Tracking:** Log commute options, diet choices, recycling events, and energy audits.
*   **Monetary Incentives:** Converts avoided CO₂ emissions (in kg CO₂) into monetary savings (in INR).
*   **Interactive History:** Add, filter, and delete ledger entries with instant score updates.

### 🏢 3. Enterprise Department Networks & Leaderboard
Drive collaborative engagement across corporate teams:
*   **B2B Department Keys:** Users join specific corporate divisions (e.g., Engineering, Marketing, Operations).
*   **Firestore Synchronization:** Atomic updates sync local eco-actions with an aggregated Firestore database.
*   **Live Scoreboard:** Real-time B2B department scoreboard sorted dynamically by performance.

### 🤖 4. Gemini-Powered AI Assistant
An integrated AI eco-advisor scoped specifically for environmental consulting:
*   **Eco-Audits:** Get advice on carbon footprint reduction, local recycling options, and green commute practices.
*   **Hallucination Guardrails:** Hard-scoped prompt rules ensuring responses stay focused on ecology and sustainable living.

### 🔌 5. Smart Home Automation Zone & Utility OCR Auditor
*   **IoT Control Panel:** Interact with mock smart home thermostats, smart light bulbs, and solar battery storage systems.
*   **Bill Auditor:** Upload electricity/utility bills, extract usage statistics, compute estimated carbon footprint, and receive recommended clean energy plans.

### 🛒 6. Eco-Marketplace
Spend accumulated points on sustainable products or certified carbon credits through a secure checkout sandbox.

---

## 🛠️ Technology Stack

*   **Core:** React 18, TypeScript, Vite.
*   **Styling & UI:** Tailwind CSS, Lucide Icons, Custom CSS variables, Framer Motion transitions.
*   **Database & Auth:** Firebase Firestore (for enterprise leaderboards), Firebase Auth (supporting anonymous and custom credentials).
*   **AI Engine:** `@google/generative-ai` (Gemini 2.5 Flash SDK).

---

## ⚡ Getting Started

### Prerequisites
*   Node.js (version 18 or above recommended)
*   npm or yarn
*   A Firebase Project and a Google Gemini API Key

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/shresth16k/Ecoshift.git
cd Ecoshift
npm install
```

### 2. Configuration
Create a `.env` file in the root directory based on the `.env.example` file and fill in your keys:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### 3. Run Locally
Start the development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).

### 4. Build for Production
Generate the static production build:
```bash
npm run build
```
The optimized bundle will be generated under the `dist/` directory.

---

## 📁 Directory Structure

```
├── public/               # Static assets & icons
├── src/
│   ├── App.tsx           # Main application shell and layout views
│   ├── index.css         # Styling system, theme configurations & biosphere animations
│   ├── main.tsx          # React application entry point
│   └── vite-env.d.ts     # TypeScript environment types
├── package.json          # Project dependencies & npm script configurations
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration options
```

---

## 🌍 Contribution & Vision
At EcoShift, we believe that **every action is a line of code in the world's largest recovery program**. 

Feel free to open issues or pull requests to improve the platform's UI animations, add direct smart home integrations, or refine carbon offset calculators.

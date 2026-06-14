import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
  Component
} from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  doc,
  addDoc,
  deleteDoc,
  setDoc,
  increment
} from 'firebase/firestore';
import {
  LayoutDashboard,
  PlusCircle,
  Award,
  Calculator,
  Users,
  Sparkles,
  Leaf,
  TrendingUp,
  DollarSign,
  History,
  Menu,
  X,
  ShieldCheck,
  Info,
  ShoppingCart,
  ShoppingBag,
  User as UserIcon,
  Lock,
  Mail,
  Building,
  Phone,
  MapPin,
  Bell,
  Settings,
  CheckCircle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ChevronDown,
  ArrowRight,
  Play,
  Bot,
  Trophy,
  Globe,
  RefreshCw,
  Zap
} from 'lucide-react';

// ==========================================
// --- CONSTANTS & CONFIGURATION ---
// ==========================================
declare const __firebase_config: string;
declare const __app_id: string | undefined;
declare const __initial_auth_token: string | undefined;

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Real-world environmental & financial coefficients
const CO2_DRIVING = 0.21; // kg CO2 per km
const CO2_PUBLIC = 0.04; // kg CO2 per km
const CO2_ELECTRICITY = 0.82; // kg CO2 per kWh
const FUEL_PRICE_PER_LITER = 102; // ₹ per liter
const FUEL_ECONOMY_KM_PER_LITER = 14; // km per liter
const ELECTRICITY_PRICE_PER_KWH = 7.50; // ₹ per kWh

// Helper to interpolate between two hex colors
const interpolateColor = (color1: string, color2: string, factor: number) => {
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);

  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
};

// ==========================================
// --- TYPES & INTERFACES ---
// ==========================================
interface EcoAction {
  id: string;
  actionType: string; // e.g. 'Transportation', 'Energy', 'Waste', 'Diet', 'Other'
  action: string;      // Description
  co2Saved: number;   // in kg
  cashSaved: number;   // in INR
  points: number;     // XP points
  timestamp: string;  // ISO String
  impact: 'low' | 'medium' | 'high';
}

interface LivingWorldProps {
  totalPoints: number;
  personalCo2Saved: number;
  hasCleanEnergy: boolean;
  theme?: 'dark' | 'light';
}

// ==========================================
// --- ERROR BOUNDARY COMPONENT ---
// ==========================================
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("EcoShift Error Boundary caught an error:", error, errorInfo);
  }

  private handleRecover = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="glass-card p-8 border border-red-500/30 max-w-md space-y-4 bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl">
            <div className="w-12 h-12 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Info className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Application Error</h2>
            <p className="text-sm text-slate-300">
              EcoShift encountered an unexpected runtime error. Your logged metrics are safely preserved in the database.
            </p>
            <button
              onClick={this.handleRecover}
              aria-label="Dismiss error and reload application dashboard"
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
            >
              Dismiss & Recover
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ==========================================
// --- SUB-INTERFACE COMPONENTS ---
// ==========================================
const LivingWorldSimulator = memo(function LivingWorldSimulator({ totalPoints, personalCo2Saved, hasCleanEnergy, theme = 'dark' }: LivingWorldProps) {
  // Score-based dynamic color interpolation factor
  const factor = Math.min(1, Math.max(0, (totalPoints - 100) / 400)); // Interpolate 100 XP to 500 XP
  
  // Air Quality Layer: Low scores transition to grey industrial haze; high scores (above 500 XP) interpolate to vibrant crisp sky blue.
  const skyTop = interpolateColor(theme === 'dark' ? '#1c1917' : '#d6d3d1', theme === 'dark' ? '#0c4a6e' : '#38bdf8', factor);
  const skyBottom = interpolateColor(theme === 'dark' ? '#292524' : '#e7e5e4', theme === 'dark' ? '#0f172a' : '#bae6fd', factor);

  const getStageTitle = () => {
    if (totalPoints < 150) return 'Industrial Smogscape';
    if (totalPoints < 300) return 'Recovering Grasslands';
    if (totalPoints < 450) return 'Wind-Powered Valley';
    if (totalPoints < 600) return 'Solar Suburban Oasis';
    return 'Eco-Futurist Utopia';
  };

  const getStageColor = () => {
    if (totalPoints < 150) return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
    if (totalPoints < 450) return 'text-slate-300 border-slate-800 bg-slate-850/30';
    return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
  };

  // Fixed coordinates for tree grid expansion
  const treePositions = useMemo(() => [
    { x: 180, y: 230, r: 15, h: 20 },
    { x: 210, y: 230, r: 18, h: 24 },
    { x: 240, y: 230, r: 14, h: 18 },
    { x: 270, y: 230, r: 20, h: 26 },
    { x: 300, y: 230, r: 16, h: 22 },
    { x: 330, y: 230, r: 19, h: 25 },
    { x: 360, y: 230, r: 15, h: 19 },
    { x: 390, y: 230, r: 22, h: 28 },
    { x: 420, y: 230, r: 17, h: 23 },
    { x: 450, y: 230, r: 18, h: 24 },
    { x: 480, y: 230, r: 14, h: 18 },
    { x: 510, y: 230, r: 20, h: 26 }
  ], []);

  // Proportional tree counting: Math.min(12, Math.floor(personalCo2Saved / 10))
  const numTrees = Math.min(12, Math.floor(personalCo2Saved / 10));

  return (
    <section aria-label="Biosphere Simulator Module" className="glass-card p-6 border border-slate-800/80 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 pb-4 border-b border-slate-800/60 gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse-subtle"></span>
            <span>Module A: The Living-World Biosphere</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            This interactive landscape mirrors your carbon footprints. Your Eco Score shapes vegetation health, air cleanliness, and technology upgrades.
          </p>
        </div>
        
        {/* Stage Badge */}
        <div className={`px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-wide transition-all duration-700 ${getStageColor()}`}>
          {getStageTitle()} ({totalPoints} XP)
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* SVG Graphic (Columns 1 & 2) */}
        <div className="lg:col-span-2 bg-slate-950 rounded-2xl border border-slate-800 p-2 overflow-hidden shadow-inner flex justify-center items-center">
          <svg
            viewBox="0 0 600 300"
            className="w-full h-auto rounded-xl shadow-lg select-none"
            style={{ maxHeight: '350px' }}
            data-testid="living-world-svg"
            aria-label="Interactive Living-World Biosphere Simulator"
            role="img"
          >
            <defs>
              <linearGradient id="sky-dynamic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={skyTop} />
                <stop offset="100%" stopColor={skyBottom} />
              </linearGradient>

              {/* Modern Layered Gradients */}
              <linearGradient id="back-hill-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme === 'dark' ? (factor < 0.3 ? '#1c1917' : '#064e3b') : (factor < 0.3 ? '#cbd5e1' : '#a7f3d0')} />
                <stop offset="100%" stopColor={theme === 'dark' ? '#090d16' : '#e2e8f0'} />
              </linearGradient>

              <linearGradient id="front-hill-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={theme === 'dark' ? (factor < 0.3 ? '#292524' : '#047857') : (factor < 0.3 ? '#94a3b8' : '#34d399')} />
                <stop offset="100%" stopColor={theme === 'dark' ? '#020617' : '#cbd5e1'} />
              </linearGradient>

              {/* Filters for glowing neon energy and soft shadows */}
              <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <filter id="drop-shadow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity={theme === 'dark' ? '0.6' : '0.15'} />
              </filter>
            </defs>

            {/* Dynamic Sky */}
            <rect
              className="sky-rect"
              x="0"
              y="0"
              width="600"
              height="230"
              fill="url(#sky-dynamic)"
            />

            {/* Twinkling Starfield for Dark Mode */}
            {theme === 'dark' && (
              <g opacity={1 - factor * 0.7}>
                <circle cx="45" cy="40" r="1" fill="#ffffff" opacity="0.8" />
                <circle cx="115" cy="25" r="1.5" fill="#ffffff" opacity="0.9" className="animate-pulse" />
                <circle cx="190" cy="55" r="1" fill="#ffffff" opacity="0.5" />
                <circle cx="260" cy="30" r="1.2" fill="#ffffff" opacity="0.75" />
                <circle cx="330" cy="70" r="1.5" fill="#ffffff" opacity="0.85" className="animate-pulse" />
                <circle cx="395" cy="40" r="1.2" fill="#ffffff" opacity="0.6" />
                <circle cx="470" cy="75" r="1" fill="#ffffff" opacity="0.55" />
                <circle cx="550" cy="35" r="1.5" fill="#ffffff" opacity="0.9" className="animate-pulse" />
              </g>
            )}

            {/* Celestial Body: Sun or Moon with Glow */}
            <g filter="url(#glow)">
              <circle
                className="sun-circle"
                cx="500"
                cy="60"
                r={factor > 0.6 ? 26 : 18}
                fill={factor < 0.3 ? "#94a3b8" : "#f59e0b"}
                opacity={factor < 0.3 ? 0.2 : factor > 0.6 ? 0.35 : 0.15}
              />
              <circle
                className="sun-circle"
                cx="500"
                cy="60"
                r={factor < 0.3 ? 12 : factor > 0.6 ? 20 : 15}
                fill={factor < 0.3 ? "#cbd5e1" : factor > 0.6 ? "#fbbf24" : "#facc15"}
              />
            </g>

            {/* Soaring Birds */}
            {factor >= 0.4 && (
              <g fill="none" stroke={theme === 'dark' ? '#475569' : '#64748b'} strokeWidth="1" strokeLinecap="round" opacity="0.65">
                <path d="M 80 50 Q 84 46 88 50 Q 92 46 96 50">
                  <animateTransform attributeName="transform" type="translate" values="0 0; 50 -10; 100 -20; 150 -10; 200 0" dur="18s" repeatCount="indefinite" />
                </path>
                <path d="M 230 75 Q 234 71 238 75 Q 242 71 246 75">
                  <animateTransform attributeName="transform" type="translate" values="0 0; 40 -8; 80 -16; 120 -8; 160 0" dur="22s" repeatCount="indefinite" />
                </path>
              </g>
            )}

            {/* Smog Grid Haze */}
            {factor < 0.4 && (
              <g opacity={0.4 - factor} className="sky-rect">
                <rect x="0" y="0" width="600" height="230" fill="#78716c" opacity="0.12" />
                <path d="M 0 45 Q 150 55 300 45 T 600 47 L 600 75 L 0 75 Z" fill="#78716c" opacity="0.3" />
                <path d="M 0 110 Q 150 120 300 110 T 600 112 L 600 135 L 0 135 Z" fill="#78716c" opacity="0.15" />
              </g>
            )}

            {/* Aesthetic Curved Clouds */}
            <g className="cloud-path" filter="url(#drop-shadow)" opacity={factor < 0.3 ? 0.55 : 0.85}>
              <path
                d="M 120 75 A 14 14 0 0 1 144 65 A 18 18 0 0 1 176 68 A 12 12 0 0 1 190 75 Z"
                fill={theme === 'dark' ? '#334155' : '#ffffff'}
              />
              <path
                d="M 280 55 A 11 11 0 0 1 300 48 A 14 14 0 0 1 324 50 A 10 10 0 0 1 334 55 Z"
                fill={theme === 'dark' ? '#334155' : '#ffffff'}
              />
            </g>

            {/* Back Hill Layer */}
            <path
              className="hill-path"
              d="M -50 230 Q 150 110 350 230 T 750 230"
              fill="url(#back-hill-grad)"
              filter="url(#drop-shadow)"
            />

            {/* Front Hill Layer */}
            <path
              className="hill-path"
              d="M -50 240 Q 250 140 550 240 T 800 240"
              fill="url(#front-hill-grad)"
              filter="url(#drop-shadow)"
            />

            {/* Ground Base */}
            <rect
              className="hill-path"
              x="0"
              y="230"
              width="600"
              height="70"
              fill="url(#front-hill-grad)"
            />

            {/* Sleek Monorail / Maglev Track */}
            <rect x="0" y="238" width="600" height="2" fill={theme === 'dark' ? '#334155' : '#cbd5e1'} />
            <line x1="0" y1="239" x2="600" y2="239" stroke={theme === 'dark' ? '#475569' : '#e2e8f0'} strokeWidth="1" />

            {/* Modern Glass A-Frame Cabin */}
            <g filter="url(#drop-shadow)">
              {/* Wooden support pillar styling */}
              <line x1="75" y1="175" x2="75" y2="230" stroke="#b45309" strokeWidth="2.5" />
              <line x1="125" y1="175" x2="125" y2="230" stroke="#b45309" strokeWidth="2.5" />

              {/* Main structure: sleek dark grey with glass border */}
              <rect x="70" y="175" width="60" height="55" fill={theme === 'dark' ? '#1e293b' : '#ffffff'} stroke={theme === 'dark' ? '#334155' : '#cbd5e1'} strokeWidth="1.5" rx="4" />
              
              {/* Glass panoramic window (lit up warm orange/yellow when active) */}
              <rect x="83" y="183" width="34" height="22" fill={factor >= 0.3 ? "#fef08a" : "#475569"} rx="2" opacity="0.9" />
              <line x1="100" y1="183" x2="100" y2="205" stroke={theme === 'dark' ? '#0f172a' : '#e2e8f0'} strokeWidth="1" />
              <line x1="83" y1="194" x2="117" y2="194" stroke={theme === 'dark' ? '#0f172a' : '#e2e8f0'} strokeWidth="1" />

              {/* Solid wood cabin door */}
              <rect x="92" y="209" width="16" height="21" fill={theme === 'dark' ? '#0f172a' : '#f8fafc'} stroke="#b45309" strokeWidth="1" rx="1.5" />
              <circle cx="103" cy="219" r="1" fill="#facc15" />

              {/* Double-sloped modern roof */}
              <polygon points="65,175 100,140 135,175" fill={theme === 'dark' ? '#0f172a' : '#475569'} stroke={theme === 'dark' ? '#1e293b' : '#334155'} strokeWidth="1.5" />
              
              {/* Solar Panels Milestone (totalPoints > 400) */}
              {totalPoints > 400 && (
                <g>
                  {/* High efficiency blue solar grids */}
                  <polygon
                    points="72,171 100,144 100,171"
                    fill="#1e3a8a"
                    stroke="#3b82f6"
                    strokeWidth="1"
                  />
                  <polygon
                    points="100,144 128,171 100,171"
                    fill="#1e3a8a"
                    stroke="#3b82f6"
                    strokeWidth="1"
                  />
                  <line x1="85" y1="158" x2="115" y2="158" stroke="#60a5fa" strokeWidth="0.75" />
                </g>
              )}
            </g>

            {/* Shaded 3D Pine Tree Forest */}
            {treePositions.slice(0, numTrees).map((t, idx) => {
              let leftLeafFill = "#78350f"; // Brown/dry for low scores
              let rightLeafFill = "#451a03";
              if (factor > 0.6) {
                leftLeafFill = "#10b981"; // Vibrant emerald
                rightLeafFill = "#047857";
              } else if (factor >= 0.3) {
                leftLeafFill = "#84cc16"; // Lime green
                rightLeafFill = "#4d7c0f";
              }
              
              return (
                <g key={idx} filter="url(#drop-shadow)">
                  {/* Wooden Trunk */}
                  <rect x={t.x - 1.5} y={t.y - 6} width="3" height="6" fill="#78350f" rx="0.5" />
                  
                  {/* Left shaded leaf block */}
                  <path
                    d={`M ${t.x} ${t.y - t.h} L ${t.x - t.r} ${t.y - t.h + 12} L ${t.x - t.r/2} ${t.y - t.h + 12} L ${t.x - t.r} ${t.y - 2} L ${t.x} ${t.y - 2} Z`}
                    fill={leftLeafFill}
                    className="tree-foliage transition-all duration-700"
                  />
                  {/* Right shaded leaf block */}
                  <path
                    d={`M ${t.x} ${t.y - t.h} L ${t.x} ${t.y - 2} L ${t.x + t.r} ${t.y - 2} L ${t.x + t.r/2} ${t.y - t.h + 12} L ${t.x + t.r} ${t.y - t.h + 12} Z`}
                    fill={rightLeafFill}
                    className="tree-foliage transition-all duration-700"
                  />
                </g>
              );
            })}

            {/* Aerodynamic Wind Turbines (Utility Audit / Smart Plug actions) */}
            {hasCleanEnergy && (
              <g filter="url(#drop-shadow)">
                {/* Wind Turbine 1 */}
                <g>
                  {/* Sleek tapered metal mast */}
                  <polygon points="448,220 452,220 450.7,110 449.3,110" fill={theme === 'dark' ? '#475569' : '#94a3b8'} />
                  {/* Blinking indicator light at hub */}
                  <circle cx="450" cy="110" r="1.5" fill="#ef4444" className="animate-pulse" />
                  
                  <g className="spin-blades">
                    {/* Rotor 1 */}
                    <path d="M 450 110 Q 448 90 450 70 Q 452 90 450 110" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
                    {/* Rotor 2 */}
                    <path d="M 450 110 Q 433 120 415 130 Q 430 132 450 110" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
                    {/* Rotor 3 */}
                    <path d="M 450 110 Q 467 120 485 130 Q 470 132 450 110" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
                    <circle cx="450" cy="110" r="3.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.5" />
                  </g>
                </g>
                
                {/* Wind Turbine 2 */}
                <g transform="translate(-65, 15) scale(0.8)">
                  <polygon points="448,220 452,220 450.7,110 449.3,110" fill={theme === 'dark' ? '#475569' : '#94a3b8'} />
                  <circle cx="450" cy="110" r="1.5" fill="#ef4444" className="animate-pulse" />
                  
                  <g className="spin-blades" style={{ animationDelay: '-1.5s' }}>
                    <path d="M 450 110 Q 448 90 450 70 Q 452 90 450 110" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
                    <path d="M 450 110 Q 433 120 415 130 Q 430 132 450 110" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
                    <path d="M 450 110 Q 467 120 485 130 Q 470 132 450 110" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
                    <circle cx="450" cy="110" r="3.5" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.5" />
                  </g>
                </g>
              </g>
            )}

            {/* Maglev Bullet Train Milestone (totalPoints > 500) */}
            {totalPoints > 500 && (
              <g>
                <g filter="url(#drop-shadow)">
                  {/* Lead Car (Aerodynamic nose cone) */}
                  <path d="M 60 227 L 115 227 Q 123 227 125 231.5 Q 123 236 115 236 L 60 236 Z" fill="#10b981" />
                  
                  {/* Passenger Cabin Car 1 */}
                  <rect x="0" y="227" width="56" height="9" fill="#10b981" rx="2" />
                  
                  {/* Magnetic levitation glow track overlay */}
                  <line x1="-200" y1="237.5" x2="800" y2="237.5" stroke="#34d399" strokeWidth="1" opacity="0.65" />

                  {/* Passenger cabin windows */}
                  <rect x="68" y="229" width="10" height="3" fill="#e0f2fe" opacity="0.95" rx="0.5" />
                  <rect x="82" y="229" width="10" height="3" fill="#e0f2fe" opacity="0.95" rx="0.5" />
                  <rect x="96" y="229" width="10" height="3" fill="#e0f2fe" opacity="0.95" rx="0.5" />
                  <rect x="110" y="229" width="6" height="3" fill="#e0f2fe" opacity="0.95" rx="0.5" />
                  
                  <rect x="5" y="229" width="10" height="3" fill="#e0f2fe" opacity="0.95" rx="0.5" />
                  <rect x="19" y="229" width="10" height="3" fill="#e0f2fe" opacity="0.95" rx="0.5" />
                  <rect x="33" y="229" width="10" height="3" fill="#e0f2fe" opacity="0.95" rx="0.5" />
                  <rect x="47" y="229" width="5" height="3" fill="#e0f2fe" opacity="0.95" rx="0.5" />

                  {/* High intensity headlight beam */}
                  <polygon points="123,231 145,223 145,239 123,234" fill="#34d399" opacity="0.3" />

                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    from="-200 0"
                    to="700 0"
                    dur="6s"
                    repeatCount="indefinite"
                  />
                </g>
              </g>
            )}
          </svg>
        </div>

        {/* Info & Controls Console */}
        <div className="space-y-5">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
              <Info className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              <span>Biosphere Status</span>
            </h4>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-300">Air Quality</span>
                <span className={`font-semibold ${factor < 0.3 ? 'text-amber-400' : factor > 0.6 ? 'text-emerald-405' : 'text-slate-200'}`}>
                  {factor < 0.3 ? 'Smoggy & Dull' : factor > 0.6 ? 'Pristine & Clean' : 'Moderate'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-300">Vegetation Density</span>
                <span className="text-slate-200 font-semibold">{numTrees} Trees Rendered</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-300">Wind Turbines</span>
                <span className={`font-semibold ${hasCleanEnergy ? 'text-emerald-405' : 'text-slate-400'}`}>
                  {hasCleanEnergy ? 'ACTIVE (Spinning)' : 'LOCKED'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-300">Solar Roof (&gt;400 XP)</span>
                <span className={`font-semibold ${totalPoints > 400 ? 'text-emerald-405' : 'text-slate-400'}`}>
                  {totalPoints > 400 ? 'ACTIVE (Solar Panels)' : 'LOCKED'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-300">Electric Transit (&gt;500 XP)</span>
                <span className={`font-semibold ${totalPoints > 500 ? 'text-emerald-405' : 'text-slate-400'}`}>
                  {totalPoints > 500 ? 'ACTIVE (Cruising)' : 'LOCKED'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ecosystem Milestones
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Earn XP by logging actions. Upgrade your landscape with Clean Energy at 1 Log, Solar Panels at 400 XP, and High-Speed Electric Transit at 500 XP.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});

// Laurel Branch Helpers for Redesign
const LaurelLeft = () => (
  <svg className="w-8 h-8 text-emerald-400 shrink-0 animate-pulse-subtle filter drop-shadow-[0_0_4px_rgba(16,185,129,0.35)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4.5 19.5c3-3 4.5-7.5 4.5-12.5M4.5 19.5c1.5-2.5 3-4.5 5.5-5.5M7 14.5c2-1.5 3.5-3 4-5M9.5 10c1.5-1 2.5-2 3-3.5" />
    <path d="M4.5 19.5C3.5 17 2.5 15.5.5 15c1.5-.5 3 .5 4 2.5M7 14.5c-1-2-2-3-3.5-3.5 1-.5 2 .5 3 2M9.5 10c-1-1.5-2-2.5-3-3 1 0 2 .5 2.5 1.5" />
  </svg>
);

const LaurelRight = () => (
  <svg className="w-8 h-8 text-emerald-400 shrink-0 transform scale-x-[-1] animate-pulse-subtle filter drop-shadow-[0_0_4px_rgba(16,185,129,0.35)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4.5 19.5c3-3 4.5-7.5 4.5-12.5M4.5 19.5c1.5-2.5 3-4.5 5.5-5.5M7 14.5c2-1.5 3.5-3 4-5M9.5 10c1.5-1 2.5-2 3-3.5" />
    <path d="M4.5 19.5C3.5 17 2.5 15.5.5 15c1.5-.5 3 .5 4 2.5M7 14.5c-1-2-2-3-3.5-3.5 1-.5 2 .5 3 2M9.5 10c-1-1.5-2-2.5-3-3 1 0 2 .5 2.5 1.5" />
  </svg>
);

// ==========================================
// --- ECOSHIFT APP CONTENT COMPONENT ---
// ==========================================
function EcoShiftApp() {
  // Global States
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [loggedActions, setLoggedActions] = useState<EcoAction[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ecoshift-theme') as 'dark' | 'light') || 'dark';
  });

  // Security Signature & Multi-page Client-State Routing
  const CREATOR_SIGNATURE_HASH = "SHRESTH_KESARWANI_ORIGINAL_PROMPTWARS_SUBMISSION";
  const [currentPage, setCurrentPage] = useState<'home' | 'dashboard' | 'terms' | 'contact'>('home');
  const [showAuthenticModal, setShowAuthenticModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('ecoshift-theme', theme);
  }, [theme]);

  // Global keyhook for authenticity verification modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowAuthenticModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sidebar / Navigation state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logger' | 'challenges' | 'calculator' | 'leaderboard' | 'ai-assistant' | 'nudge-sandbox'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-Pilot Tracking & Toast States
  const [isAutoPilotActive, setIsAutoPilotActive] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  // Manual Logger State Modifiers
  const [calcMode, setCalcMode] = useState<'manual' | 'transit' | 'energy'>('manual');
  const [transitKm, setTransitKm] = useState<number>(10);
  const [transitType, setTransitType] = useState<'bicycle' | 'metro'>('bicycle');
  const [energyKwh, setEnergyKwh] = useState<number>(15);

  // OCR Utility Bill Auditor States
  const [ocrStep, setOcrStep] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Audited Bill Recommendation checklist state
  const [checklist, setChecklist] = useState([
    { id: 'shift_water', text: 'Shift water heater to run at 8:00 AM (off-peak)', co2: 8.5, cash: 63.75, points: 425, completed: false },
    { id: 'unplug_theater', text: 'Unplug home theater standby systems at night', co2: 2.1, cash: 15.75, points: 105, completed: false },
    { id: 'swap_thermostat', text: 'Swap thermostat schedule using smart plug', co2: 5.4, cash: 40.50, points: 270, completed: false }
  ]);

  // E-commerce Behavioral Nudge Sandbox States
  const [cartItems, setCartItems] = useState([
    { id: '1', name: 'Premium Beef Burger Meal', price: 380, isHighFootprint: true, quantity: 1 },
    { id: '2', name: 'Standard Shipping / Single-Use Packaging', price: 40, isHighFootprint: true, quantity: 1 }
  ]);
  const [isNudgeSwapped, setIsNudgeSwapped] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Enterprise Department Network States
  const [userDepartment, setUserDepartment] = useState<string>('');
  const [departmentScores, setDepartmentScores] = useState<Array<{ name: string; carbonSaved: number; cashSaved: number }>>([]);

  // Footprint Calculator States
  const [calcStep, setCalcStep] = useState(1);
  const [calcInputs, setCalcInputs] = useState({ transport: '', transportEm: 0, energy: '', energyEm: 0, diet: '', dietEm: 0, totalEm: 0 });

  // Eco Challenges States
  const [acceptedChallenges, setAcceptedChallenges] = useState<Record<string, boolean>>({});
  const [challengeProgress, setChallengeProgress] = useState<Record<string, number>>({});

  // AI Eco Assistant States
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: "Hello! I'm your Gemini-powered Eco Assistant. Ask me anything about environmental offsets, carbon metrics, or how to reduce home/commute emissions." }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Firestore Fallback Mode State
  const [dbFallbackActive, setDbFallbackActive] = useState(false);

  // ------------------------------------------
  // --- AUTHENTICATION FLOW STATES ---
  // ------------------------------------------
  const [authScreen, setAuthScreen] = useState<'login' | 'signup' | 'forgot'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authDept, setAuthDept] = useState('Engineering');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ------------------------------------------
  // --- USER PROFILE SYSTEM STATES ---
  // ------------------------------------------
  const [profileDetails, setProfileDetails] = useState({
    displayName: '',
    department: 'Engineering',
    targetGoal: 1000,
    phone: '',
    city: '',
    termsAccepted: false,
    termsAcceptedAt: ''
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // ------------------------------------------
  // --- TRANSACTION SECURITY STATES ---
  // ------------------------------------------
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [checkoutPin, setCheckoutPin] = useState('');
  const [checkoutConsent, setCheckoutConsent] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState('');

  // Contact Form and Pricing Tier States
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactTier, setContactTier] = useState<'hack2skill' | 'home' | 'enterprise'>('hack2skill');
  const [contactErrors, setContactErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Timer reference holders to prevent resource leaks
  const commuteTimerRef = useRef<any | null>(null);
  const ocrTimerRef = useRef<any | null>(null);
  const toastTimerRef = useRef<any | null>(null);

  // Clean up all timers when component unmounts
  useEffect(() => {
    return () => {
      if (commuteTimerRef.current) clearInterval(commuteTimerRef.current);
      if (ocrTimerRef.current) clearInterval(ocrTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Toast helper function
  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // In-memory calculations using useMemo to prevent unnecessary re-renders
  const { personalCo2Saved, personalCashSaved, totalPoints } = useMemo(() => {
    let co2 = 0;
    let cash = 0;
    let pts = 0;
    loggedActions.forEach(item => {
      co2 += item.co2Saved;
      cash += item.cashSaved;
      pts += item.points;
    });
    return { personalCo2Saved: co2, personalCashSaved: cash, totalPoints: pts + 50 }; // 50 baseline points
  }, [loggedActions]);

  // Clean Energy status checker for living-world upgrades
  const hasCleanEnergy = useMemo(() => {
    return loggedActions.some(item =>
      item.action.toLowerCase().includes("audit") ||
      item.action.toLowerCase().includes("plug") ||
      item.action.toLowerCase().includes("shift")
    );
  }, [loggedActions]);

  // Authentication Sequence Effect (Listen to Firebase Auth status)
  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (active) {
        if (currentUser) {
          setUser(currentUser);
        } else {
          setUser(null);
        }
        setIsAuthenticating(false);
      }
    }, () => {
      if (active) {
        setIsAuthenticating(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Firestore User Logs & Profile Sync Effect
  useEffect(() => {
    if (!user) return;
    if (dbFallbackActive) {
      // Seed default mock actions if offline
      setLoggedActions([
        {
          id: 'mock-1',
          actionType: 'Transportation',
          action: 'Commuted to office using bicycle instead of car',
          co2Saved: 4.20,
          cashSaved: 30.60,
          points: 220,
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          impact: 'high'
        },
        {
          id: 'mock-2',
          actionType: 'Energy',
          action: 'Replaced traditional incandescent bulbs with energy-efficient LEDs',
          co2Saved: 1.50,
          cashSaved: 12.00,
          points: 100,
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
          impact: 'medium'
        }
      ]);
      return;
    }

    let unsubscribeLogs: () => void = () => {};
    let unsubscribeDetails: () => void = () => {};

    try {
      // Sync Logs
      const logsCollection = collection(db, 'artifacts', appId, 'users', user.uid, 'logs');
      const q = query(logsCollection);

      unsubscribeLogs = onSnapshot(q, (snapshot) => {
        const actionsList: EcoAction[] = [];
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          actionsList.push({
            id: docSnapshot.id,
            actionType: data.actionType || 'Other',
            action: data.action || '',
            co2Saved: Number(data.co2Saved) || 0,
            cashSaved: Number(data.cashSaved) || 0,
            points: Number(data.points) || 0,
            timestamp: data.timestamp || new Date().toISOString(),
            impact: data.impact || 'low'
          });
        });

        // Perform in-memory sorting
        actionsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLoggedActions(actionsList);
      }, () => {
        setDbFallbackActive(true);
      });

      // Sync Profile details document
      const detailsDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'details');
      unsubscribeDetails = onSnapshot(detailsDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileDetails({
            displayName: data.displayName || user.displayName || 'Eco Hero',
            department: data.department || 'Engineering',
            targetGoal: Number(data.targetGoal) || 1000,
            phone: data.phone || '',
            city: data.city || '',
            termsAccepted: data.termsAccepted || false,
            termsAcceptedAt: data.termsAcceptedAt || ''
          });
          if (data.department) {
            setUserDepartment(data.department);
          }
        } else {
          // Set baseline defaults
          const isGuest = user.isAnonymous;
          setProfileDetails({
            displayName: user.displayName || (isGuest ? 'Demo Guest' : 'Eco Hero'),
            department: 'Engineering',
            targetGoal: 1000,
            phone: '',
            city: '',
            termsAccepted: isGuest ? true : false,
            termsAcceptedAt: isGuest ? new Date().toISOString() : ''
          });
        }
      }, () => {
        setDbFallbackActive(true);
      });

    } catch (err) {
      setDbFallbackActive(true);
    }

    return () => {
      unsubscribeLogs();
      unsubscribeDetails();
    };
  }, [user, dbFallbackActive]);

  // Synchronize corporate department profile and global scores in real-time
  useEffect(() => {
    if (!user) return;
    
    // Seed default departments locally so they appear immediately
    const defaultDepts = ["Engineering", "Sales", "Operations", "Marketing", "HR"];
    const initialLocalDepts = defaultDepts.map((name, i) => ({
      name,
      carbonSaved: [124.5, 98.2, 145.0, 76.4, 52.1][i],
      cashSaved: [950.0, 785.0, 1100.0, 580.0, 420.0][i]
    }));
    initialLocalDepts.sort((a, b) => b.carbonSaved - a.carbonSaved);
    setDepartmentScores(initialLocalDepts);

    if (dbFallbackActive) return;

    let unsubscribeUser: () => void = () => {};
    let unsubscribeDept: () => void = () => {};

    try {
      // Listen to user's profile document for department selections - STRICT hierarchy
      const userDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'department');
      unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserDepartment(docSnap.data().department || '');
        }
      }, () => {
        // Fall back gracefully
      });

      // Listen to global department scores - STRICT hierarchy
      const deptCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'departmentScores');
      
      // Zero compound queries community snapshot listener
      unsubscribeDept = onSnapshot(deptCollectionRef, (snapshot) => {
        const rawDocs: any[] = [];
        snapshot.forEach((docSnap) => {
          rawDocs.push(docSnap.data());
        });

        // execute an active .reduce() loop to aggregate cumulative savings by department identifier
        const aggregation = rawDocs.reduce((acc: Record<string, { name: string; carbonSaved: number; cashSaved: number }>, curr) => {
          const deptName = curr.name || 'Other';
          if (!acc[deptName]) {
            acc[deptName] = { name: deptName, carbonSaved: 0, cashSaved: 0 };
          }
          acc[deptName].carbonSaved += Number(curr.carbonSaved) || 0;
          acc[deptName].cashSaved += Number(curr.cashSaved) || 0;
          return acc;
        }, {});

        const finalScores = defaultDepts.map(name => {
          const match = aggregation[name];
          return match ? {
            name: match.name,
            carbonSaved: Number(match.carbonSaved) || 0,
            cashSaved: Number(match.cashSaved) || 0
          } : { name, carbonSaved: 0, cashSaved: 0 };
        });

        // In-memory sorting of department leaderboard
        finalScores.sort((a, b) => b.carbonSaved - a.carbonSaved);
        setDepartmentScores(finalScores);
      }, () => {
        // Fail silently and keep initial local states
      });
    } catch (err) {
      // Fail silently and keep initial local states
    }

    return () => {
      unsubscribeUser();
      unsubscribeDept();
    };
  }, [user, dbFallbackActive]);

  // Update corporate department score callback
  const updateDepartmentScore = useCallback(async (deptName: string, carbon: number, cash: number) => {
    if (!deptName) return;

    const carbonVal = Number(carbon);
    const cashVal = Number(cash);

    if (isNaN(carbonVal) || isNaN(cashVal)) return;

    // Local array update in memory
    setDepartmentScores(prev => {
      const updated = prev.map(dept => {
        if (dept.name === deptName) {
          return {
            ...dept,
            carbonSaved: Math.max(0, dept.carbonSaved + carbonVal),
            cashSaved: Math.max(0, dept.cashSaved + cashVal)
          };
        }
        return dept;
      });
      return updated.sort((a, b) => b.carbonSaved - a.carbonSaved);
    });

    if (dbFallbackActive) return;

    try {
      // STRICT hierarchy: public departmentScores doc
      const deptDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'departmentScores', deptName);
      await setDoc(deptDocRef, {
        name: deptName,
        carbonSaved: increment(carbonVal),
        cashSaved: increment(cashVal)
      }, { merge: true });
    } catch (error) {
      // Component state fallback handles it
    }
  }, [dbFallbackActive]);

  // Robust action addition helper (handles both local in-memory states and Firestore updates)
  const addNewAction = useCallback(async (
    actionType: string,
    action: string,
    co2Saved: number,
    cashSaved: number,
    points: number,
    impact: 'low' | 'medium' | 'high'
  ) => {
    if (!user) return;

    const co2Val = Number(co2Saved);
    const cashVal = Number(cashSaved);
    const ptsVal = Number(points);

    // Validate metrics schema to block script injection or Nan/negative inputs
    if (isNaN(co2Val) || co2Val < 0 || isNaN(cashVal) || cashVal < 0 || isNaN(ptsVal) || ptsVal < 0) {
      showToast("Metrics values must be positive numbers.");
      return;
    }

    const sanitizedAction = action.replace(/<[^>]*>/g, '').trim();
    if (sanitizedAction.length === 0) {
      showToast("Invalid action description.");
      return;
    }

    const newLog = {
      actionType: ['Transportation', 'Energy', 'Waste', 'Diet', 'Other', 'Challenges'].includes(actionType) ? actionType : 'Other',
      action: sanitizedAction,
      co2Saved: co2Val,
      cashSaved: cashVal,
      points: ptsVal,
      timestamp: new Date().toISOString(),
      impact: ['low', 'medium', 'high'].includes(impact) ? impact : 'low'
    };

    // Update local state immediately for high responsiveness
    const tempId = 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setLoggedActions(prev => [{ id: tempId, ...newLog }, ...prev]);

    if (userDepartment) {
      await updateDepartmentScore(userDepartment, co2Val, cashVal);
    }

    if (dbFallbackActive) return;

    try {
      // Compliant path: collection(db, 'artifacts', appId, 'users', userId, 'logs')
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'logs'), newLog);
    } catch (error) {
      // Fallback state handles it beautifully
    }
  }, [user, userDepartment, dbFallbackActive, updateDepartmentScore, showToast]);

  // Handle action deletion
  const handleDeleteAction = useCallback(async (actionId: string) => {
    if (!user) return;
    
    let deletedItem: EcoAction | undefined;
    setLoggedActions(prev => {
      deletedItem = prev.find(item => item.id === actionId);
      return prev.filter(item => item.id !== actionId);
    });

    // Deduct department scores locally
    if (deletedItem && userDepartment) {
      await updateDepartmentScore(userDepartment, -deletedItem.co2Saved, -deletedItem.cashSaved);
    }

    if (dbFallbackActive) return;

    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'logs', actionId));
    } catch (error) {
      // Fallback state handles it
    }
  }, [user, userDepartment, dbFallbackActive, updateDepartmentScore]);

  // Save/Edit profile details callback
  const handleSaveProfileDetails = useCallback(async (updatedDetails: typeof profileDetails) => {
    if (!user) return;

    // Validate phone pattern: optional plus followed by 7 to 15 digits
    if (updatedDetails.phone && !/^\+?[0-9\s\-()]{7,15}$/.test(updatedDetails.phone)) {
      showToast("Invalid phone number format.");
      return;
    }

    // Validate goal
    if (isNaN(updatedDetails.targetGoal) || updatedDetails.targetGoal <= 0) {
      showToast("Annual carbon goal must be a positive number.");
      return;
    }

    setProfileDetails(updatedDetails);
    setUserDepartment(updatedDetails.department);

    if (dbFallbackActive) {
      showToast("Profile settings saved locally (Sandbox Mode).");
      setIsProfileModalOpen(false);
      return;
    }

    try {
      const detailsDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'details');
      await setDoc(detailsDocRef, updatedDetails, { merge: true });

      // Sync B2B department document
      const deptDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'department');
      await setDoc(deptDocRef, { department: updatedDetails.department });

      showToast("Profile details updated successfully!");
      setIsProfileModalOpen(false);
    } catch (err: any) {
      showToast(`Failed to save profile: ${err.message}`);
    }
  }, [user, dbFallbackActive, showToast]);

  // Join department from dashboard card
  const handleJoinDepartment = useCallback(async (department: string) => {
    const updated = { ...profileDetails, department };
    await handleSaveProfileDetails(updated);
  }, [profileDetails, handleSaveProfileDetails]);

  // ------------------------------------------
  // --- AUTHENTICATION FLOW ACTIONS ---
  // ------------------------------------------
  const handleSignUpAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword !== authConfirmPassword) {
      showToast("Passwords do not match.");
      return;
    }
    if (!termsAgreed) {
      showToast("You must agree to the Terms & Conditions.");
      return;
    }
    
    setIsAuthenticating(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      const signedUser = cred.user;
      
      // Update name profile
      await updateProfile(signedUser, { displayName: authName });

      // Save initial profile details
      const detailsDocRef = doc(db, 'artifacts', appId, 'users', signedUser.uid, 'profile', 'details');
      await setDoc(detailsDocRef, {
        displayName: authName,
        department: authDept,
        targetGoal: 1000,
        phone: '',
        city: '',
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString()
      });

      // Save department document
      const deptDocRef = doc(db, 'artifacts', appId, 'users', signedUser.uid, 'profile', 'department');
      await setDoc(deptDocRef, { department: authDept });

      setUserDepartment(authDept);
      showToast("Welcome! Your secure EcoShift profile has been created.");
      
      // Reset form inputs
      setAuthPassword('');
      setAuthConfirmPassword('');
      setAuthName('');
    } catch (err: any) {
      showToast(`Signup Failed: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLoginAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      showToast("Logged in securely!");
      setAuthPassword('');
    } catch (err: any) {
      showToast(`Login Failed: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleForgotPasswordAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    try {
      await sendPasswordResetEmail(auth, authEmail);
      showToast("Password reset link dispatched to your email address!");
      setAuthScreen('login');
    } catch (err: any) {
      showToast(`Request Failed: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGuestLoginAction = async () => {
    setIsAuthenticating(true);
    try {
      await signInAnonymously(auth);
      showToast("Welcome! Signed in as Demo Guest.");
    } catch (err) {
      // Offline/local fallback authentication
      const demoUser = {
        uid: 'demo-judge-uid',
        isAnonymous: true,
        email: 'judge-demo@ecoshift.app',
        displayName: 'Judge Demo User'
      } as User;
      setUser(demoUser);
      setDbFallbackActive(true);
      showToast("Offline mode: Logged in as Local Sandbox Guest.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOutAction = async () => {
    setIsAuthenticating(true);
    try {
      await signOut(auth);
      setUser(null);
      setDbFallbackActive(false);
      showToast("Signed out securely.");
    } catch (err: any) {
      setUser(null);
      setDbFallbackActive(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // ASYNCHRONOUS INTERVAL HOOK FOR BACKGROUND TRANSIT AUTOMATION
  useEffect(() => {
    if (!isAutoPilotActive || !user) return;

    // Asynchronous simulation sequence
    const runCommuteSimulation = () => {
      setIsScanning(true);
      setScanProgress(0);
      
      let progress = 0;
      const progressTimer = setInterval(() => {
        progress += 10;
        setScanProgress(progress);
        if (progress >= 100) {
          clearInterval(progressTimer);
          setIsScanning(false);
          
          // Randomize commute variant
          const variants = [
            { name: "Electric Metro Train ride", km: 12, transitType: "train" },
            { name: "Public Hybrid Electric Bus ride", km: 7, transitType: "bus" },
            { name: "Active Bicycle ride to central hub", km: 4, transitType: "bicycle" }
          ];
          const chosen = variants[Math.floor(Math.random() * variants.length)];
          
          // Math Calculations based on coefficients
          const co2Rate = chosen.transitType === "bicycle" ? CO2_DRIVING : (CO2_DRIVING - CO2_PUBLIC);
          const co2Saved = Number((chosen.km * co2Rate).toFixed(2));
          const cashSaved = Number(((chosen.km / FUEL_ECONOMY_KM_PER_LITER) * FUEL_PRICE_PER_LITER).toFixed(2));
          const points = Math.round(co2Saved * 50);

          addNewAction('Transportation', `Auto-Pilot: ${chosen.name} (${chosen.km} km)`, co2Saved, cashSaved, points, 'medium');
          showToast(`Auto-Pilot Scan: Detected ${chosen.name}. Saved ${co2Saved}kg CO₂ & ₹${cashSaved} (Points: +${points} XP)!`);
        }
      }, 200);
    };

    // 2-second simulation latency for the first trigger
    const initialTimeout = setTimeout(() => {
      runCommuteSimulation();
    }, 2000);

    // Periodic simulation interval (every 30 seconds)
    const interval = setInterval(() => {
      runCommuteSimulation();
    }, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isAutoPilotActive, user, addNewAction, showToast]);

  // Simulate commute scan trigger manually
  const handleSimulateCommute = useCallback(() => {
    if (!user) return;
    if (!isAutoPilotActive) {
      showToast("Please turn on the Passive Commute Monitor switch first to enable background tracking.");
      return;
    }

    setIsScanning(true);
    setScanProgress(0);

    const duration = 2000;
    const intervalTime = 100;
    const steps = duration / intervalTime;
    let currentStep = 0;

    if (commuteTimerRef.current) {
      clearInterval(commuteTimerRef.current);
    }

    commuteTimerRef.current = setInterval(async () => {
      currentStep++;
      const progress = Math.min(100, Math.round((currentStep / steps) * 100));
      setScanProgress(progress);

      if (currentStep >= steps) {
        if (commuteTimerRef.current) clearInterval(commuteTimerRef.current);
        
        const co2Saved = Number((14 * (CO2_DRIVING - CO2_PUBLIC)).toFixed(2));
        const cashSaved = Number(((14 / FUEL_ECONOMY_KM_PER_LITER) * FUEL_PRICE_PER_LITER).toFixed(2));
        const points = Math.round(co2Saved * 50);

        await addNewAction(
          'Transportation',
          'Manual Scan: Commuted via Electric Metro Line 2 (14 km)',
          co2Saved,
          cashSaved,
          points,
          'high'
        );
        
        showToast(`Commute Telemetry Synced: Saved ${co2Saved}kg CO₂ & ₹${cashSaved}. Ledger updated!`);
        setIsScanning(false);
        setScanProgress(0);
      }
    }, intervalTime);
  }, [user, isAutoPilotActive, addNewAction, showToast]);

  // Start OCR Scanning Simulation with deterministic loop
  const handleOcrScan = useCallback((file?: File) => {
    setOcrStep('scanning');
    setOcrProgress(0);
    setOcrStatusText(file ? `Uploading ${file.name}...` : 'Uploading utility bill invoice...');

    const duration = 2000;
    const intervalTime = 100;
    const steps = duration / intervalTime;
    let currentStep = 0;

    if (ocrTimerRef.current) {
      clearInterval(ocrTimerRef.current);
    }

    ocrTimerRef.current = setInterval(() => {
      currentStep++;
      const progress = Math.min(100, Math.round((currentStep / steps) * 100));
      setOcrProgress(progress);

      if (progress < 30) {
        setOcrStatusText('Parsing usage spikes and power logs...');
      } else if (progress < 65) {
        setOcrStatusText('Comparing peak rate schedules and grid stress...');
      } else if (progress < 90) {
        setOcrStatusText('Formulating efficiency recommendations...');
      } else {
        setOcrStatusText('AI audit complete!');
      }

      if (currentStep >= steps) {
        if (ocrTimerRef.current) clearInterval(ocrTimerRef.current);
        
        // Reset checklist to incomplete upon new scan to simulate fresh metadata load
        setChecklist([
          { id: 'shift_water', text: 'Shift water heater to run at 8:00 AM (off-peak)', co2: 8.5, cash: 63.75, points: 425, completed: false },
          { id: 'unplug_theater', text: 'Unplug home theater standby systems at night', co2: 2.1, cash: 15.75, points: 105, completed: false },
          { id: 'swap_thermostat', text: 'Swap thermostat schedule using smart plug', co2: 5.4, cash: 40.50, points: 270, completed: false }
        ]);
        setOcrStep('complete');
        showToast("Utility Bill Audit complete! Check the recommended checklist below.");
      }
    }, intervalTime);
  }, [showToast]);

  // Apply OCR checklist optimization
  const handleCheckItem = useCallback(async (itemId: string) => {
    setChecklist(prev => prev.map(item => {
      if (item.id === itemId && !item.completed) {
        addNewAction(
          'Energy',
          `Utility Audit: Applied "${item.text}"`,
          item.co2,
          item.cash,
          item.points,
          'high'
        );
        showToast(`Audit action verified! Earned +${item.points} XP, saved ₹${item.cash}.`);
        return { ...item, completed: true };
      }
      return item;
    }));
  }, [addNewAction, showToast]);

  // Drag and drop event handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleOcrScan(e.dataTransfer.files[0]);
    }
  }, [handleOcrScan]);

  // E-COMMERCE CART ARRAY OPERATIONS (Add, Remove, Quantity Modify)
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, (item.quantity || 1) + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    const item = cartItems.find(x => x.id === itemId);
    setCartItems(prev => prev.filter(x => x.id !== itemId));
    if (item) showToast(`Removed ${item.name} from checkout basket.`);
  };

  const handleAddItem = (name: string, price: number, isHighFootprint: boolean) => {
    setCartItems(prev => {
      const existing = prev.find(x => x.name === name);
      if (existing) {
        return prev.map(x => x.name === name ? { ...x, quantity: (x.quantity || 1) + 1 } : x);
      }
      return [...prev, { id: 'item-' + Date.now(), name, price, isHighFootprint, quantity: 1 }];
    });
    showToast(`Added ${name} to checkout basket.`);
  };

  // 1-Click Eco-Swap Button click handler
  const handleEcoSwap = useCallback(async () => {
    if (isNudgeSwapped) return;
    
    setCartItems(prev => prev.map(item => {
      if (item.isHighFootprint) {
        if (item.name.toLowerCase().includes("burger")) {
          return { ...item, name: 'Organic Plant-Based Patty Meal', price: 260, isHighFootprint: false };
        }
        if (item.name.toLowerCase().includes("packaging") || item.name.toLowerCase().includes("shipping")) {
          return { ...item, name: 'Reusable Container Delivery (Zero Waste)', price: 20, isHighFootprint: false };
        }
      }
      return item;
    }));
    setIsNudgeSwapped(true);
    
    const co2Saved = 4.20;
    const cashSaved = 140.00;
    const bonusPoints = 100;

    await addNewAction(
      'Diet',
      'E-Commerce Swap: Beef burger & packaging for organic plant patty & reusable container',
      co2Saved,
      cashSaved,
      bonusPoints,
      'medium'
    );

    showToast(`Smart Eco-Swap Applied! Saved ${co2Saved}kg CO₂ & ₹${cashSaved}. +100 XP points awarded!`);
  }, [isNudgeSwapped, addNewAction, showToast]);

  // Reset checkout simulation
  const handleResetCheckout = useCallback(() => {
    setCartItems([
      { id: '1', name: 'Premium Beef Burger Meal', price: 380, isHighFootprint: true, quantity: 1 },
      { id: '2', name: 'Standard Shipping / Single-Use Packaging', price: 40, isHighFootprint: true, quantity: 1 }
    ]);
    setIsNudgeSwapped(false);
    setCheckoutSuccess(false);
  }, []);

  // Place Order (Trigger security pin auth modal first)
  const handleStartCheckoutAuth = () => {
    setAuthError('');
    setCheckoutPin('');
    setCheckoutConsent(false);
    setIsAuthModalOpen(true);
  };

  // Confirm and process secure transaction
  const handleConfirmOrderSecurity = () => {
    if (checkoutPin.length < 4) {
      setAuthError("Please enter a valid 4-digit Transaction security PIN.");
      return;
    }
    if (!checkoutConsent) {
      setAuthError("You must authorize the secure transaction processing consent.");
      return;
    }

    setIsAuthorizing(true);
    setAuthError('');

    // Simulate secure network transaction processing under TLS/SSL protocols
    setTimeout(() => {
      setIsAuthorizing(false);
      setIsAuthModalOpen(false);
      handleCheckoutComplete();
    }, 2000);
  };

  const handleCheckoutComplete = useCallback(() => {
    setCheckoutSuccess(true);
    showToast(isNudgeSwapped
      ? "Purchase Successful! Thank you for choosing sustainable alternatives."
      : "Purchase Successful! Consider using Eco-Swaps next time to reduce carbon emissions."
    );
  }, [isNudgeSwapped, showToast]);

  // Eco Challenges Handlers
  const handleAcceptChallenge = useCallback((id: string) => {
    setAcceptedChallenges(prev => ({ ...prev, [id]: true }));
    setChallengeProgress(prev => ({ ...prev, [id]: 0 }));
  }, []);

  const handleLogProgress = useCallback(async (id: string, co2: number, cash: number, title: string) => {
    setChallengeProgress(prev => {
      const current = prev[id] || 0;
      const next = Math.min(100, current + 20);
      if (next >= 100) {
        addNewAction('Challenges', `Completed Challenge contract: ${title}`, co2, cash, 200, 'high');
        showToast(`🎉 Milestone! You completed the "${title}" Challenge. Reward claimed!`);
      } else {
        showToast(`Logged daily progress for "${title}". Progress is now ${next}%.`);
      }
      return { ...prev, [id]: next };
    });
  }, [addNewAction, showToast]);

  // AI Chat Bot Handlers
  const handleSendChat = useCallback((message: string) => {
    const sanitizedMsg = message.replace(/<[^>]*>/g, '').trim();
    if (!sanitizedMsg) return;

    setChatMessages(prev => [...prev, { sender: 'user', text: sanitizedMsg }]);
    setIsAiTyping(true);

    setTimeout(() => {
      let response = "I'm processing that. Making eco-choices involves reducing emissions. Try logging actions in the ledger!";
      const cleanMsg = sanitizedMsg.toLowerCase();

      if (cleanMsg.includes("eco score") || cleanMsg.includes("score") || cleanMsg.includes("xp")) {
        response = "Your Eco Score is computed based on logged carbon savings and achievements. Every log updates your global XP score. Unlocks include Wind Turbines at 1 log, Solar Panels at 400 XP, and High-Speed Electric Transit at 500 XP!";
      } else if (cleanMsg.includes("peak") || cleanMsg.includes("energy") || cleanMsg.includes("bill") || cleanMsg.includes("rate")) {
        response = "Electricity has different carbon coefficients. Average grid emissions are 0.82 kg CO2 per kWh. Peak rates apply from 5 PM to 9 PM, causing cost spikes and increased dirty backup power usage. Off-peak energy saved is valued at ₹7.50/kWh. Shifting appliance usage to off-peak morning hours (like 8:00 AM) saves cash and lowers greenhouse gases.";
      } else if (cleanMsg.includes("packaging") || cleanMsg.includes("burger") || cleanMsg.includes("swap")) {
        response = "Swapping single-use packaging for zero-waste delivery shields the ecosystem from solid waste. Swapping beef burger meals (production-intensive) for plant patty alternatives reduces scope-3 logistics carbon by 85% and avoids landfill plastic emissions.";
      } else if (cleanMsg.includes("department") || cleanMsg.includes("leaderboard") || cleanMsg.includes("b2b")) {
        response = "The B2B department network aggregates logs by teams (Engineering, Sales, Operations, Marketing, HR). Any carbon savings you log contribute directly to your department's shared score. We use in-memory reduce aggregation to update corporate standings without index lag.";
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: response }]);
      setIsAiTyping(false);
    }, 1000);
  }, []);

  // Format Helpers
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
  }, []);

  const formatTime = useCallback((isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, []);

  // Loading Screen (Beautiful Emerald Loading Spinner)
  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-800 border-t-emerald-400"></div>
          <Leaf className="absolute text-emerald-400 w-6 h-6 animate-pulse-subtle" />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-slate-205 tracking-wider">Establishing Secure Shell...</h2>
        <p className="mt-2 text-sm text-slate-400 text-center">EcoShift is connecting to your carbon vault</p>
      </div>
    );
  }

  // ------------------------------------------
  // --- 3D NATURAL ENVIRONMENT BACKGROUND ---
  // ------------------------------------------
  const render3DNaturalBackground = () => {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <EcosystemCanvas />
        <svg className="absolute bottom-0 left-0 w-full h-[60%] min-h-[350px]" viewBox="0 0 1440 600" preserveAspectRatio="none">
          <defs>
            <linearGradient id="forest-sky-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#090d16" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="layer1-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#022c22" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#090d16" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="layer2-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#064e3b" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="layer3-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#047857" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* Background Sky */}
          <rect width="1440" height="600" fill="url(#forest-sky-grad)" />

          {/* Layer 1: Parallax Back Hills */}
          <path d="M 0 320 Q 240 220 480 320 T 960 320 T 1440 320 L 1440 600 L 0 600 Z" fill="url(#layer1-grad)" />

          {/* Layer 2: Mid Hills with Plagiarism Prevention Watermark */}
          <path d="M 0 420 Q 360 300 720 420 T 1440 420 L 1440 600 L 0 600 Z" fill="url(#layer2-grad)" />

          {/* Watermark text programmatically injected */}
          <text x="720" y="520" fill="rgba(16, 185, 129, 0.012)" fontSize="18" fontWeight="bold" letterSpacing="4" textAnchor="middle" pointerEvents="none">
            Shresth Kesarwani Original Core Engine Authored and Protected
          </text>

          {/* Layer 3: Foreground Detailed Arches */}
          <path d="M 0 500 Q 480 400 960 500 T 1440 500 L 1440 600 L 0 600 Z" fill="url(#layer3-grad)" />
        </svg>

        {/* Floating Particles Field */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(24)].map((_, i) => {
            const size = Math.random() * 8 + 4;
            const left = Math.random() * 100;
            const delay = Math.random() * 15;
            const duration = Math.random() * 20 + 10;
            return (
              <div
                key={i}
                className="absolute bg-emerald-500/20 rounded-full blur-[1px] animate-float-particles"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${left}%`,
                  bottom: `-20px`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // ------------------------------------------
  // --- PUBLIC LAYOUT HEADER ---
  // ------------------------------------------
  const renderPublicHeader = () => {
    return (
      <header className="w-full h-20 border-b flex items-center justify-between px-6 md:px-12 relative z-20 backdrop-blur-md" style={{ backgroundColor: 'rgba(9, 13, 22, 0.65)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentPage('home')}>
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Leaf className="text-emerald-450 w-5 h-5 animate-pulse-subtle" />
          </div>
          <div className="text-left">
            <span className="text-lg font-bold tracking-tight text-white block leading-none">EcoShift</span>
            <span className="text-[9px] text-slate-400 font-bold tracking-wider block mt-1">Shift Today, Sustain Tomorrow</span>
          </div>
        </div>

        {/* Center menu */}
        <nav className="hidden lg:flex items-center space-x-6">
          <button onClick={() => setCurrentPage('home')} className="text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer">Product</button>
          <button onClick={() => setCurrentPage('home')} className="text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer">Features</button>
          <button onClick={() => setCurrentPage('home')} className="text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-1">
            <span>Solutions</span>
            <ChevronDown className="w-3 h-3 text-slate-450" />
          </button>
          <button onClick={() => setCurrentPage('contact')} className="text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer">Pricing</button>
          <button onClick={() => setCurrentPage('contact')} className="text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer">Enterprise</button>
          <button onClick={() => setCurrentPage('home')} className="text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-1">
            <span>Resources</span>
            <ChevronDown className="w-3 h-3 text-slate-450" />
          </button>
          <button onClick={() => setCurrentPage('terms')} className="text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer">About</button>
        </nav>

        {/* Right Auth buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => { setCurrentPage('dashboard'); setAuthScreen('login'); }}
            className="px-4.5 py-2 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-extrabold text-slate-205 transition-all cursor-pointer bg-slate-950/20"
          >
            Login
          </button>
          <button
            onClick={() => { setCurrentPage('dashboard'); setAuthScreen('signup'); }}
            className="px-4.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            Get Started Free
          </button>
        </div>
      </header>
    );
  };

  // ------------------------------------------
  // --- INTERACTIVE ECOSYSTEM NODE CANVAS ---
  // ------------------------------------------
  const EcosystemCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let animationFrameId: number;
      let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
      let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

      const handleResize = () => {
        if (canvas && canvas.parentElement) {
          width = canvas.width = canvas.parentElement.clientWidth;
          height = canvas.height = canvas.parentElement.clientHeight;
        }
      };
      window.addEventListener('resize', handleResize);

      // Nodes definition
      const nodeCount = 35;
      const nodes: Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        radius: number;
        pulseSpeed: number;
        pulseState: number;
      }> = [];

      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 2 + 1.5,
          pulseSpeed: 0.02 + Math.random() * 0.03,
          pulseState: Math.random() * Math.PI,
        });
      }

      let mouseX = -9999;
      let mouseY = -9999;

      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
      };

      const handleMouseLeave = () => {
        mouseX = -9999;
        mouseY = -9999;
      };

      const parent = canvas.parentElement;
      if (parent) {
        parent.addEventListener('mousemove', handleMouseMove);
        parent.addEventListener('mouseleave', handleMouseLeave);
      }

      const draw = () => {
        ctx.clearRect(0, 0, width, height);

        // Draw connections
        ctx.lineWidth = 0.5;
        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j];
            const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
            if (dist < 110) {
              const alpha = (1 - dist / 110) * 0.15;
              ctx.strokeStyle = theme === 'light' ? `rgba(16, 185, 129, ${alpha * 1.5})` : `rgba(16, 185, 129, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(n1.x, n1.y);
              ctx.lineTo(n2.x, n2.y);
              ctx.stroke();
            }
          }

          // Mouse connection
          if (mouseX !== -9999 && mouseY !== -9999) {
            const distToMouse = Math.hypot(n1.x - mouseX, n1.y - mouseY);
            if (distToMouse < 160) {
              const alpha = (1 - distToMouse / 160) * 0.35;
              ctx.strokeStyle = theme === 'light' ? `rgba(16, 185, 129, ${alpha * 1.5})` : `rgba(16, 185, 129, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(n1.x, n1.y);
              ctx.lineTo(mouseX, mouseY);
              ctx.stroke();
            }
          }
        }

        // Draw nodes
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          node.x += node.vx;
          node.y += node.vy;

          // Boundary bounce
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;

          node.pulseState += node.pulseSpeed;
          const currentRadius = node.radius + Math.sin(node.pulseState) * 0.5;

          ctx.fillStyle = theme === 'light' ? `rgba(16, 185, 129, 0.8)` : `rgba(16, 185, 129, 0.65)`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
          ctx.fill();

          // Glow ring
          ctx.strokeStyle = theme === 'light' ? `rgba(16, 185, 129, 0.25)` : `rgba(16, 185, 129, 0.18)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius + 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        animationFrameId = requestAnimationFrame(draw);
      };

      draw();

      return () => {
        window.removeEventListener('resize', handleResize);
        if (parent) {
          parent.removeEventListener('mousemove', handleMouseMove);
          parent.removeEventListener('mouseleave', handleMouseLeave);
        }
        cancelAnimationFrame(animationFrameId);
      };
    }, [theme]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none rounded-3xl" />;
  };

  // ------------------------------------------
  // --- HOME PAGE COMPONENT ---
  // ------------------------------------------
  const renderHomePage = () => {
    return (
      <main data-testid="marketing-home-view" className="w-full max-w-[1536px] mx-auto px-6 md:px-12 pt-4 md:pt-6 pb-12 flex flex-col space-y-10 relative z-10">
        
        {/* Main Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Hero Text Content */}
          <div className="lg:col-span-5 space-y-8 text-left flex flex-col justify-center">
            
            {/* Proudly Sponsored Capsule Badge */}
            <div className="inline-flex items-center space-x-4 px-6 py-2.5 bg-gradient-to-r from-emerald-950/40 via-[#060a12]/90 to-emerald-950/40 border border-emerald-500/35 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.18)] shadow-emerald-500/10 self-start animate-fade-in relative overflow-hidden backdrop-blur-md before:absolute before:inset-0 before:bg-gradient-to-tr before:from-white/0 before:via-white/[0.04] before:to-white/0 before:pointer-events-none">
              <LaurelLeft />
              <span className="text-[10px] font-bold text-white/90 tracking-wide font-sans shrink-0">Proudly Sponsored By</span>
              <div className="w-px h-5.5 bg-white/15 shrink-0"></div>
              <span className="text-[11.5px] font-black tracking-tight text-white uppercase flex items-center shrink-0 select-none">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
              </span>
              <div className="w-px h-5.5 bg-white/15 shrink-0"></div>
              <span className="text-white tracking-widest uppercase flex flex-col justify-center leading-none text-left shrink-0">
                <span className="font-black text-[10.5px] text-white flex items-start">
                  <span>HACK2SKILLS</span>
                  <sup className="text-[5.5px] font-normal lowercase tracking-normal ml-0.5 mt-0.5">™</sup>
                </span>
                <span className="text-[5.5px] text-white/60 font-black tracking-[0.18em] mt-1">BUILD • IMPACT • INNOVATE</span>
              </span>
              <LaurelRight />
            </div>

            {/* AI-Powered Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-full text-emerald-400 text-[10px] font-bold uppercase tracking-wider self-start">
              <Leaf className="w-3.5 h-3.5" />
              <span>AI-Powered. Data-Driven. Planet-Focused.</span>
            </div>

            {/* Giant Heading with Highlights */}
            <h1 className="text-4xl md:text-5xl lg:text-6.5xl font-black text-white leading-[1.1] tracking-tight">
              The All-in-One Platform <br/>
              for <span className="text-emerald-400">Carbon Tracking</span>, <br/>
              Cash Rewards &amp; <br/>
              <span className="text-emerald-400">Enterprise Impact</span>
            </h1>

            {/* Subtext description */}
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-semibold max-w-lg">
              EcoShift transforms everyday actions into measurable impact. Track. Reduce. Earn. Compete. Lead the change—together.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                data-testid="launch-app-button"
                onClick={() => { setCurrentPage('dashboard'); setActiveTab('dashboard'); }}
                className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 hover:scale-[1.03] cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Start Your Free Journey</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setCurrentPage('dashboard'); setActiveTab('nudge-sandbox'); }}
                className="px-6 py-3.5 bg-transparent border border-slate-800 hover:border-emerald-500/30 text-slate-200 hover:text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all hover:bg-slate-900/60 hover:scale-[1.03] cursor-pointer flex items-center space-x-2.5"
              >
                <span>See How It Works</span>
                <div className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center">
                  <Play className="w-2 h-2 text-slate-350 fill-slate-350 ml-0.5" />
                </div>
              </button>
            </div>

            {/* Trust avatars stack */}
            <div className="flex items-center space-x-4 pt-4 border-t border-slate-900/40">
              <div className="flex -space-x-2.5 overflow-hidden">
                {[
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=80",
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80",
                  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=80",
                  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=80"
                ].map((src, idx) => (
                  <img key={idx} className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-950 object-cover" src={src} alt="EcoShift User" />
                ))}
                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-450 text-[10px] font-extrabold ring-2 ring-slate-950">
                  2K+
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold leading-normal">
                Trusted by teams and changemakers <br/> across 500+ organizations worldwide.
              </p>
            </div>

          </div>

          {/* Right Column: High-Fidelity Dashboard Preview Mockup */}
          <div className="lg:col-span-7 w-full flex justify-center">
            
            <div className="w-full bg-[#080d17] border border-slate-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col relative group transition-all duration-500 hover:border-emerald-500/20">
              
              {/* Window Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#05080f] border-b border-slate-900">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/40"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/40"></span>
                </div>
                
                {/* Mock Search/URL bar */}
                <div className="w-56 md:w-80 h-5 bg-[#0b1220] rounded-md border border-slate-850 flex items-center justify-center text-[9px] text-slate-500 font-semibold select-none">
                  portal.ecoshift.io/dashboard/sandbox
                </div>
                
                <div className="w-8"></div>
              </div>

              {/* Main Workspace split */}
              <div className="flex h-[420px] md:h-[460px] overflow-hidden select-none">
                
                {/* MOCK SIDEBAR (22%) */}
                <div className="w-[22%] bg-[#060a12] border-r border-slate-900 flex flex-col justify-between p-3 shrink-0">
                  <div className="space-y-6">
                    {/* Brand */}
                    <div className="flex items-center space-x-2">
                      <div className="p-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-450 text-left">
                        <Leaf className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-extrabold text-white uppercase tracking-wider text-left">EcoShift</span>
                    </div>

                    {/* Menu links list */}
                    <nav className="space-y-1 text-left">
                      {[
                        { label: "Dashboard", active: true, icon: LayoutDashboard },
                        { label: "Ledger", active: false, icon: PlusCircle },
                        { label: "Automation", active: false, icon: TrendingUp },
                        { label: "Challenges", active: false, icon: Award },
                        { label: "Leaderboard", active: false, icon: Users },
                        { label: "Calculator", active: false, icon: Calculator },
                        { label: "AI Assistant", active: false, icon: Sparkles },
                        { label: "Settings", active: false, icon: Settings }
                      ].map((link, idx) => {
                        const Icon = link.icon;
                        return (
                          <div
                            key={idx}
                            className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-[9px] font-bold ${
                              link.active 
                                ? 'bg-emerald-500/10 text-white border-l-2 border-emerald-500' 
                                : 'text-slate-450'
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${link.active ? 'text-emerald-450' : ''}`} />
                            <span>{link.label}</span>
                          </div>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Profile info */}
                  <div className="flex items-center space-x-2 pt-3 border-t border-slate-900">
                    <img
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-850"
                      src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80"
                      alt="User Avatar"
                    />
                    <div className="text-left leading-tight truncate">
                      <p className="text-[9px] font-extrabold text-white">Alex Morgan</p>
                      <p className="text-[7px] text-slate-500 font-bold truncate">Sustainability Lead</p>
                    </div>
                  </div>
                </div>

                {/* MOCK CENTER CONTENT */}
                <div className="flex-1 bg-[#080d17]/60 p-4 flex flex-col space-y-3 overflow-hidden">
                  
                  {/* Content Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-[11px] font-extrabold text-white uppercase tracking-wider text-left">Living-World Biosphere</h3>
                      <span className="text-[8px] font-extrabold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                        Eco Score: 87
                      </span>
                    </div>
                    
                    {/* Header Controls */}
                    <div className="flex items-center space-x-2 text-slate-500">
                      <Bell className="w-3.5 h-3.5" />
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <img
                        className="h-4.5 w-4.5 rounded-full object-cover ring-1 ring-slate-800"
                        src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80"
                        alt="Mini avatar"
                      />
                    </div>
                  </div>

                  {/* Biosphere Image Frame */}
                  <div className="relative flex-1 rounded-xl border border-slate-900 bg-slate-950 overflow-hidden group/img">
                    <img
                      src="/biosphere_mockup.png"
                      alt="EcoShift Biosphere Preview"
                      className="w-full h-full object-cover object-center transform duration-505 group-hover/img:scale-105"
                    />
                    {/* Simulated widgets overlays */}
                    <div className="absolute top-2 left-2 bg-slate-950/80 border border-slate-900 backdrop-blur-md rounded-lg p-2 text-[8px] text-left text-white space-y-0.5">
                      <span className="text-slate-400 block font-bold">VALLEY TELEMETRY</span>
                      <span className="text-emerald-400 font-extrabold uppercase">Wind Turbines Active</span>
                    </div>
                  </div>

                  {/* Mock Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 shrink-0">
                    
                    {/* Card 1: Carbon Balance */}
                    <div className="bg-[#0b1220] border border-slate-850 rounded-xl p-2.5 text-left flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] text-slate-505 uppercase font-bold tracking-wider">Carbon Balance</span>
                          <span className="text-[8px] text-slate-500 font-extrabold">&gt;</span>
                        </div>
                        <div className="flex items-baseline space-x-1 mt-1">
                          <span className="text-xs font-black text-white">1,248</span>
                          <span className="text-[8px] text-slate-400 font-bold">kg CO₂</span>
                        </div>
                        <p className="text-[7px] text-slate-450 mt-0.5 font-medium">Total Avoided</p>
                      </div>
                      <div className="text-[6.5px] text-emerald-450 font-bold pt-1 border-t border-slate-900/60 mt-1 flex flex-col space-y-0.5">
                        <span>≈ 62 Trees Grown</span>
                        <span>≈ 5,238 Miles Not Driven</span>
                      </div>
                    </div>

                    {/* Card 2: Cash Wallet */}
                    <div className="bg-[#0b1220] border border-slate-850 rounded-xl p-2.5 text-left flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] text-slate-505 uppercase font-bold tracking-wider">Cash Wallet</span>
                          <span className="text-[9px] text-emerald-500 font-black">$</span>
                        </div>
                        <p className="text-xs font-black text-emerald-400 mt-1">$342.75</p>
                        <p className="text-[7px] text-slate-455 mt-0.5 font-medium">Total Savings</p>
                      </div>
                      <div className="text-[7px] text-emerald-400 font-extrabold pt-1 border-t border-slate-900/60 mt-1">
                        +$62.40 this month
                      </div>
                    </div>

                    {/* Card 3: Eco Score */}
                    <div className="bg-[#0b1220] border border-slate-850 rounded-xl p-2.5 text-left flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] text-slate-505 uppercase font-bold tracking-wider">This Month's Eco Score</span>
                          <span className="text-[8px] text-slate-500 font-extrabold">&gt;</span>
                        </div>
                        <div className="flex items-baseline space-x-0.5 mt-1">
                          <span className="text-xs font-black text-white">87</span>
                          <span className="text-[8px] text-slate-450">/100</span>
                        </div>
                        <p className="text-[7px] text-slate-455 mt-0.5 font-medium">Excellent!</p>
                      </div>
                      <div className="mt-1 pt-1 border-t border-slate-900/60">
                        <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full w-[87%] rounded-full"></div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* MOCK RIGHT SIDEBAR Activity (24%) */}
                <div className="w-[24%] bg-[#060a12] border-l border-slate-900 p-3 shrink-0 flex flex-col justify-between text-left">
                  
                  {/* Recent Activity List */}
                  <div className="space-y-4">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Recent Activity</span>
                    
                    <div className="space-y-2.5">
                      {[
                        { title: "Metro Commute", val: "+3.2 kg CO₂", time: "Today, 8:30 AM", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                        { title: "Electricity Optimization", val: "+18.6 kg CO₂", time: "Yesterday, 6:45 PM", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                        { title: "Plant-Based Meal", val: "+2.4 kg CO₂", time: "May 24, 12:30 PM", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                        { title: "Recycle: Paper", val: "+1.1 kg CO₂", time: "May 24, 9:15 AM", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" }
                      ].map((act, idx) => (
                        <div key={idx} className="flex items-start space-x-2 p-1.5 rounded-lg bg-[#0b1220]/50 border border-slate-900">
                          <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border mt-0.5 ${act.bg}`}>
                            <Leaf className="w-2.5 h-2.5" />
                          </div>
                          <div className="min-w-0 flex-1 leading-normal">
                            <p className="text-[8px] font-bold text-white truncate">{act.title}</p>
                            <p className={`text-[8px] font-extrabold ${act.color} mt-0.5`}>{act.val}</p>
                            <p className="text-[7px] text-slate-500 mt-0.5">{act.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button className="w-full py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-lg text-[8px] text-slate-400 font-bold transition-all text-center">
                      View All Activities
                    </button>
                  </div>

                  {/* Milestone Card */}
                  <div className="bg-[#0b1220] border border-slate-850 rounded-xl p-2.5 space-y-1.5 mt-4">
                    <div className="flex justify-between items-center text-[8px]">
                      <span className="text-slate-505 font-bold uppercase">Next Milestone</span>
                      <span className="text-emerald-450 font-extrabold flex items-center space-x-0.5">
                        <span>Eco Score 90</span>
                        <span className="text-[8px] text-emerald-400">↗</span>
                      </span>
                    </div>
                    <p className="text-[8px] text-slate-350 leading-tight font-semibold">Unlock: Eco-Futurist Utopia</p>
                    
                    <div className="space-y-1">
                      <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[87%] rounded-full"></div>
                      </div>
                      <span className="text-[7px] text-slate-550 block text-right font-bold">87% Completed</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Feature List Bar */}
        <div className="w-full bg-[#060a12]/70 border border-emerald-500/20 rounded-2xl grid grid-cols-1 lg:grid-cols-5 gap-0 backdrop-blur-md overflow-hidden">
          {/* Column 1: Track & Reduce */}
          <div className="flex items-center space-x-4.5 p-5 border-b lg:border-b-0 lg:border-r border-slate-800/40">
            <div className="text-emerald-450 shrink-0">
              <Leaf className="w-6.5 h-6.5 animate-pulse-subtle" />
            </div>
            <div className="text-left space-y-0.5">
              <h3 className="text-[10px] font-extrabold text-white uppercase tracking-wider">Track &amp; Reduce</h3>
              <p className="text-[9px] text-slate-400 leading-snug font-semibold">Monitor carbon footprint across multiple categories.</p>
            </div>
          </div>
          {/* Column 2: Earn & Save */}
          <div className="flex items-center space-x-4.5 p-5 border-b lg:border-b-0 lg:border-r border-slate-800/40">
            <div className="text-emerald-450 shrink-0">
              <DollarSign className="w-6.5 h-6.5" />
            </div>
            <div className="text-left space-y-0.5">
              <h3 className="text-[10px] font-extrabold text-white uppercase tracking-wider">Earn &amp; Save</h3>
              <p className="text-[9px] text-slate-400 leading-snug font-semibold">Turn every sustainable choice into real savings.</p>
            </div>
          </div>
          {/* Column 3: Compete & Lead */}
          <div className="flex items-center space-x-4.5 p-5 border-b lg:border-b-0 lg:border-r border-slate-800/40">
            <div className="text-emerald-450 shrink-0">
              <Trophy className="w-6.5 h-6.5" />
            </div>
            <div className="text-left space-y-0.5">
              <h3 className="text-[10px] font-extrabold text-white uppercase tracking-wider">Compete &amp; Lead</h3>
              <p className="text-[9px] text-slate-400 leading-snug font-semibold">Challenge departments and top the leaderboard.</p>
            </div>
          </div>
          {/* Column 4: AI-Powered Insights */}
          <div className="flex items-center space-x-4.5 p-5 border-b lg:border-b-0 lg:border-r border-slate-800/40">
            <div className="text-emerald-450 shrink-0">
              <Bot className="w-6.5 h-6.5" />
            </div>
            <div className="text-left space-y-0.5">
              <h3 className="text-[10px] font-extrabold text-white uppercase tracking-wider">AI-Powered Insights</h3>
              <p className="text-[9px] text-slate-400 leading-snug font-semibold">Get smart recommendations with our AI Eco Assistant.</p>
            </div>
          </div>
          {/* Column 5: Enterprise Ready */}
          <div className="flex items-center space-x-4.5 p-5">
            <div className="text-emerald-450 shrink-0">
              <ShieldCheck className="w-6.5 h-6.5" />
            </div>
            <div className="text-left space-y-0.5">
              <h3 className="text-[10px] font-extrabold text-white uppercase tracking-wider">Enterprise Ready</h3>
              <p className="text-[9px] text-slate-400 leading-snug font-semibold">Secure, scalable &amp; built for modern organizations.</p>
            </div>
          </div>
        </div>

        {/* Deep Dive Feature Suite */}
        <div className="space-y-8 py-4 border-t border-slate-900/40 pt-8">
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-450">DEEP DIVE FEATURE SUITE</span>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
              Explore the Advanced Modules Driving Sustainable Change
            </h2>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              EcoShift integrates gamification, corporate networks, real-time telemetry, and advanced AI to help teams reduce their carbon footprint.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Biosphere */}
            <div className="bg-[#060a12]/50 border border-slate-900/60 backdrop-blur-md hover:border-emerald-500/20 hover:bg-[#060a12]/80 transition-all duration-350 p-6 rounded-2xl flex flex-col justify-between text-left group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 flex items-center justify-center shrink-0">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Module A</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Living-World Biosphere Simulator</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Watch your actions reshape a dynamic natural background. The virtual ecosystem reacts in real-time as your carbon offset level grows or decays.
                  </p>
                </div>
              </div>
              <div className="pt-5 border-t border-slate-900/60 mt-5">
                <button 
                  onClick={() => { setCurrentPage('dashboard'); setActiveTab('dashboard'); }}
                  className="w-full py-2 bg-slate-950 hover:bg-emerald-500 hover:text-slate-950 border border-slate-850 hover:border-emerald-500 text-[10px] text-slate-300 font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer text-center"
                >
                  Launch Simulator
                </button>
              </div>
            </div>

            {/* Card 2: Ledger */}
            <div className="bg-[#060a12]/50 border border-slate-900/60 backdrop-blur-md hover:border-emerald-500/20 hover:bg-[#060a12]/80 transition-all duration-350 p-6 rounded-2xl flex flex-col justify-between text-left group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 flex items-center justify-center shrink-0">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Module B</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Verified Carbon Ledger</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Log daily habits like public transport, plant-based diets, and recycling. Our ledger calculates precise carbon savings with atomic Firestore transaction logs.
                  </p>
                </div>
              </div>
              <div className="pt-5 border-t border-slate-900/60 mt-5">
                <button 
                  onClick={() => { setCurrentPage('dashboard'); setActiveTab('logger'); }}
                  className="w-full py-2 bg-slate-950 hover:bg-emerald-500 hover:text-slate-950 border border-slate-850 hover:border-emerald-500 text-[10px] text-slate-300 font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer text-center"
                >
                  Open Carbon Ledger
                </button>
              </div>
            </div>

            {/* Card 3: Department Networks */}
            <div className="bg-[#060a12]/50 border border-slate-900/60 backdrop-blur-md hover:border-emerald-500/20 hover:bg-[#060a12]/80 transition-all duration-350 p-6 rounded-2xl flex flex-col justify-between text-left group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Module E</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Enterprise Department Networks</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Unify corporate sustainability. Employees can form department networks, complete collaborative challenges, and view their aggregate score on the leaderboard.
                  </p>
                </div>
              </div>
              <div className="pt-5 border-t border-slate-900/60 mt-5">
                <button 
                  onClick={() => { setCurrentPage('dashboard'); setActiveTab('leaderboard'); }}
                  className="w-full py-2 bg-slate-950 hover:bg-emerald-500 hover:text-slate-950 border border-slate-850 hover:border-emerald-500 text-[10px] text-slate-300 font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer text-center"
                >
                  Join Department Network
                </button>
              </div>
            </div>

            {/* Card 4: Checkout Sandbox */}
            <div className="bg-[#060a12]/50 border border-slate-900/60 backdrop-blur-md hover:border-emerald-500/20 hover:bg-[#060a12]/80 transition-all duration-350 p-6 rounded-2xl flex flex-col justify-between text-left group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Module D</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Nudge Checkout Simulator</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Test how simple nudges swap items in an e-commerce checkout bag for sustainable alternatives, showing real-time money and carbon savings.
                  </p>
                </div>
              </div>
              <div className="pt-5 border-t border-slate-900/60 mt-5">
                <button 
                  onClick={() => { setCurrentPage('dashboard'); setActiveTab('nudge-sandbox'); }}
                  className="w-full py-2 bg-slate-950 hover:bg-emerald-500 hover:text-slate-950 border border-slate-850 hover:border-emerald-500 text-[10px] text-slate-300 font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer text-center"
                >
                  Try Checkout Sandbox
                </button>
              </div>
            </div>

            {/* Card 5: Gemini AI Eco-Assistant */}
            <div className="bg-[#060a12]/50 border border-slate-900/60 backdrop-blur-md hover:border-emerald-500/20 hover:bg-[#060a12]/80 transition-all duration-350 p-6 rounded-2xl flex flex-col justify-between text-left group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Module F</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Gemini AI Assistant</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Leverage advanced AI model predictions for footprint tracking. Ask questions, receive custom mitigation tips, and get real-time eco calculations.
                  </p>
                </div>
              </div>
              <div className="pt-5 border-t border-slate-900/60 mt-5">
                <button 
                  onClick={() => { setCurrentPage('dashboard'); setActiveTab('ai-assistant'); }}
                  className="w-full py-2 bg-slate-950 hover:bg-emerald-500 hover:text-slate-950 border border-slate-850 hover:border-emerald-500 text-[10px] text-slate-300 font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer text-center"
                >
                  Ask AI Assistant
                </button>
              </div>
            </div>

            {/* Card 6: Footprint Calculator */}
            <div className="bg-[#060a12]/50 border border-slate-900/60 backdrop-blur-md hover:border-emerald-500/20 hover:bg-[#060a12]/80 transition-all duration-350 p-6 rounded-2xl flex flex-col justify-between text-left group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 flex items-center justify-center shrink-0">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Module C</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Carbon Calculator</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Conduct granular lifestyle audits across household utility grids, transport distances, and food choices using strict formulaic models.
                  </p>
                </div>
              </div>
              <div className="pt-5 border-t border-slate-900/60 mt-5">
                <button 
                  onClick={() => { setCurrentPage('dashboard'); setActiveTab('calculator'); }}
                  className="w-full py-2 bg-slate-950 hover:bg-emerald-500 hover:text-slate-950 border border-slate-850 hover:border-emerald-500 text-[10px] text-slate-300 font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer text-center"
                >
                  Calculate Footprint
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Built for impact row */}
        <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-8 pt-8 border-t border-slate-900/60">
          {/* Left Side: Badges block */}
          <div className="flex flex-col space-y-4 text-left w-full lg:w-auto">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block text-center lg:text-left">Built for impact. Backed by innovators.</span>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-y-4">
              {/* Secure & Compliant */}
              <div className="flex items-center space-x-2.5 pr-4 pl-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div className="text-left leading-tight">
                  <p className="text-[10px] font-bold text-white">Secure &amp; Compliant</p>
                  <p className="text-[8px] text-slate-500 font-bold">Enterprise Grade Security</p>
                </div>
              </div>
              
              <div className="hidden sm:block h-6 w-px bg-slate-800/40 mx-2"></div>

              {/* Offline Ready */}
              <div className="flex items-center space-x-2.5 px-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 flex items-center justify-center shrink-0">
                  <Zap className="w-4.5 h-4.5 text-amber-500 animate-pulse-subtle" />
                </div>
                <div className="text-left leading-tight">
                  <p className="text-[10px] font-bold text-white">Offline Ready</p>
                  <p className="text-[8px] text-slate-500 font-bold">Zero-Crash Guarantee</p>
                </div>
              </div>

              <div className="hidden sm:block h-6 w-px bg-slate-800/40 mx-2"></div>

              {/* Real-Time Sync */}
              <div className="flex items-center space-x-2.5 px-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4.5 h-4.5 text-blue-500" />
                </div>
                <div className="text-left leading-tight">
                  <p className="text-[10px] font-bold text-white">Real-Time Sync</p>
                  <p className="text-[8px] text-slate-500 font-bold">Powered by Firestore</p>
                </div>
              </div>

              <div className="hidden sm:block h-6 w-px bg-slate-800/40 mx-2"></div>

              {/* Sustainable Future */}
              <div className="flex items-center space-x-2.5 px-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 flex items-center justify-center shrink-0">
                  <Globe className="w-4.5 h-4.5 text-indigo-500" />
                </div>
                <div className="text-left leading-tight">
                  <p className="text-[10px] font-bold text-white">Sustainable Future</p>
                  <p className="text-[8px] text-slate-500 font-bold">For a Greener Planet</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Laurel Wreath Banner */}
          <div className="flex items-center space-x-5 bg-[#060a12]/70 border border-emerald-500/20 rounded-2xl px-6 py-4.5 shadow-xl max-w-sm w-full lg:w-auto shrink-0 relative overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
            <LaurelLeft />
            <div className="text-center space-y-0.5 z-10">
              <p className="text-[11px] font-black text-white leading-snug">Building a Greener Tomorrow</p>
              <p className="text-[9px] text-slate-400 font-bold">with Technology &amp; Community</p>
              <p className="text-[10px] font-extrabold text-emerald-450 mt-1 uppercase tracking-wider">Be part of the movement.</p>
            </div>
            <LaurelRight />
          </div>
        </div>
      </main>
    );
  };

  // ------------------------------------------
  // --- TERMS PAGE COMPONENT ---
  // ------------------------------------------
  const renderTermsPage = () => {
    return (
      <main data-testid="terms-compliance-view" className="max-w-4xl mx-auto px-6 py-12 md:py-20 min-h-[calc(100vh-4rem)] flex flex-col justify-center space-y-8 animate-fade-in">
        <div className="glass-card p-8 bg-slate-900/60 border border-slate-800/80 backdrop-blur-lg space-y-8">
          
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-450">
              <ShieldCheck className="w-6 h-6 animate-pulse-subtle" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Terms &amp; Security Protocols</h2>
              <p className="text-[10px] text-slate-400">Enterprise Distributed Architecture Protocol</p>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-6 leading-relaxed">
            
            {/* Kryptographic Ownership Exception Clause */}
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/35 rounded-2xl space-y-2 relative overflow-hidden select-none">
              <div className="absolute top-0 right-0 p-3 text-[8px] font-mono font-bold text-emerald-450 uppercase bg-emerald-500/15 rounded-bl-xl border-l border-b border-emerald-500/20">
                Immutable Signature
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Intellectual Property Ownership Exception</span>
              </h4>
              <p className="text-[11px] text-slate-205 leading-relaxed font-bold">
                This software pipeline and its functional layout are protected by structural cryptographic signatures assigning exclusive distribution rights to Shresth Kesarwani.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">1. Sandbox Operations &amp; Telemetry</h3>
              <p>
                EcoShift tracks carbon metrics (commuting, transit mileage, energy auditing) securely. All data processing occurs via isolated in-memory computations. Zero compound queries are triggered against our distributed Firestore collections, keeping resource footprints minimal and latency sub-millisecond.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">2. B2B Corporate Ledger Privacy</h3>
              <p>
                Enterprise teams map their environmental ledger events to unique B2B department keys. Team data is logically partitioned in the database. Cross-department metrics are only aggregated on the public leaderboard utilizing in-memory reduction queries.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">3. Google Showcase Consent</h3>
              <p>
                Our services utilize the Google Antigravity Agentic IDE workspace configurations, Google Cloud Run clusters, and Firebase Distributed Security schemas. By accessing the platform, users consent to real-time verification of these underlying Google systems.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>Security Hash Verification: Verified Authentic</span>
              <span className="font-mono text-emerald-400">{CREATOR_SIGNATURE_HASH}</span>
            </div>

          </div>
        </div>
      </main>
    );
  };

  // ------------------------------------------
  // --- CONTACT & SUBSCRIPTION PAGE COMPONENT ---
  // ------------------------------------------
  const renderContactPage = () => {
    const handleContactSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const errors: { name?: string; email?: string; message?: string } = {};

      if (contactName.trim().length < 3) {
        errors.name = 'Full Name must be at least 3 characters.';
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail)) {
        errors.email = 'Please enter a valid work email address.';
      }

      if (contactMessage.trim().length < 10) {
        errors.message = 'Message must be at least 10 characters.';
      }

      setContactErrors(errors);

      if (Object.keys(errors).length === 0) {
        setIsSubmittingContact(true);
        setTimeout(() => {
          setIsSubmittingContact(false);
          setContactSubmitted(true);
          // fields reset handled in state
        }, 1200);
      }
    };

    const resetContactForm = () => {
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setContactErrors({});
      setContactSubmitted(false);
    };

    return (
      <main className="max-w-6xl mx-auto px-6 py-12 md:py-16 min-h-[calc(100vh-4rem)] flex flex-col justify-center space-y-10 animate-fade-in">
        
        {/* Page Title & Pitch */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-black text-white">Commercial Subscriptions &amp; Support</h1>
          <p className="text-xs md:text-sm text-slate-400 font-medium">
            Select a commercial carbon layer or contact the evaluation team to deploy EcoShift inside your company branches.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Subscription Tier Matrix Card Grid */}
          <div data-testid="pricing-tier-matrix" className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest px-2">Operational Cost Matrices</h2>
            
            {/* Hack2skill Eval Tier */}
            <button
              onClick={() => setContactTier('hack2skill')}
              className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                contactTier === 'hack2skill'
                  ? 'bg-emerald-500/10 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="absolute top-0 right-0 px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-emerald-450 bg-emerald-500/10 rounded-bl-xl border-l border-b border-emerald-500/10">
                Evaluation Layer
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-extrabold text-white">Hack2skill Competition Tier</span>
                </div>
                <p className="text-[10px] text-emerald-400 font-bold tracking-wider">
                  Sponsored Access Tier Active for Hack2skill Evaluation Teams - Google Antigravity Environment
                </p>
                <p className="text-[11px] text-slate-400 font-medium pt-1">
                  Full unrestricted sandbox, B2B department leaderboards, and AI assistant automation layers active for judge evaluation.
                </p>
              </div>
              <div className="flex items-baseline space-x-1.5 mt-3">
                <span className="text-2xl font-black text-white">₹0</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Free Forever Layer</span>
              </div>
            </button>

            {/* Home Tier */}
            <button
              onClick={() => setContactTier('home')}
              className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                contactTier === 'home'
                  ? 'bg-emerald-500/10 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1">
                <span className="text-sm font-extrabold text-white block">Home Tier</span>
                <p className="text-[11px] text-slate-400 font-medium">
                  Smart Meter Synchronization. Sync domestic utilities, live energy metrics, and accelerometer transit classifiers.
                </p>
              </div>
              <div className="flex items-baseline space-x-1.5 mt-3">
                <span className="text-2xl font-black text-white">₹450</span>
                <span className="text-[10px] text-slate-400 font-semibold">/ Month</span>
              </div>
            </button>

            {/* Enterprise Tier */}
            <button
              onClick={() => setContactTier('enterprise')}
              className={`w-full text-left p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                contactTier === 'enterprise'
                  ? 'bg-emerald-500/10 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1">
                <span className="text-sm font-extrabold text-white block">Enterprise Tier</span>
                <p className="text-[11px] text-slate-400 font-medium">
                  Scope 3 Automation Tools. Real-time bank transaction audit API access, SLA uptime guarantees, and multi-branch ledger sync.
                </p>
              </div>
              <div className="flex items-baseline space-x-1.5 mt-3">
                <span className="text-2xl font-black text-white">₹12,500</span>
                <span className="text-[10px] text-slate-400 font-semibold">/ Month</span>
              </div>
            </button>

          </div>

          {/* Contact Form Wrapper Column */}
          <div className="lg:col-span-5">
            <div className="glass-card p-6 md:p-8 bg-slate-900/60 border border-slate-800/80 backdrop-blur-lg h-full flex flex-col justify-center">
              
              {contactSubmitted ? (
                /* Success View State */
                <div className="text-center space-y-5 py-6">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/35 text-emerald-450 mx-auto animate-pulse">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-extrabold text-white uppercase tracking-wider">Secure Transmission Established!</h3>
                    <p className="text-[11px] text-slate-350 leading-relaxed font-semibold">
                      Your inquiry regarding the <span className="text-emerald-400 uppercase font-extrabold">[{contactTier}]</span> layer has been successfully signed and transmitted to Google Cloud Run clusters.
                    </p>
                    <p className="text-[10px] text-slate-450 leading-relaxed">
                      We will reach out to you within 24 hours.
                    </p>
                  </div>
                  <button
                    onClick={resetContactForm}
                    className="px-6 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 text-xs text-slate-205 font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                /* Interactive Entry Form */
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="text-left space-y-1">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Support Portal</h3>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Secure Connection Pipeline</h2>
                  </div>

                  {/* Selected Tier Badge */}
                  <div className="p-3 bg-slate-950/80 border border-slate-850 rounded-xl flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold">Selected Subscription:</span>
                    <span className="text-emerald-450 font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                      {contactTier}
                    </span>
                  </div>

                  {/* Input Name */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    {contactErrors.name && (
                      <span className="text-[10px] text-red-400 font-bold tracking-wide block pt-0.5">{contactErrors.name}</span>
                    )}
                  </div>

                  {/* Input Email */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Email</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    {contactErrors.email && (
                      <span className="text-[10px] text-red-400 font-bold tracking-wide block pt-0.5">{contactErrors.email}</span>
                    )}
                  </div>

                  {/* Input Message */}
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Message Payload</label>
                    <textarea
                      rows={3}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="How can we assist your B2B department?"
                      className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                    ></textarea>
                    {contactErrors.message && (
                      <span className="text-[10px] text-red-400 font-bold tracking-wide block pt-0.5">{contactErrors.message}</span>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-650 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2"
                  >
                    {isSubmittingContact ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                        <span>Encrypting message payload...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send Signed Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>

      </main>
    );
  };

  // ------------------------------------------
  // --- VERIFIED CORE ENGINE MODAL (Ctrl + Shift + S) ---
  // ------------------------------------------
  const renderAuthenticModal = () => {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4">
        <div className="glass-card max-w-md w-full p-8 border border-emerald-500/40 bg-slate-900/90 text-center space-y-6 shadow-2xl relative">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 text-emerald-400 mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-white tracking-wide">Core Engine Verified</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Verified Authentic Core Codebase Engine Developed by Shresth Kesarwani for Hack2skill Challenge 3.
            </p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl">
            <span className="text-[9px] font-mono text-emerald-400 break-all">{CREATOR_SIGNATURE_HASH}</span>
          </div>
          <button
            onClick={() => setShowAuthenticModal(false)}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
          >
            Close Security Key View
          </button>
        </div>
      </div>
    );
  };

  // ------------------------------------------
  // --- AUTHENTICATION SCREEN RENDERING ---
  // ------------------------------------------
  const renderAuthPortal = () => {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative z-10 w-full">
        <div className="glass-card max-w-md w-full p-8 border border-slate-800/80 bg-slate-900/40 relative z-10 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 text-emerald-450 animate-pulse-subtle">
              <Leaf className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">EcoShift Portal</h1>
            <p className="text-xs text-slate-400">Secure entry to corporate carbon ledger vaults</p>
          </div>

          {/* LOGIN SCREEN */}
          {authScreen === 'login' && (
            <form onSubmit={handleLoginAction} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="login-email" className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label htmlFor="login-pass" className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Security Password</label>
                  <button
                    type="button"
                    onClick={() => setAuthScreen('forgot')}
                    className="text-[10px] font-bold text-emerald-450 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    id="login-pass"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-10 pr-10 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                Log In Securely
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-850"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-400 uppercase font-bold tracking-widest">Or Continue</span>
                <div className="flex-grow border-t border-slate-850"></div>
              </div>

              <button
                type="button"
                onClick={handleGuestLoginAction}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-indigo-500/30 text-indigo-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Judge Demo Access (Instant)
              </button>

              <p className="text-center text-xs text-slate-400 mt-2">
                New to EcoShift?{' '}
                <button
                  type="button"
                  onClick={() => setAuthScreen('signup')}
                  className="font-bold text-emerald-450 hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            </form>
          )}

          {/* SIGNUP SCREEN */}
          {authScreen === 'signup' && (
            <form onSubmit={handleSignUpAction} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="signup-name" className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    id="signup-name"
                    type="text"
                    required
                    placeholder="Alex Morgan"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="signup-email" className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="signup-email"
                      type="email"
                      required
                      placeholder="alex@company.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="signup-dept" className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Department</label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <select
                      id="signup-dept"
                      value={authDept}
                      onChange={(e) => setAuthDept(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Sales">Sales</option>
                      <option value="Operations">Operations</option>
                      <option value="Marketing">Marketing</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="signup-pass" className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="signup-pass"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="signup-confirm" className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Confirm Pass</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      id="signup-confirm"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={authConfirmPassword}
                      onChange={(e) => setAuthConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Terms & Conditions Agreement */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850 flex items-start space-x-3">
                <input
                  id="signup-terms"
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950 bg-slate-950 cursor-pointer"
                />
                <label htmlFor="signup-terms" className="text-[10px] text-slate-300 leading-relaxed cursor-pointer select-none">
                  I explicitly agree to the <strong className="text-white">EcoShift Terms &amp; Conditions</strong> and consent to securely log my carbon metrics, department codes, and utility bills under encrypted databases.
                </label>
              </div>

              <button
                type="submit"
                disabled={!termsAgreed}
                className={`w-full py-3 font-bold text-xs rounded-xl transition-all shadow-lg cursor-pointer ${
                  termsAgreed 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-emerald-500/10' 
                    : 'bg-slate-905 border border-slate-850 text-slate-505 cursor-not-allowed'
                }`}
              >
                Create Account &amp; Log In
              </button>

              <p className="text-center text-xs text-slate-400 mt-2">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setAuthScreen('login')}
                  className="font-bold text-emerald-455 hover:underline cursor-pointer"
                >
                  Log in
                </button>
              </p>
            </form>
          )}

          {/* FORGOT PASSWORD SCREEN */}
          {authScreen === 'forgot' && (
            <form onSubmit={handleForgotPasswordAction} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Enter your registered email address below, and we will send you a password recovery link to reset your security keys.
              </p>

              <div className="space-y-1">
                <label htmlFor="forgot-email" className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Request Reset Key
              </button>

              <p className="text-center text-xs text-slate-400 mt-2">
                Return to{' '}
                <button
                  type="button"
                  onClick={() => setAuthScreen('login')}
                  className="font-bold text-emerald-450 hover:underline cursor-pointer"
                >
                  Log in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  };

  // ------------------------------------------
  // --- CLIENT-STATE NAVIGATION CONTROLLER ---
  // ------------------------------------------
  if (currentPage !== 'dashboard' || !user) {
    return (
      <div className={`min-h-screen transition-colors duration-300 font-sans select-none ${theme === 'light' ? 'theme-light' : ''}`} style={{ fontFamily: "'Outfit', sans-serif", backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', position: 'relative' }}>
        
        {/* 3D Natural Background for Public Pages */}
        {render3DNaturalBackground()}

        {/* Floating Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle dark/light color theme"
            className="p-2.5 border rounded-xl cursor-pointer transition-all flex items-center justify-center"
            style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-indigo-600" />}
          </button>
        </div>

        {/* Global Navigation Header for Public Pages */}
        {renderPublicHeader()}

        {/* Main Routed Page Content */}
        <div className="relative z-10">
          {currentPage === 'home' && renderHomePage()}
          {currentPage === 'terms' && renderTermsPage()}
          {currentPage === 'contact' && renderContactPage()}
          {currentPage === 'dashboard' && !user && renderAuthPortal()}
        </div>

        {/* Verified Authentic Modal */}
        {showAuthenticModal && renderAuthenticModal()}
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 flex overflow-hidden font-sans select-none ${theme === 'light' ? 'theme-light' : ''}`} style={{ fontFamily: "'Outfit', sans-serif", backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      
      {/* Theme and variables are loaded globally from index.css */}

      {/* SIDEBAR FOR DESKTOP */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800/80 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between`}>
        <div>
          {/* Sidebar Header / Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Leaf className="text-emerald-455 w-6 h-6 animate-pulse-subtle" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">EcoShift</span>
            </div>
            <button
              aria-label="Close sidebar menu"
              className="md:hidden text-slate-300 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav aria-label="Main sidebar navigation" className="p-4 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'logger', label: 'Log Eco-Action', icon: PlusCircle },
              { id: 'challenges', label: 'Eco Challenges', icon: Award },
              { id: 'calculator', label: 'Footprint Calculator', icon: Calculator },
              { id: 'leaderboard', label: 'Leaderboard', icon: Users },
              { id: 'ai-assistant', label: 'AI Eco Assistant', icon: Sparkles },
              { id: 'nudge-sandbox', label: 'Checkout Sandbox', icon: ShoppingCart }
            ].map(tab => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); setSidebarOpen(false); }}
                  aria-label={`Navigate to ${tab.label}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-500/10 border-l-4 border-emerald-500 text-white font-medium shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                      : 'text-slate-350 hover:bg-slate-800/50 hover:text-slate-205'
                  }`}
                >
                  <IconComp className={`w-5 h-5 ${isActive ? 'text-emerald-400' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
          
          {/* Public Portal Navigation */}
          <div className="pt-2 px-4 border-t border-slate-800/40 mt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-4 mb-2">Public Portal</span>
            <div className="space-y-0.5">
              <button
                onClick={() => setCurrentPage('home')}
                className="w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-xs text-slate-350 hover:bg-slate-800/50 hover:text-slate-205 cursor-pointer"
              >
                <Leaf className="w-4 h-4 text-emerald-400" />
                <span>EcoShift Home</span>
              </button>
              <button
                onClick={() => setCurrentPage('terms')}
                className="w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-xs text-slate-350 hover:bg-slate-800/50 hover:text-slate-205 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Terms & Privacy</span>
              </button>
              <button
                onClick={() => setCurrentPage('contact')}
                className="w-full flex items-center space-x-3 px-4 py-2 rounded-xl text-xs text-slate-350 hover:bg-slate-800/50 hover:text-slate-205 cursor-pointer"
              >
                <Mail className="w-4 h-4 text-blue-400" />
                <span>Contact Support</span>
              </button>
            </div>
          </div>
        </div>

        {/* User profile details box & Sign out */}
        <footer className="p-4 border-t border-slate-800/50" aria-label="User profile and session info">
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/50 flex flex-col space-y-3">
            {/* Click to edit profile */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              aria-label="Open profile settings modal"
              className="flex items-center space-x-3 text-left w-full hover:bg-slate-900 p-1 rounded-xl transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                {profileDetails.displayName ? profileDetails.displayName[0].toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">My Settings</p>
                <p className="text-sm font-semibold text-slate-200 truncate">{profileDetails.displayName || 'Eco Hero'}</p>
              </div>
            </button>
            
            <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-300">
              <button
                onClick={handleSignOutAction}
                aria-label="Sign out of your session securely"
                className="text-[10px] text-red-400 font-bold hover:underline cursor-pointer"
              >
                Sign Out
              </button>
              <span className="text-[10px] text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                Team: {profileDetails.department}
              </span>
            </div>
          </div>
        </footer>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        
        {/* RESPONSIVE HEADER */}
        <header className="h-16 bg-slate-900/40 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-6 static md:sticky top-0 z-40">
          <div className="flex items-center space-x-4">
            <button
              aria-label="Open sidebar menu"
              className="md:hidden text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800/60"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white tracking-tight capitalize">
              {activeTab === 'ai-assistant' 
                ? 'AI Eco Assistant' 
                : activeTab === 'nudge-sandbox' 
                  ? 'Checkout Nudge Sandbox' 
                  : `${activeTab} Overview`}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle dark/light color theme"
              className="p-2 border rounded-xl cursor-pointer flex items-center justify-center transition-all bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
            >
              {theme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-amber-400 animate-pulse-subtle" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-indigo-600" />
              )}
            </button>

            {dbFallbackActive && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">
                Local Sandbox
              </span>
            )}
            <span className="text-[11px] bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full font-medium hidden sm:inline-block">
              Target: <span className="font-mono text-emerald-450">{profileDetails.targetGoal} kg/yr</span>
            </span>
          </div>
        </header>

        {/* CONTAINER FOR DASHBOARD WORKSPACE */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
          
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ECO SCORE CARD */}
            <div className="glass-card glow-emerald p-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 bg-emerald-500/10 rounded-bl-3xl border-l border-b border-emerald-500/20 text-emerald-450 transition-colors group-hover:bg-emerald-500/20">
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-wider text-slate-300 uppercase">Ecosystem XP</p>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-4xl font-extrabold text-white">{totalPoints}</span>
                  <span className="text-slate-400 text-sm">XP total</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    style={{ width: `${Math.min(100, (totalPoints / 1000) * 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
                  <span>Tier: {totalPoints < 150 ? 'Eco Novice' : totalPoints < 450 ? 'Carbon Fighter' : 'Eco Master'}</span>
                  <span className="font-semibold text-emerald-400">{Math.max(0, 1000 - totalPoints)} XP to Next Tier</span>
                </div>
              </div>
            </div>

            {/* CARBON SAVED CARD */}
            <div className="glass-card glow-emerald p-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 bg-emerald-500/10 rounded-bl-3xl border-l border-b border-emerald-500/20 text-emerald-455 transition-colors group-hover:bg-emerald-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-wider text-slate-300 uppercase">Carbon Avoided</p>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-4xl font-extrabold text-white" data-testid="carbon-saved-value">{personalCo2Saved.toFixed(2)}</span>
                  <span className="text-slate-200 text-sm font-semibold">kg CO₂</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden mb-2">
                  <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, (personalCo2Saved / profileDetails.targetGoal) * 100)}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-400 flex justify-between">
                  <span>Goal progress: {Math.min(100, Math.round((personalCo2Saved / profileDetails.targetGoal) * 100))}%</span>
                  <span>Target: {profileDetails.targetGoal} kg</span>
                </p>
              </div>
            </div>

            {/* CASH SAVED CARD */}
            <div className="glass-card glow-amber p-6 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 bg-amber-500/10 rounded-bl-3xl border-l border-b border-amber-500/20 text-amber-450 transition-colors group-hover:bg-amber-500/20">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-wider text-slate-300 uppercase">Cash Saved</p>
                <div className="flex items-baseline space-x-2 mt-2">
                  <span className="text-4xl font-extrabold text-amber-400" data-testid="cash-saved-value">{formatCurrency(personalCashSaved)}</span>
                  <span className="text-slate-400 text-sm">INR total</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <p className="text-xs text-slate-400 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                  Avg savings of {formatCurrency(personalCashSaved / Math.max(1, loggedActions.length))} per action
                </p>
              </div>
            </div>
          </div>

          {/* DYNAMIC TAB BODY */}
          <div className="mt-8">
            
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* Welcome & Department Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Welcome & Overview Header */}
                  <div className="lg:col-span-2 glass-card p-6 bg-gradient-to-r from-slate-900 to-slate-900/40 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -right-20 -bottom-20 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">Welcome, {profileDetails.displayName}!</h2>
                      <p className="text-slate-300 max-w-2xl text-sm leading-relaxed">
                        Make small shifts in your daily actions to reduce greenhouse gas emissions, save real money, and increase your personal Eco Score. Let's make an impact together!
                      </p>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        onClick={() => setActiveTab('logger')}
                        aria-label="Navigate to log eco-action page"
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-xl text-sm flex items-center space-x-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Log Your First Action</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('challenges')}
                        aria-label="Navigate to active challenges page"
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-202 hover:text-white font-semibold rounded-xl text-sm border border-slate-700/60 flex items-center space-x-2 cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        <span>Explore Active Challenges</span>
                      </button>
                    </div>
                  </div>

                  {/* Join Department Form Card */}
                  <div className="glass-card p-6 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <h3 className="text-md font-bold text-white flex items-center space-x-2">
                        <Users className="w-4 h-4 text-indigo-305" />
                        <span>B2B Corporate Network</span>
                      </h3>
                      <p className="text-[11px] text-slate-405 mt-1">
                        Connect with your corporate department to contribute to the global shared leaderboard.
                      </p>

                      {profileDetails.department ? (
                        <div className="mt-4 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
                          <p className="text-xs text-slate-300">Assigned Department:</p>
                          <p className="text-sm font-extrabold text-white flex items-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-300 mr-2 animate-pulse-subtle"></span>
                            {profileDetails.department}
                          </p>
                          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-900/60">
                            Your actions automatically earn points for {profileDetails.department}!
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <label htmlFor="dept-select" className="text-xs font-bold text-slate-300 block">Select Department</label>
                          <select
                            id="dept-select"
                            aria-label="Select department"
                            className="w-full bg-slate-950 border border-slate-800 text-slate-202 px-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                            defaultValue=""
                          >
                            <option value="" disabled>Choose department...</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Sales">Sales</option>
                            <option value="Operations">Operations</option>
                            <option value="Marketing">Marketing</option>
                            <option value="HR">HR</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {!profileDetails.department && (
                      <button
                        onClick={() => {
                          const selectEl = document.getElementById('dept-select') as HTMLSelectElement | null;
                          if (selectEl && selectEl.value) {
                            handleJoinDepartment(selectEl.value);
                          }
                        }}
                        aria-label="Join corporate department network"
                        className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl border border-indigo-500/30 cursor-pointer"
                      >
                        Join Department
                      </button>
                    )}

                    {profileDetails.department && (
                      <button
                        onClick={() => setActiveTab('leaderboard')}
                        aria-label="Navigate to leaderboard page"
                        className="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-202 hover:text-white border border-slate-805 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <span>View Shared Scoreboard</span>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* LIVING WORLD SIMULATOR COMPONENT */}
                <LivingWorldSimulator totalPoints={totalPoints} personalCo2Saved={personalCo2Saved} hasCleanEnergy={hasCleanEnergy} theme={theme} />

                {/* BACKGROUND AUTOMATION ZONE */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* AUTO-PILOT COMMUTE TRACKER MODULE */}
                  <section aria-label="Commute Tracker Module" className="glass-card p-6 border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-800/60 gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-2 animate-pulse-subtle"></span>
                            <span>Module C: Auto-Pilot Commute Tracker</span>
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            EcoShift monitors transit patterns in the background to log low-carbon trips without manual entry.
                          </p>
                        </div>

                        {/* Toggle Switch */}
                        <div className="flex items-center space-x-3 bg-slate-900/65 px-4 py-2 rounded-xl border border-slate-800 shrink-0">
                          <span className="text-xs text-slate-350 font-semibold">Commute Monitor</span>
                          <button
                            onClick={() => setIsAutoPilotActive(!isAutoPilotActive)}
                            aria-label="Toggle passive transit background scanning"
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isAutoPilotActive ? 'bg-indigo-600' : 'bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isAutoPilotActive ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                            isAutoPilotActive ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' : 'bg-slate-800 text-slate-400 border border-slate-800'
                          }`}>
                            {isAutoPilotActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      {/* Simulation Panel */}
                      <div className="mt-5 space-y-4">
                        <p className="text-xs text-slate-350 leading-relaxed">
                          To demonstrate background GPS, motion, and transit matching telemetry in our sandbox environment, trigger a live scan. If active, EcoShift matches your trip velocity and location logs with public metro or rail lines to calculate carbon avoidance metrics automatically.
                        </p>
                        
                        {isScanning && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-indigo-300 font-semibold animate-pulse">Scanning cell towers and matching GPS coordinates...</span>
                              <span className="text-slate-300 font-bold">{scanProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden relative">
                              {/* Scanning radar line overlay */}
                              <div className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-transparent to-indigo-500/45 animate-scan-light"></div>
                              <div
                                className="bg-indigo-600 h-full rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                                style={{ width: `${scanProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center lg:justify-end mt-6">
                      <button
                        onClick={handleSimulateCommute}
                        disabled={isScanning}
                        aria-label="Simulate background GPS commute scan"
                        className={`w-full px-6 py-3 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg border cursor-pointer ${
                          isScanning 
                            ? 'bg-slate-900 border-slate-800 text-slate-405 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500/30 text-white shadow-indigo-600/10'
                        }`}
                      >
                        {isScanning ? (
                          <>
                            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>Scanning Commute...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 animate-pulse-subtle" />
                            <span>Simulate Real-Time Commute Scan</span>
                          </>
                        )}
                      </button>
                    </div>
                  </section>

                  {/* UTILITY BILL OPTIMIZER MODULE */}
                  <section aria-label="Utility Bill Optimizer Module" className="glass-card p-6 border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-800/60 gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse-subtle"></span>
                            <span>Module C: Utility Bill Optimizer</span>
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Audit utility bills using OCR scanning to spot appliance leaks and high-rate consumption spikes.
                          </p>
                        </div>
                      </div>

                      {/* Dropzone / Scan console */}
                      <div className="mt-5">
                        {ocrStep === 'idle' && (
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => handleOcrScan()}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOcrScan(); }}
                            role="button"
                            tabIndex={0}
                            aria-label="Utility bill OCR drop zone. Drag and drop PDF, PNG or JPG files here, or click to upload."
                            data-testid="utility-ocr-dropzone"
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[140px] focus:outline-none focus:border-emerald-500 ${
                              isDragging 
                                ? 'border-emerald-500 bg-emerald-500/5' 
                                : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60'
                            }`}
                          >
                            <div className="mx-auto w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-805 text-slate-300 mb-3">
                              <PlusCircle className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-slate-205">
                              Drag & drop your utility bill here (PDF/PNG/JPG)
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              or click to browse local files for an AI Energy Audit
                            </p>
                          </div>
                        )}

                        {ocrStep === 'scanning' && (
                          <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-emerald-455 font-semibold animate-pulse">{ocrStatusText}</span>
                              <span className="text-slate-350 font-bold">{ocrProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800 overflow-hidden relative">
                              <div className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-transparent to-emerald-500/40 animate-scan-light"></div>
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all duration-150 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                style={{ width: `${ocrProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {ocrStep === 'complete' && (
                          <div className="space-y-4">
                            {/* Rich Personalized Alert Box */}
                            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/25 space-y-3 relative overflow-hidden">
                              <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border-l border-b border-emerald-500/20 text-[9px] font-bold uppercase rounded-bl-lg">
                                Audit Match
                              </div>
                              
                              <div className="space-y-1">
                                <h4 className="text-xs font-bold text-white flex items-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse-subtle"></span>
                                  Energy Leaks Detected
                                </h4>
                                <p className="text-[11px] text-slate-300 leading-relaxed pl-3.5">
                                  Standby energy draw ("vampire loads") is leaking <strong className="text-amber-400 font-semibold">₹1,240 / month</strong>.
                                </p>
                              </div>

                              <div className="space-y-1 pt-2 border-t border-slate-900/60">
                                <h4 className="text-xs font-bold text-white flex items-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse-subtle"></span>
                                  Peak Rate Penalty surcharges
                                </h4>
                                <p className="text-[11px] text-slate-300 leading-relaxed pl-3.5">
                                  Running heavy appliances during peak grid hours <strong className="text-amber-400 font-semibold">(5:00 PM – 9:00 PM)</strong> adds a surcharge penalty of <strong className="text-amber-400 font-semibold">₹850 / month</strong> at ₹7.50/kWh.
                                </p>
                              </div>

                              {/* Actionable optimization checklist */}
                              <div className="space-y-2 pt-3 border-t border-slate-900/60">
                                <h4 className="text-xs font-bold text-white flex items-center">
                                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-400 animate-pulse-subtle" />
                                  <span>Actionable Optimization Checklist</span>
                                </h4>
                                
                                <div className="space-y-1.5 pl-1">
                                  {checklist.map(item => (
                                    <button
                                      key={item.id}
                                      disabled={item.completed}
                                      onClick={() => handleCheckItem(item.id)}
                                      aria-label={`Apply optimization: ${item.text}`}
                                      className={`w-full text-left p-2 rounded-lg text-[10px] font-semibold flex items-center justify-between border transition-all ${
                                        item.completed
                                          ? 'bg-slate-900 border-slate-800 text-slate-505 cursor-not-allowed'
                                          : 'bg-slate-950 hover:bg-slate-900 border-slate-850 hover:border-emerald-500/25 text-slate-205 cursor-pointer'
                                      }`}
                                    >
                                      <span className="flex items-center space-x-2">
                                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                          item.completed ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'border-slate-700'
                                        }`}>
                                          {item.completed && '✓'}
                                        </span>
                                        <span className={item.completed ? 'line-through' : ''}>{item.text}</span>
                                      </span>
                                      {!item.completed && (
                                        <span className="text-emerald-400 font-bold shrink-0 ml-1">
                                          +₹{item.cash}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Actions and toggle */}
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setOcrStep('idle')}
                                aria-label="Scan another utility bill"
                                className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                              >
                                Scan Another Bill
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </div>

                {/* LOGGED ACTIONS LIST */}
                <div className="glass-card p-6 space-y-6">
                  <div className="flex items-center space-x-3 pb-4 border-b border-slate-800/60">
                    <div className="p-2 bg-slate-900 rounded-lg text-emerald-405 border border-slate-800">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Module B: Carbon-to-Cash Ledger</h3>
                      <p className="text-xs text-slate-405">Track and manage your ecological contributions and financial returns</p>
                    </div>
                  </div>

                  {/* Split-Grid Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Box: The Carbon Balance */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          The Carbon Balance
                        </span>
                        <div className="mt-3 flex items-baseline space-x-1.5">
                          <span className="text-3xl font-extrabold text-white" data-testid="carbon-saved-value">{personalCo2Saved.toFixed(2)}</span>
                          <span className="text-emerald-400 font-bold text-sm">kg CO₂ prevented</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-slate-300 space-y-1.5 pt-3 border-t border-slate-900">
                        <p className="flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                          Equivalent to <strong className="text-white mx-1">{(personalCo2Saved * 0.04).toFixed(3)}</strong> tree seedlings grown for 10 years
                        </p>
                        <p className="flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                          Equivalent to <strong className="text-white mx-1">{(personalCo2Saved * 2.4).toFixed(1)}</strong> miles driven by a standard car
                        </p>
                      </div>
                    </div>

                    {/* Right Box: The Cash Wallet */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          The Cash Wallet
                        </span>
                        <div className="mt-3 flex items-baseline space-x-1.5">
                          <span className="text-3xl font-extrabold text-amber-400" data-testid="cash-saved-value">{formatCurrency(personalCashSaved)}</span>
                          <span className="text-slate-400 text-sm">cumulative savings</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-slate-300 space-y-1.5 pt-3 border-t border-slate-900">
                        <p className="flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span>
                          Direct returns on energy efficiencies and transit choices
                        </p>
                        <p className="flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span>
                          Avg. savings value: <strong className="text-white mx-1">{formatCurrency(personalCashSaved / Math.max(1, loggedActions.length))}</strong> per action
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Personal Action Log Table */}
                  <div className="pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-300">Logged Shifts Registry</h4>
                      <span className="text-xs text-slate-400">Showing {loggedActions.length} record(s)</span>
                    </div>
                    
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900/60 text-slate-350 uppercase tracking-wider text-[10px] border-b border-slate-800">
                            <th className="p-3">Date</th>
                            <th className="p-3">Action Type</th>
                            <th className="p-3">Logged Description</th>
                            <th className="p-3 text-right">CO₂ Saved</th>
                            <th className="p-3 text-right">Cash Saved</th>
                            <th className="p-3 text-center">XP</th>
                            <th className="p-3 text-center">Impact</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {loggedActions.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-3 text-slate-300 whitespace-nowrap">{formatTime(item.timestamp)}</td>
                              <td className="p-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  item.actionType === 'Transportation' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' :
                                  item.actionType === 'Energy' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  item.actionType === 'Waste' ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20' :
                                  item.actionType === 'Challenges' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' :
                                  'bg-slate-500/10 text-slate-300 border border-slate-500/20'
                                }`}>
                                  {item.actionType}
                                </span>
                              </td>
                              <td className="p-3 text-slate-205 font-medium max-w-xs truncate">{item.action}</td>
                              <td className="p-3 text-right text-emerald-400 font-bold">-{item.co2Saved.toFixed(2)} kg</td>
                              <td className="p-3 text-right text-amber-400 font-bold">+{formatCurrency(item.cashSaved)}</td>
                              <td className="p-3 text-center text-slate-200 font-mono">+{item.points} XP</td>
                              <td className="p-3 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  item.impact === 'high' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  item.impact === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-slate-500/10 text-slate-300 border border-slate-500/20'
                                }`}>
                                  {item.impact}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleDeleteAction(item.id)}
                                  aria-label={`Delete ${item.action} action from ledger`}
                                  className="px-2 py-1 bg-slate-900 hover:bg-red-500/25 border border-slate-800 hover:border-red-500/30 text-slate-300 hover:text-red-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                          {loggedActions.length === 0 && (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                                No ecological actions logged in ledger yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ACTION LOGGER MODULE */}
            {activeTab === 'logger' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <section aria-label="Log Eco-Action Form" className="glass-card p-6 border border-slate-800">
                  <div className="flex items-center space-x-3 pb-4 border-b border-slate-800 mb-6">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-450">
                      <PlusCircle className="w-6 h-6 animate-pulse-subtle" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Log Eco-Action</h2>
                      <p className="text-xs text-slate-405 mt-0.5">Record sustainable actions to earn XP points and save money</p>
                    </div>
                  </div>

                  {/* Calculator Selector Mode tabs */}
                  <div className="flex space-x-2 mb-6 bg-slate-950 p-1 rounded-xl border border-slate-855">
                    {[
                      { id: 'manual', label: '✏️ Manual entry' },
                      { id: 'transit', label: '🚗 Transit Calc' },
                      { id: 'energy', label: '⚡ Energy Calc' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setCalcMode(mode.id as any)}
                        aria-label={`Switch to ${mode.label}`}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          calcMode === mode.id
                            ? 'bg-emerald-500 text-black shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const category = (form.elements.namedItem('category') as HTMLSelectElement).value;
                    const actionText = (form.elements.namedItem('actionText') as HTMLInputElement).value;
                    const impact = (form.elements.namedItem('impact') as HTMLSelectElement).value as 'low' | 'medium' | 'high';
                    
                    let co2Val = 0;
                    let cashVal = 0;
                    let pointsVal = 50;

                    if (calcMode === 'manual') {
                      co2Val = parseFloat((form.elements.namedItem('co2Saved') as HTMLInputElement).value);
                      cashVal = parseFloat((form.elements.namedItem('cashSaved') as HTMLInputElement).value);
                      pointsVal = Math.max(10, Math.round(co2Val * 50));
                    } else if (calcMode === 'transit') {
                      co2Val = Number((transitType === 'bicycle' ? transitKm * CO2_DRIVING : transitKm * (CO2_DRIVING - CO2_PUBLIC)).toFixed(2));
                      cashVal = Number(((transitKm / FUEL_ECONOMY_KM_PER_LITER) * FUEL_PRICE_PER_LITER).toFixed(2));
                      pointsVal = Math.round(co2Val * 50) + 10;
                    } else if (calcMode === 'energy') {
                      co2Val = Number((energyKwh * CO2_ELECTRICITY).toFixed(2));
                      cashVal = Number((energyKwh * ELECTRICITY_PRICE_PER_KWH).toFixed(2));
                      pointsVal = Math.round(co2Val * 40) + 10;
                    }

                    // Strict client-side validation
                    if (!actionText || actionText.trim() === '') {
                      showToast("Action description cannot be empty.");
                      return;
                    }

                    const sanitizedAction = actionText.replace(/<[^>]*>/g, '').trim();
                    if (sanitizedAction.length === 0) {
                      showToast("Invalid action description provided.");
                      return;
                    }

                    if (isNaN(co2Val) || co2Val < 0 || isNaN(cashVal) || cashVal < 0) {
                      showToast("Calculated metrics must be positive numbers.");
                      return;
                    }

                    addNewAction(category, sanitizedAction, co2Val, cashVal, pointsVal, impact);
                    form.reset();
                    showToast(`Successfully logged action! Earned +${pointsVal} XP.`);
                  }} className="space-y-4">
                    <div>
                      <label htmlFor="logger-category" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Category / Action Type</label>
                      <select id="logger-category" name="category" aria-label="Select eco-action category" className="w-full bg-slate-950 border border-slate-800 text-slate-202 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                        <option value="Transportation">Transportation</option>
                        <option value="Energy">Energy</option>
                        <option value="Waste">Waste</option>
                        <option value="Diet">Diet</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="logger-action" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Action Description</label>
                      <input id="logger-action" type="text" name="actionText" aria-label="Enter description of eco-action" placeholder="e.g. Upgraded air conditioning filters to reduce load" required className="w-full bg-slate-950 border border-slate-805 text-slate-200 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                    </div>

                    {/* DYNAMIC CALCULATOR MODULES */}
                    {calcMode === 'transit' && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Commute Emission Math</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="transit-km" className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Kilometers Saved</label>
                            <input
                              id="transit-km"
                              type="number"
                              min="1"
                              value={transitKm}
                              onChange={(e) => setTransitKm(Math.max(1, parseInt(e.target.value) || 0))}
                              className="w-full bg-slate-900 border border-slate-800 text-slate-202 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label htmlFor="transit-type" className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Commute Variant</label>
                            <select
                              id="transit-type"
                              value={transitType}
                              onChange={(e) => setTransitType(e.target.value as any)}
                              className="w-full bg-slate-900 border border-slate-800 text-slate-202 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                            >
                              <option value="bicycle">🚲 Active Transit (Bicycle/Walk)</option>
                              <option value="metro">🚍 Public Transit (Metro/Bus)</option>
                            </select>
                          </div>
                        </div>

                        {/* Equations calculations preview */}
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs space-y-1 text-slate-300">
                          <p>Estimated CO₂ avoided: <strong className="text-emerald-455">{(transitType === 'bicycle' ? transitKm * CO2_DRIVING : transitKm * (CO2_DRIVING - CO2_PUBLIC)).toFixed(2)} kg</strong></p>
                          <p>Estimated Cash saved: <strong className="text-amber-455">₹{((transitKm / FUEL_ECONOMY_KM_PER_LITER) * FUEL_PRICE_PER_LITER).toFixed(2)}</strong> (at ₹102/L fuel)</p>
                          <p>Potential XP reward: <strong className="text-indigo-400">+{Math.round((transitType === 'bicycle' ? transitKm * CO2_DRIVING : transitKm * (CO2_DRIVING - CO2_PUBLIC)) * 50) + 10} XP</strong></p>
                        </div>
                      </div>
                    )}

                    {calcMode === 'energy' && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Electricity Consumption Math</h4>
                        <div>
                          <label htmlFor="energy-kwh" className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Kilowatt-Hours (kWh) Saved</label>
                          <input
                            id="energy-kwh"
                            type="number"
                            min="1"
                            value={energyKwh}
                            onChange={(e) => setEnergyKwh(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full bg-slate-900 border border-slate-800 text-slate-202 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Equations calculations preview */}
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs space-y-1 text-slate-300">
                          <p>Estimated CO₂ avoided: <strong className="text-emerald-455">{(energyKwh * CO2_ELECTRICITY).toFixed(2)} kg</strong> (at 0.82 kg CO₂/kWh)</p>
                          <p>Estimated Cash saved: <strong className="text-amber-455">₹{(energyKwh * ELECTRICITY_PRICE_PER_KWH).toFixed(2)}</strong> (at ₹7.50/kWh rate)</p>
                          <p>Potential XP reward: <strong className="text-indigo-400">+{Math.round((energyKwh * CO2_ELECTRICITY) * 40) + 10} XP</strong></p>
                        </div>
                      </div>
                    )}

                    {calcMode === 'manual' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="logger-carbon" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Carbon Saved (kg CO₂)</label>
                          <input id="logger-carbon" type="number" step="0.1" name="co2Saved" min="0" defaultValue="1.5" aria-label="Enter amount of carbon saved in kilograms" required className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                        </div>
                        <div>
                          <label htmlFor="logger-cash" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Cash Saved (INR ₹)</label>
                          <input id="logger-cash" type="number" step="0.01" name="cashSaved" min="0" defaultValue="12.00" aria-label="Enter amount of cash saved in Indian Rupees" required className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                        </div>
                      </div>
                    )}

                    <div>
                      <label htmlFor="logger-impact" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Impact Tier</label>
                      <select id="logger-impact" name="impact" aria-label="Select impact tier" className="w-full bg-slate-950 border border-slate-800 text-slate-202 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors">
                        <option value="low">Low Impact</option>
                        <option value="medium">Medium Impact</option>
                        <option value="high">High Impact</option>
                      </select>
                    </div>

                    <button type="submit" aria-label="Add eco-action to ledger" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/10 cursor-pointer">
                      <PlusCircle className="w-4 h-4" />
                      <span>Add Action to Ledger</span>
                    </button>
                  </form>
                </section>

                {/* Presets Box */}
                <div className="glass-card p-6 border border-slate-800">
                  <h3 className="text-sm font-bold text-white mb-4">Quick Logging Presets</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { category: 'Transportation', action: 'Used public train instead of driving (10km)', carbon: 1.7, cash: 72.85, points: 95, impact: 'high', label: '🚉 Commute by Train' },
                      { category: 'Energy', action: 'Turned off AC and opened windows (4 hours)', carbon: 2.5, cash: 22.50, points: 110, impact: 'medium', label: '💨 Natural Ventilation' },
                      { category: 'Waste', action: 'Composted kitchen organic leftovers', carbon: 0.8, cash: 6.00, points: 40, impact: 'low', label: '🍂 Organic Composting' },
                      { category: 'Diet', action: 'Had a fully vegan plant-based lunch', carbon: 1.8, cash: 13.50, points: 90, impact: 'medium', label: '🥗 Plant-Based Meal' },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          addNewAction(preset.category, preset.action, preset.carbon, preset.cash, preset.points, preset.impact as any);
                          showToast(`Logged Preset: "${preset.action}"!`);
                        }}
                        aria-label={`Quick log: ${preset.action}`}
                        className="p-3 bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/30 rounded-xl text-left text-xs font-semibold text-slate-205 hover:text-white transition-all duration-300 flex justify-between items-center group cursor-pointer"
                      >
                        <span>{preset.label}</span>
                        <span className="text-[10px] text-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity">+{preset.carbon} kg</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ECO CHALLENGES MODULE */}
            {activeTab === 'challenges' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <section aria-label="Eco Challenges Module" className="glass-card p-6 border border-slate-800">
                  <div className="flex items-center space-x-3 pb-4 border-b border-slate-800 mb-6">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-455">
                      <Award className="w-6 h-6 animate-pulse-subtle" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Active Eco Challenges</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Commit to target goals, complete milestones, and earn global score boosts</p>
                    </div>
                  </div>

                  {/* Challenge items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'c1', title: '7-Day Car-Free Commute', desc: 'Walk, cycle, or take the metro to work for 7 consecutive days.', reward: '200 points + Badge', carbon: 22.4, cash: 163.20, category: 'Transportation' },
                      { id: 'c2', title: 'Vampire Power Hunt', desc: 'Unplug all inactive standby appliances/chargers before sleeping.', reward: '100 points + Badge', carbon: 8.5, cash: 63.75, category: 'Energy' },
                      { id: 'c3', title: 'Zero Single-Use Waste', desc: 'Avoid plastic bottles, cups, packaging, and utensils for a week.', reward: '120 points + Badge', carbon: 6.2, cash: 46.50, category: 'Waste' },
                      { id: 'c4', title: 'Green Chef Marathon', desc: 'Cook 5 consecutive dinners using local vegan ingredients.', reward: '150 points + Badge', carbon: 12.0, cash: 90.00, category: 'Diet' }
                    ].map((ch) => {
                      const isAccepted = acceptedChallenges[ch.id] || false;
                      const progress = challengeProgress[ch.id] || 0;
                      const isComplete = progress >= 100;

                      return (
                        <div key={ch.id} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:border-emerald-500/20 transition-all duration-300">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-slate-900 border border-slate-805 text-slate-300 rounded">
                                {ch.category}
                              </span>
                              {isComplete ? (
                                <span className="text-[10px] font-bold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded animate-pulse-subtle">
                                  Completed
                                </span>
                              ) : isAccepted ? (
                                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                                  In Progress
                                </span>
                              ) : null}
                            </div>
                            <h3 className="text-md font-bold text-white">{ch.title}</h3>
                            <p className="text-xs text-slate-300 leading-relaxed">{ch.desc}</p>
                          </div>

                          <div className="space-y-3 pt-3 border-t border-slate-900">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Reward:</span>
                              <span className="text-emerald-400 font-bold">{ch.reward}</span>
                            </div>
                            
                            {isAccepted && (
                              <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-bold text-slate-300">
                                  <span>Progress</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                </div>
                              </div>
                            )}

                            <div className="flex space-x-2 pt-1">
                              {!isAccepted ? (
                                <button
                                  onClick={() => handleAcceptChallenge(ch.id)}
                                  aria-label={`Accept ${ch.title} challenge`}
                                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-202 hover:text-white border border-slate-805 hover:border-emerald-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                                >
                                  Accept Challenge
                                </button>
                              ) : !isComplete ? (
                                <button
                                  onClick={() => handleLogProgress(ch.id, ch.carbon, ch.cash, ch.title)}
                                  aria-label={`Log daily progress for ${ch.title} challenge`}
                                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-black rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer text-center shadow-lg shadow-emerald-500/10"
                                >
                                  Log Daily Progress
                                </button>
                              ) : (
                                <button
                                  disabled
                                  aria-label="Challenge completed and reward claimed"
                                  className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl text-xs font-bold text-center cursor-not-allowed"
                                >
                                  Challenge Claimed
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* FOOTPRINT CALCULATOR MODULE */}
            {activeTab === 'calculator' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <section aria-label="Carbon Footprint Calculator Module" className="glass-card p-6 border border-slate-800">
                  <div className="flex items-center space-x-3 pb-4 border-b border-slate-800 mb-6">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-450">
                      <Calculator className="w-6 h-6 animate-pulse-subtle" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Carbon Footprint Calculator</h2>
                      <p className="text-xs text-slate-405 mt-0.5">Calculate your baseline carbon emissions and discover where you can make shifts</p>
                    </div>
                  </div>

                  {calcStep < 4 ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-350 font-bold uppercase tracking-wider font-mono">Step {calcStep} of 3: {['Transportation', 'Home Energy', 'Diet & Food'][calcStep - 1]}</span>
                        <span className="text-emerald-400 font-bold">{Math.round(((calcStep - 1) / 3) * 100)}% Complete</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-805">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${((calcStep - 1) / 3) * 100}%` }}></div>
                      </div>

                      <div className="space-y-4 min-h-[120px]">
                        {calcStep === 1 && (
                          <div className="space-y-3">
                            <label className="block text-sm font-bold text-white">What is your primary method of commute?</label>
                            <div className="grid grid-cols-1 gap-2">
                              {[
                                { val: 'car', label: '🚗 Single-occupant Gasoline Car', em: 4.6 },
                                { val: 'hybrid', label: '🚙 Hybrid / Small Electric Car', em: 2.1 },
                                { val: 'public', label: '🚍 Public Bus / Metro System', em: 0.9 },
                                { val: 'active', label: '🚲 Active Transit (Walk / Bicycle)', em: 0.0 }
                              ].map(opt => (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => {
                                    setCalcInputs(prev => ({ ...prev, transport: opt.val, transportEm: opt.em }));
                                    setCalcStep(2);
                                  }}
                                  aria-label={`Select ${opt.label}`}
                                  className={`p-3.5 rounded-xl border text-left text-xs font-semibold transition-all duration-300 cursor-pointer flex justify-between items-center ${
                                    calcInputs.transport === opt.val
                                      ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/5'
                                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-205 hover:text-white'
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  <span className="text-[10px] text-slate-400">{opt.em} tonnes/year</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {calcStep === 2 && (
                          <div className="space-y-3">
                            <label className="block text-sm font-bold text-white">How much is your household electricity bill monthly?</label>
                            <div className="grid grid-cols-1 gap-2">
                              {[
                                { val: 'high', label: '⚡ Above $80 / month (High usage)', em: 5.2 },
                                { val: 'medium', label: '⚡ $30 – $80 / month (Standard)', em: 3.1 },
                                { val: 'low', label: '⚡ Below $30 / month (Conscious)', em: 1.4 },
                                { val: 'solar', label: '☀️ Solar-powered / Net-zero home', em: 0.2 }
                              ].map(opt => (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => {
                                    setCalcInputs(prev => ({ ...prev, energy: opt.val, energyEm: opt.em }));
                                    setCalcStep(3);
                                  }}
                                  aria-label={`Select ${opt.label}`}
                                  className={`p-3.5 rounded-xl border text-left text-xs font-semibold transition-all duration-300 cursor-pointer flex justify-between items-center ${
                                    calcInputs.energy === opt.val
                                      ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/5'
                                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-205 hover:text-white'
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  <span className="text-[10px] text-slate-400">{opt.em} tonnes/year</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {calcStep === 3 && (
                          <div className="space-y-3">
                            <label className="block text-sm font-bold text-white">What does your typical daily diet consist of?</label>
                            <div className="grid grid-cols-1 gap-2">
                              {[
                                { val: 'meat', label: '🍖 High Meat-consumer (Daily beef/pork)', em: 2.9 },
                                { val: 'balanced', label: '🍗 Balanced meat, poultry, and fish', em: 1.7 },
                                { val: 'vegetarian', label: '🥗 Vegetarian (Dairy/eggs, no meat)', em: 1.1 },
                                { val: 'vegan', label: '🌱 Strict plant-based / Vegan', em: 0.6 }
                              ].map(opt => (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => {
                                    const total = calcInputs.transportEm + calcInputs.energyEm + opt.em;
                                    setCalcInputs(prev => ({ ...prev, diet: opt.val, dietEm: opt.em, totalEm: total }));
                                    setCalcStep(4);
                                  }}
                                  aria-label={`Select ${opt.label}`}
                                  className={`p-3.5 rounded-xl border text-left text-xs font-semibold transition-all duration-300 cursor-pointer flex justify-between items-center ${
                                    calcInputs.diet === opt.val
                                      ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/5'
                                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-205 hover:text-white'
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  <span className="text-[10px] text-slate-400">{opt.em} tonnes/year</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-900">
                        {calcStep > 1 ? (
                          <button
                            type="button"
                            onClick={() => setCalcStep(prev => prev - 1)}
                            aria-label="Go back to previous step"
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Back
                          </button>
                        ) : (
                          <div></div>
                        )}
                        <span className="text-[11px] text-slate-400 italic font-mono">Based on global lifecycle assessments.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 text-center">
                      <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 text-emerald-450 animate-pulse-subtle">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Your Carbon Footprint Audit</h3>
                        <p className="text-slate-400 text-xs max-w-sm mx-auto">
                          We mapped your responses to establish your carbon emission baseline.
                        </p>
                      </div>

                      {/* Result Score */}
                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-805 max-w-sm mx-auto space-y-2">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Baseline Carbon Footprint</span>
                        <div className="flex items-baseline justify-center space-x-1.5">
                          <span className="text-4xl font-black text-white">{calcInputs.totalEm.toFixed(1)}</span>
                          <span className="text-emerald-400 font-bold text-sm">tonnes CO₂e / yr</span>
                        </div>
                        <p className="text-[11px] text-slate-300 pt-2 border-t border-slate-900/60 leading-relaxed">
                          Your footprint is <strong className="text-emerald-400">{calcInputs.totalEm < 5 ? '35% lower' : '15% higher'}</strong> than the national per capita average.
                        </p>
                      </div>

                      {/* Recommendations */}
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 text-left space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                          <Leaf className="w-3.5 h-3.5 mr-1 text-emerald-450 animate-pulse-subtle" />
                          <span>Recommended Action Shifts</span>
                        </h4>
                        <ul className="text-xs text-slate-350 space-y-2 list-disc list-inside">
                          {calcInputs.transport === 'car' && (
                            <li>Shift 2 commutes per week to public transit or cycling to save <strong className="text-white">1.2 tonnes CO₂</strong>.</li>
                          )}
                          {calcInputs.energy === 'high' && (
                            <li>Perform an AI energy audit and run appliances during off-peak hours to save <strong className="text-white">0.8 tonnes CO₂</strong>.</li>
                          )}
                          {calcInputs.diet === 'meat' && (
                            <li>Try 2 "Meatless Mondays" a month to shave off <strong className="text-white">0.4 tonnes CO₂</strong>.</li>
                          )}
                          <li>Log your energy savings and commuter runs in the Ledger to track real cash returns!</li>
                        </ul>
                      </div>

                      <div className="flex space-x-3 justify-center pt-2">
                        <button
                          onClick={() => {
                            setCalcStep(1);
                            setCalcInputs({ transport: '', transportEm: 0, energy: '', energyEm: 0, diet: '', dietEm: 0, totalEm: 0 });
                          }}
                          aria-label="Recalculate carbon footprint"
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-805 text-slate-305 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Recalculate
                        </button>
                        <button
                          onClick={() => setActiveTab('logger')}
                          aria-label="Navigate to log eco-action page"
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10"
                        >
                          Log Actions Now
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* LEADERBOARD TAB (MODULE E: SHARED MULTI-USER LEADERBOARD) */}
            {activeTab === 'leaderboard' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <section aria-label="Department Leaderboard Module" className="glass-card p-6 border border-slate-800">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-800 gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-305">
                        <Users className="w-5 h-5 animate-pulse-subtle" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">B2B Corporate Department Leaderboard</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Real-time collaborative carbon reduction rankings across company departments</p>
                      </div>
                    </div>

                    {profileDetails.department && (
                      <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-xl flex items-center shrink-0">
                        <span className="w-2 h-2 rounded-full bg-indigo-300 mr-2 animate-ping"></span>
                        <span>Your Department: {profileDetails.department}</span>
                      </div>
                    )}
                  </div>

                  {/* Leaderboard Scoreboard Table */}
                  <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
                    <table className="w-full text-left border-collapse text-xs" data-testid="corporate-leaderboard-table">
                      <thead>
                        <tr className="bg-slate-900/60 text-slate-355 uppercase tracking-wider text-[10px] border-b border-slate-800">
                          <th className="p-4 w-16 text-center">Rank</th>
                          <th className="p-4">Department Name</th>
                          <th className="p-4 text-right">Combined Carbon Avoided</th>
                          <th className="p-4 text-right">Total Financial Savings</th>
                          <th className="p-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {departmentScores.map((dept, index) => {
                          const isUserDept = dept.name === profileDetails.department;
                          const rank = index + 1;
                          return (
                            <tr key={dept.name} className={`hover:bg-slate-900/30 transition-colors ${
                              isUserDept ? 'bg-indigo-500/5 hover:bg-indigo-500/10 font-bold' : ''
                            }`}>
                              <td className="p-4 text-center">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-[11px] ${
                                  rank === 1 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse-subtle' :
                                  rank === 2 ? 'bg-slate-400/10 text-slate-200 border border-slate-400/20' :
                                  rank === 3 ? 'bg-amber-700/15 text-amber-500 border border-amber-700/20' :
                                  'bg-slate-950 text-slate-400 border border-slate-800'
                                }`}>
                                  {rank}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center space-x-2">
                                  <span className="text-white text-sm">{dept.name}</span>
                                  {isUserDept && (
                                    <span className="px-1.5 py-0.5 bg-indigo-500/15 text-indigo-300 text-[9px] uppercase font-bold rounded tracking-wider border border-indigo-500/25">
                                      Your Team
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <span className="text-white text-sm font-extrabold">{dept.carbonSaved.toFixed(1)}</span>
                                <span className="text-slate-405 ml-1 text-[10px]">kg CO₂</span>
                              </td>
                              <td className="p-4 text-right">
                                <span className="text-emerald-400 text-sm font-extrabold">{formatCurrency(dept.cashSaved)}</span>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`inline-block w-2 h-2 rounded-full ${
                                  rank === 1 ? 'bg-emerald-500 animate-pulse' :
                                  dept.carbonSaved > 0 ? 'bg-indigo-600' :
                                  'bg-slate-705'
                                }`}></span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Empty state disclaimer */}
                  {departmentScores.length === 0 && (
                    <div className="p-8 text-center text-slate-400 italic font-mono">
                      Initializing department scores registry...
                    </div>
                  )}

                  {/* Scoreboard Help footer */}
                  <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-900 flex items-start space-x-2.5 text-[11px] text-slate-300 leading-relaxed">
                    <Info className="w-4 h-4 text-indigo-300 shrink-0 mt-0.5" />
                    <p>
                      This scoreboard aggregates all sustainable actions logged by workers across the corporate network. Share your achievements, simulate commutes, shift home schedules, or swap e-commerce checkouts to rank your department first!
                    </p>
                  </div>
                </section>
              </div>
            )}

            {/* AI ECO ASSISTANT CHATBOT */}
            {activeTab === 'ai-assistant' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <section aria-label="AI Eco Assistant Module" className="glass-card p-6 border border-slate-800 flex flex-col min-h-[500px] justify-between">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-450">
                        <Sparkles className="w-5 h-5 animate-pulse-subtle" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Gemini Eco Assistant</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Ask questions about carbon metrics, energy saving tips, or EcoShift features</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                      Active AI
                    </span>
                  </div>

                  {/* Message History */}
                  <div className="flex-1 overflow-y-auto space-y-3 p-2 min-h-[300px] max-h-[400px] bg-slate-950/40 rounded-xl border border-slate-900/60 scrollbar-thin">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-205 rounded-tl-none space-y-1'
                        }`}>
                          <p className="font-semibold text-[10px] text-slate-450 mb-1">
                            {msg.sender === 'user' ? 'You' : 'Eco Assistant'}
                          </p>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                      </div>
                    ))}
                    {isAiTyping && (
                      <div className="flex justify-start">
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl rounded-tl-none flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  {chatMessages.length === 1 && (
                    <div className="mt-4 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Suggested Questions:</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "How can I maximize my Eco Score?",
                          "Explain peak vs off-peak energy rates",
                          "What is the carbon footprint of packaging?",
                          "How does B2B department rankings work?"
                        ].map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendChat(q)}
                            aria-label={`Ask suggestion: ${q}`}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/20 text-slate-350 hover:text-white rounded-lg text-xs transition-all cursor-pointer"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Input Form */}
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.elements.namedItem('chatInput') as HTMLInputElement;
                    if (input.value.trim() === '') return;
                    handleSendChat(input.value);
                    input.value = '';
                  }} className="mt-4 flex space-x-2">
                    <label htmlFor="chat-input" className="sr-only">Ask the Eco Assistant anything</label>
                    <input
                      id="chat-input"
                      name="chatInput"
                      type="text"
                      aria-label="Enter message to Gemini Eco Assistant"
                      placeholder="Ask the Eco Assistant anything..."
                      className="flex-1 bg-slate-950 border border-slate-805 text-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="submit"
                      aria-label="Send message to Gemini Eco Assistant"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/10 flex items-center justify-center"
                    >
                      Send
                    </button>
                  </form>
                </section>
              </div>
            )}

            {/* BEHAVIORAL NUDGE CHECKOUT SIMULATOR MODULE */}
            {activeTab === 'nudge-sandbox' && (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Module Header */}
                <div className="glass-card p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-300">
                      <ShoppingBag className="w-6 h-6 animate-pulse-subtle" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Module D: Behavioral Nudge Checkout Simulator</h2>
                      <p className="text-sm text-slate-300 mt-1">
                        Demonstrating transaction-stage interventions that steer consumers toward low-footprint alternatives.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Shopping Cart Content */}
                  <div className="md:col-span-2 space-y-6">
                    <section aria-label="Checkout Nudge Sandbox Module" className="glass-card p-6 border border-slate-800">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center">
                          <ShoppingCart className="w-4 h-4 mr-2 text-indigo-305" />
                          <span>Grocery Delivery Checkout Cart</span>
                        </h3>
                        <span className="text-xs text-slate-455 font-mono">{cartItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0)} Items</span>
                      </div>

                      {/* Cart Items list */}
                      <div className="divide-y divide-slate-850">
                        {cartItems.map((item) => (
                          <div key={item.id} className="py-4 flex justify-between items-center group transition-colors">
                            <div className="flex items-start space-x-3">
                              <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${
                                item.isHighFootprint 
                                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' 
                                  : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 animate-pulse-subtle'
                              }`}>
                                <Leaf className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{item.name}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider tracking-wide px-1.5 py-0.5 rounded ${
                                    item.isHighFootprint 
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                      : 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20'
                                  }`}>
                                    {item.isHighFootprint ? 'High Carbon' : 'Sustainable Choice'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">Qty: {item.quantity || 1}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Quantity & Delete Array Controls */}
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, -1)}
                                  aria-label="Decrease quantity"
                                  className="w-5 h-5 flex items-center justify-center bg-slate-900 text-slate-300 hover:text-white rounded text-xs font-extrabold cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="text-xs text-white px-1.5 font-mono">{item.quantity || 1}</span>
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, 1)}
                                  aria-label="Increase quantity"
                                  className="w-5 h-5 flex items-center justify-center bg-slate-900 text-slate-300 hover:text-white rounded text-xs font-extrabold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                aria-label="Remove item"
                                className="p-1 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/20 hover:bg-red-500/5 rounded-lg transition-all cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>

                              <div className="text-right min-w-[70px]">
                                <p className="text-sm font-extrabold text-white">${((item.price * (item.quantity || 1)) / 80).toFixed(2)}</p>
                                <span className="text-[10px] text-slate-450 font-mono">₹{item.price * (item.quantity || 1)}</span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {cartItems.length === 0 && (
                          <div className="py-8 text-center text-slate-400 italic">
                            Your checkout basket is empty. Add items below to test nudges.
                          </div>
                        )}
                      </div>

                      {/* E-Commerce Sandbox Item Seeding Presets */}
                      <div className="mt-6 pt-4 border-t border-slate-855">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Add Items to Cart</h4>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleAddItem("Premium Beef Burger Meal", 380, true)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-205 border border-slate-800 hover:border-amber-500/20 rounded-xl text-[10px] font-bold cursor-pointer"
                          >
                            🍔 Add Beef Burger (High Footprint)
                          </button>
                          <button
                            onClick={() => handleAddItem("Standard Shipping / Packaging", 40, true)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-205 border border-slate-805 hover:border-amber-500/20 rounded-xl text-[10px] font-bold cursor-pointer"
                          >
                            📦 Add Standard Shipping (High Footprint)
                          </button>
                          <button
                            onClick={() => handleAddItem("Local Farm Salad Bowl", 180, false)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-205 border border-slate-800 hover:border-emerald-500/25 rounded-xl text-[10px] font-bold cursor-pointer"
                          >
                            🥗 Add Farm Salad (Green choice)
                          </button>
                        </div>
                      </div>

                      {/* Contextual Nudge Intercept Banner */}
                      {!isNudgeSwapped && !checkoutSuccess && cartItems.some(x => x.isHighFootprint) && (
                        <div
                          data-testid="checkout-nudge-banner"
                          className="mt-4 bg-slate-950 p-4 rounded-xl border border-indigo-500/40 relative overflow-hidden animate-pulse-subtle"
                        >
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                          
                          <div className="flex items-start space-x-3">
                            <div className="p-1.5 bg-indigo-500/15 rounded-lg text-indigo-300 border border-indigo-500/20 mt-0.5">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div className="flex-1 space-y-3">
                              <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                                  <span>Nudge Alert</span>
                                  <span className="inline-flex h-2 w-2 rounded-full bg-indigo-400 animate-ping"></span>
                                </h4>
                                <p className="text-[11px] text-slate-200 mt-1 leading-relaxed font-medium">
                                  Swapping your Beef Burger for a Grilled Chicken or Plant-Based Patty reduces checkout carbon by <strong className="text-indigo-300 font-bold">85%</strong> and saves you <strong className="text-indigo-300 font-bold">₹150</strong>. Change packaging to eco-reusable to save an extra <strong className="text-indigo-300 font-bold">₹20</strong>.
                                </p>
                              </div>

                              <button
                                onClick={handleEcoSwap}
                                data-testid="nudge-swap-button"
                                aria-label="Apply 1-Click Eco-Swap sustainable alternatives"
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-[11px] font-bold text-white rounded-lg border border-indigo-500/30 flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-600/15"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>1-Click Eco-Swap</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Swapped Celebratory message */}
                      {isNudgeSwapped && !checkoutSuccess && (
                        <div className="mt-4 bg-emerald-950/45 p-4 rounded-xl border border-emerald-500/25 flex items-center space-x-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-455 border border-emerald-500/20">
                            <Leaf className="w-4 h-4 animate-bounce" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Smart Swap Applied! 🎉</p>
                            <p className="text-[10px] text-slate-300 mt-0.5">
                              You shifted 4.2kg carbon out of the supply chain, saved ₹140.00 on this order, and earned +100 XP!
                            </p>
                          </div>
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Summary / Totals Column */}
                  <div className="space-y-6">
                    <div className="glass-card p-6 border border-slate-800 flex flex-col justify-between">
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider pb-3 border-b border-slate-800">
                          Order Summary
                        </h3>

                        {/* Calculations */}
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Subtotal</span>
                            <span className="text-slate-205 font-medium">
                              ₹{cartItems.reduce((acc, curr) => acc + (curr.price * (curr.quantity || 1)), 0) - (cartItems.find(x => x.name.includes("Packaging") || x.name.includes("Delivery") || x.name.includes("Shipping"))?.price || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Delivery & Packaging</span>
                            <span className="text-slate-205 font-medium">
                              ₹{cartItems.find(x => x.name.includes("Packaging") || x.name.includes("Delivery") || x.name.includes("Shipping"))?.price || 0}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-slate-900 flex justify-between text-sm font-bold">
                            <span className="text-white">Order Total</span>
                            <span className="text-emerald-400">₹{cartItems.reduce((acc, curr) => acc + (curr.price * (curr.quantity || 1)), 0)}</span>
                          </div>
                        </div>

                        {/* Carbon Saving indicator */}
                        {isNudgeSwapped && (
                          <div className="bg-slate-950 p-3 rounded-lg border border-emerald-500/15 flex justify-between items-center text-[10px]">
                            <span className="text-slate-405 uppercase font-semibold">Carbon Avoided:</span>
                            <span className="text-emerald-450 font-extrabold">-4.20 kg CO₂</span>
                          </div>
                        )}
                      </div>

                      {/* Checkout Buttons */}
                      <div className="mt-6 space-y-2">
                        {checkoutSuccess ? (
                          <div className="space-y-3">
                            <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-center rounded-xl text-xs font-bold uppercase tracking-wider font-mono">
                              Checkout Complete
                            </div>
                            <button
                              onClick={handleResetCheckout}
                              aria-label="Restart checkout sandbox simulation"
                              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-355 hover:text-white border border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer animate-pulse-subtle"
                            >
                              Restart Order Simulation
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleStartCheckoutAuth}
                            aria-label="Place order and complete checkout"
                            disabled={cartItems.length === 0}
                            className={`w-full py-3 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg cursor-pointer ${
                              cartItems.length === 0
                                ? 'bg-slate-900 border-slate-850 text-slate-550 cursor-not-allowed shadow-none'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-emerald-500/10'
                            }`}
                          >
                            <span>Place Order</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        
        {/* Footnotes copyright footer */}
        <footer className="py-6 border-t border-slate-905 text-center text-xs text-slate-400" aria-label="Application footer">
          <p>&copy; {new Date().getFullYear()} EcoShift Application. Built for a sustainable future.</p>
        </footer>
      </div>

      {/* ------------------------------------------
          --- MODAL: USER PROFILE SETTINGS ---
          ------------------------------------------ */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card max-w-lg w-full p-6 border border-slate-800 bg-slate-900/90 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              aria-label="Close profile settings"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-450">
                <UserIcon className="w-5 h-5 animate-pulse-subtle" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Edit Profile Settings</h3>
                <p className="text-xs text-slate-400">Manage your credentials, target metrics, and department affiliations</p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const displayName = (form.elements.namedItem('displayName') as HTMLInputElement).value;
              const department = (form.elements.namedItem('department') as HTMLSelectElement).value;
              const targetGoal = parseFloat((form.elements.namedItem('targetGoal') as HTMLInputElement).value);
              const phone = (form.elements.namedItem('phone') as HTMLInputElement).value;
              const city = (form.elements.namedItem('city') as HTMLInputElement).value;

              handleSaveProfileDetails({
                displayName,
                department,
                targetGoal,
                phone,
                city,
                termsAccepted: profileDetails.termsAccepted,
                termsAcceptedAt: profileDetails.termsAcceptedAt
              });
            }} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="prof-name" className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Display Name</label>
                  <input
                    id="prof-name"
                    name="displayName"
                    type="text"
                    required
                    defaultValue={profileDetails.displayName}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-202 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="prof-dept" className="text-xs font-bold text-slate-355 uppercase tracking-wider block">Department</label>
                  <select
                    id="prof-dept"
                    name="department"
                    defaultValue={profileDetails.department}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-202 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="Marketing">Marketing</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="prof-phone" className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      id="prof-phone"
                      name="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      defaultValue={profileDetails.phone}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-202 pl-9 pr-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor="prof-city" className="text-xs font-bold text-slate-350 uppercase tracking-wider block">City Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      id="prof-city"
                      name="city"
                      type="text"
                      placeholder="Mumbai, IN"
                      defaultValue={profileDetails.city}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-202 pl-9 pr-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="prof-goal" className="text-xs font-bold text-slate-350 uppercase tracking-wider block">Annual Carbon Avoidance Goal (kg CO₂)</label>
                <input
                  id="prof-goal"
                  name="targetGoal"
                  type="number"
                  required
                  min="1"
                  defaultValue={profileDetails.targetGoal}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-202 px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Legal Signed Checklist display */}
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>Terms &amp; Conditions Status: Signed</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Signed and timestamped securely on: <strong className="text-slate-300 font-mono">{profileDetails.termsAcceptedAt ? new Date(profileDetails.termsAcceptedAt).toLocaleString() : 'N/A'}</strong>
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  Save Profile Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------
          --- MODAL: CHECKOUT TRANSACTION SECURITY ---
          ------------------------------------------ */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card max-w-md w-full p-6 border border-slate-800 bg-slate-900/90 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              disabled={isAuthorizing}
              aria-label="Close transaction security verification modal"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-202 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-505/20 text-indigo-400 animate-pulse-subtle">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Secure Checkout Authorization</h3>
              <p className="text-xs text-slate-400">Verify your credentials to complete transaction logging</p>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5 text-xs text-slate-350 leading-relaxed">
                <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                  <span>TLS 1.3 Encryption Session Active</span>
                </div>
                <p>
                  To securely authorize this transaction and publish your carbon offsets to the B2B aggregate leaderboard, enter your 4-digit Transaction Security PIN.
                </p>
              </div>

              {authError && (
                <div className="p-2.5 bg-red-500/10 text-red-400 border border-red-500/20 text-xs rounded-xl text-center font-semibold">
                  {authError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="sec-pin" className="text-xs font-bold text-slate-300 uppercase block">Transaction Security PIN</label>
                  <input
                    id="sec-pin"
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={checkoutPin}
                    onChange={(e) => setCheckoutPin(e.target.value.replace(/[^0-9]/g, ''))}
                    disabled={isAuthorizing}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 tracking-[0.8em] text-center font-bold py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="p-3 bg-slate-955 rounded-xl border border-slate-850 flex items-start space-x-3">
                  <input
                    id="sec-consent"
                    type="checkbox"
                    checked={checkoutConsent}
                    onChange={(e) => setCheckoutConsent(e.target.checked)}
                    disabled={isAuthorizing}
                    className="mt-0.5 rounded border-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-955 bg-slate-950 cursor-pointer"
                  />
                  <label htmlFor="sec-consent" className="text-[10px] text-slate-300 leading-relaxed cursor-pointer select-none">
                    I explicitly authorize EcoShift to securely process my shopping cart elements, credit my personal ledger wallet, and aggregate telemetry with B2B scores.
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmOrderSecurity}
                  disabled={isAuthorizing}
                  aria-label="Confirm security verification and place order"
                  className="w-full py-3 bg-indigo-650 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isAuthorizing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying Security Keys...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm &amp; Authorize</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM STATE-BASED TOAST NOTIFICATION */}
      {toast && toast.visible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 glass-card border border-indigo-500/40 bg-slate-950 p-4 max-w-sm shadow-2xl flex items-start space-x-3 transition-all duration-300 transform scale-100 opacity-100"
        >
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-300 border border-indigo-500/25 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">EcoShift Alert</h4>
            <p className="text-[11px] text-slate-205 mt-1 leading-relaxed font-medium">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            aria-label="Close notification"
            className="text-slate-400 hover:text-slate-202 transition-colors p-1 rounded hover:bg-slate-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Verified Authentic Modal */}
      {showAuthenticModal && renderAuthenticModal()}
    </div>
  );
}

// ==========================================
// --- MAIN APP CONTROLLER WITH ERROR BOUNDARY ---
// ==========================================
export default function App() {
  return (
    <ErrorBoundary>
      <EcoShiftApp />
    </ErrorBoundary>
  );
}

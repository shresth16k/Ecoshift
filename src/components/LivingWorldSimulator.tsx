import { memo } from 'react';

export interface LivingWorldProps {
  totalPoints: number;
  hasCleanEnergy: boolean;
  theme?: 'dark' | 'light';
  displayEcoScore: number;
  showToast: (msg: string) => void;
}

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

export const LivingWorldSimulator = memo(function LivingWorldSimulator({
  totalPoints,
  hasCleanEnergy,
  theme = 'dark',
  displayEcoScore,
  showToast
}: LivingWorldProps) {
  const factor = Math.min(1, Math.max(0, (totalPoints - 100) / 400));
  
  const skyTop = interpolateColor(theme === 'dark' ? '#1c1917' : '#d6d3d1', '#0a1a2e', factor);
  const skyMid1 = interpolateColor(theme === 'dark' ? '#292524' : '#e7e5e4', '#1a3a5a', factor);
  const skyMid2 = interpolateColor(theme === 'dark' ? '#1c1917' : '#cbd5e1', '#2a5a3a', factor);
  const skyBottom = interpolateColor(theme === 'dark' ? '#090d16' : '#e2e8f0', '#1a3a1a', factor);

  const skyBackground = `linear-gradient(180deg, ${skyTop} 0%, ${skyMid1} 40%, ${skyMid2} 70%, ${skyBottom} 100%)`;

  const isZone1Active = displayEcoScore < 45;
  const isZone2Active = displayEcoScore >= 45 && displayEcoScore < 65;
  const isZone3Active = displayEcoScore >= 65 && displayEcoScore < 80;
  const isZone4Active = displayEcoScore >= 80 && displayEcoScore <= 90;
  const isZone5Active = displayEcoScore > 90;

  const trees = [
    { base: "5,36 12,20 19,36", top: "8,28 12,14 16,28" },
    { base: "30,36 38,18 46,36", top: "33,26 38,12 43,26" },
    { base: "70,36 77,22 84,36", top: "73,30 77,18 81,30" },
    { base: "110,36 116,24 122,36", top: null },
    { base: "150,36 158,20 166,36", top: null },
    { base: "540,36 547,22 554,36", top: null },
    { base: "570,36 577,20 584,36", top: "573,28 577,14 581,28" }
  ];

  return (
    <div className="biosphere select-none w-full" data-testid="living-world-svg">
      <div className="bio-header">
        <div>
          <div className="bio-title text-white">Living-World Biosphere</div>
          <div className="bio-sub" style={{ marginTop: '3px' }}>Your actions shape the world in real-time.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span 
            onClick={() => showToast("The Biosphere updates dynamically as you log eco-actions and increase your Eco Score!")}
            style={{ fontSize: '9px', color: 'var(--text3)', background: 'var(--dark3)', border: '1px solid var(--border)', borderRadius: '5px', padding: '3px 7px', cursor: 'pointer' }}
          >
            What is this?
          </span>
          <span className="eco-badge">Eco Score: {displayEcoScore}</span>
        </div>
      </div>

      <div className="bio-canvas" style={{ background: skyBackground }}>
        {/* Sky / Environment state indicators */}
        <div className="sky-overlay">
          {displayEcoScore >= 65 && <div className="birds">〜〜 〜</div>}
          <div className="clouds">
            <div className={`cloud cloud-1 ${displayEcoScore >= 80 ? 'clean' : ''}`} />
            <div className={`cloud cloud-2 ${displayEcoScore >= 80 ? 'clean' : ''}`} />
          </div>
        </div>

        {/* The Solar Array / Windmill visual elements (active when clean energy is enabled) */}
        {(hasCleanEnergy || displayEcoScore >= 45) && (
          <div className="clean-power-infrastructure">
            {/* Solar Panel */}
            <svg className="solar-panel" viewBox="0 0 100 60">
              <rect x="20" y="24" width="60" height="24" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="2.5" />
              <line x1="20" y1="36" x2="80" y2="36" stroke="#475569" strokeWidth="1.5" />
              <line x1="40" y1="24" x2="40" y2="48" stroke="#475569" strokeWidth="1.5" />
              <line x1="60" y1="24" x2="60" y2="48" stroke="#475569" strokeWidth="1.5" />
              {/* Stand */}
              <rect x="47" y="48" width="6" height="12" fill="#64748b" />
              <line x1="30" y1="60" x2="70" y2="60" stroke="#64748b" strokeWidth="3.5" />
            </svg>

            {/* Windmill */}
            <div className="wind-turbine">
              <div className="turbine-pole" />
              <div className="turbine-blades">
                <div className="blade blade-1" />
                <div className="blade blade-2" />
                <div className="blade blade-3" />
              </div>
            </div>
          </div>
        )}

        {/* Industrial Smog stack (active when Eco Score is low) */}
        {displayEcoScore < 50 && (
          <div className="industry-pollution-node">
            <div className="factory-building">
              <rect x="226" y="12" width="8" height="8" fill={displayEcoScore >= 65 ? "#4ade8066" : "#ef444455"} />
              <rect x="238" y="12" width="8" height="8" fill={displayEcoScore >= 65 ? "#4ade8066" : "#ef444455"} />
              <rect x="250" y="12" width="8" height="8" fill={displayEcoScore >= 45 ? "#fbbf2444" : "#ef444455"} />
              <path d="M10 20 h35 v15 h-35 z" fill="#334155" />
              <rect x="20" y="10" width="6" height="10" fill="#475569" />
              <rect x="35" y="6" width="6" height="14" fill="#475569" />
            </div>
            <div className="smog-generator">
              <div className="smoke-puff puff-1" />
              <div className="smoke-puff puff-2" />
            </div>
          </div>
        )}

        {/* Terrain ground node */}
        <div className="ground-platform">
          <div className="dirt-strata" />
          <div className={`grass-canopy ${displayEcoScore >= 85 ? 'super-green' : displayEcoScore < 45 ? 'dead' : ''}`} />

          {/* Living forest elements */}
          <div className="forest-mesh">
            {trees.map((t, idx) => {
              // Hide some trees when score is low (deforestation effect)
              if (idx === 1 && displayEcoScore < 45) return null;
              if (idx === 2 && displayEcoScore < 60) return null;
              if (idx === 4 && displayEcoScore < 75) return null;
              if (idx === 5 && displayEcoScore < 85) return null;

              const isEvergreen = idx % 2 === 0;
              const fillBase = displayEcoScore >= 85 
                ? (isEvergreen ? '#065f46' : '#047857') 
                : displayEcoScore < 45
                  ? '#78350f'
                  : (isEvergreen ? '#15803d' : '#166534');

              return (
                <svg key={idx} className={`tree-svg tree-${idx + 1}`} viewBox="0 0 100 40">
                  <polygon points={t.base} fill={fillBase} />
                  {t.top && <polygon points={t.top} fill="#10b981" opacity="0.65" />}
                  {/* Tree Trunk */}
                  <rect x="11.5" y="36" width="1" height="4" fill="#78350f" />
                </svg>
              );
            })}
          </div>

          {/* Wildlife node */}
          {displayEcoScore >= 65 && (
            <div className="wildlife-node">
              <span className="animal rabbit-mesh">🐇</span>
              {displayEcoScore >= 80 && <span className="animal deer-mesh">🦌</span>}
            </div>
          )}
        </div>

        {/* Biosphere state badge */}
        <div className="biosphere-stage-badge">
          <span className="stage-title">State:</span>
          {isZone1Active && <span className="stage-val zone-1">Degraded Grid</span>}
          {isZone2Active && <span className="stage-val zone-2">Recovering</span>}
          {isZone3Active && <span className="stage-val zone-3">Sustainable</span>}
          {isZone4Active && <span className="stage-val zone-4">Biodiverse</span>}
          {isZone5Active && <span className="stage-val zone-5">Utopia</span>}
        </div>
      </div>
      <div className="tip">
        <span>✅</span>
        <span className="ml-1 text-[9px] text-[#4ade80] font-semibold">Tip: Keep improving your score to unlock new milestones and a greener world!</span>
      </div>
    </div>
  );
});

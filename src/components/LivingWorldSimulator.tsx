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

      <div className="scene">
        {/* Dynamic Sky */}
        <div className="sky" style={{ background: skyBackground }} />
        
        {/* Moon */}
        <div className="moon" />
        
        {/* Floating Clouds */}
        <div className="cloud" style={{ width: '50px', height: '16px', top: '20px', left: '60px', animationDelay: '0.5s' }} />
        <div className="cloud" style={{ width: '35px', height: '12px', top: '35px', left: '200px', animationDelay: '1.5s' }} />
        
        {/* Birds */}
        {displayEcoScore >= 65 && <div className="birds">〜〜 〜</div>}

        {/* Mountains background */}
        <svg style={{ position: 'absolute', bottom: '48px', width: '100%', left: 0 }} height="80" viewBox="0 0 600 80" preserveAspectRatio="none">
          <polygon points="0,80 80,10 160,80" fill="#1a2e1a" opacity=".7" />
          <polygon points="60,80 160,5 260,80" fill="#1e3a1e" opacity=".8" />
          <polygon points="200,80 300,15 400,80" fill="#1a351a" opacity=".9" />
          <polygon points="350,80 450,8 550,80" fill="#1a3a1a" />
          <polygon points="470,80 540,20 620,80" fill="#1a3a20" />
        </svg>

        {/* City buildings */}
        <svg style={{ position: 'absolute', bottom: '48px', left: '20px' }} width="500" height="80" viewBox="0 0 500 80">
          <rect x="10" y="30" width="30" height="50" fill="#1a3a5a" rx="1" />
          <rect x="15" y="25" width="20" height="5" fill="#1a5a8a" />
          <rect x="15" y="34" width="5" height="5" fill={displayEcoScore >= 45 ? "#fbbf2466" : "#fbbf2411"} />
          <rect x="25" y="34" width="5" height="5" fill={displayEcoScore >= 65 ? "#fbbf2466" : "#fbbf2411"} />
          <rect x="15" y="44" width="5" height="5" fill="#60a5fa44" />
          
          <rect x="55" y="15" width="45" height="65" fill="#1a3a5a" rx="1" />
          <rect x="60" y="10" width="35" height="5" fill="#2a5a9a" />
          <rect x="60" y="20" width="7" height="7" fill={displayEcoScore >= 65 ? "#fbbf2488" : "#fbbf2422"} />
          <rect x="72" y="20" width="7" height="7" fill={displayEcoScore >= 80 ? "#fbbf2488" : "#fbbf2422"} />
          <rect x="85" y="20" width="7" height="7" fill="#60a5fa44" />
          <rect x="60" y="33" width="7" height="7" fill="#60a5fa66" />
          <rect x="72" y="33" width="7" height="7" fill={displayEcoScore >= 45 ? "#fbbf2488" : "#fbbf2422"} />
          
          <rect x="130" y="22" width="35" height="58" fill="#1a4a6a" rx="1" />
          <rect x="135" y="17" width="25" height="5" fill="#2a6aaa" />
          
          <rect x="220" y="5" width="55" height="75" fill="#1a3060" rx="1" />
          <rect x="230" y="0" width="35" height="5" fill="#2a50a0" />
          <rect x="226" y="12" width="8" height="8" fill={displayEcoScore >= 80 ? "#4ade8088" : "#ef444455"} />
          <rect x="238" y="12" width="8" height="8" fill={displayEcoScore >= 90 ? "#4ade8088" : "#ef444455"} />
          <rect x="250" y="12" width="8" height="8" fill={displayEcoScore >= 65 ? "#fbbf2466" : "#ef444455"} />
          <rect x="226" y="26" width="8" height="8" fill="#60a5fa44" />
          <rect x="238" y="26" width="8" height="8" fill={displayEcoScore >= 45 ? "#fbbf2466" : "#ef444455"} />
          
          <rect x="310" y="28" width="28" height="52" fill="#1a3050" rx="1" />
          
          <rect x="380" y="18" width="40" height="62" fill="#182840" rx="1" />
          <rect x="385" y="13" width="30" height="5" fill="#2a4a80" />
          <rect x="388" y="24" width="7" height="7" fill={displayEcoScore >= 80 ? "#4ade8088" : "#fbbf2422"} />
          <rect x="400" y="24" width="7" height="7" fill="#60a5fa44" />
          
          <rect x="450" y="32" width="50" height="48" fill="#1a3055" rx="1" />
        </svg>

        {/* River */}
        <svg style={{ position: 'absolute', bottom: '30px', left: 0, width: '100%' }} height="25" viewBox="0 0 600 25" preserveAspectRatio="none">
          <path d="M0,12 Q100,5 200,12 Q300,19 400,12 Q500,5 600,12 L600,25 L0,25Z" fill="#1a4a6a" opacity=".6" />
        </svg>

        {/* Windmills */}
        {(hasCleanEnergy || displayEcoScore >= 45) && (
          <>
            <svg style={{ position: 'absolute', bottom: '55px', left: '40px' }} width="40" height="70" viewBox="0 0 40 70">
              <rect x="19" y="20" width="2" height="50" fill="#8a9a8a" />
              <g className="windmill-arm" style={{ transformOrigin: '20px 20px' }}>
                <rect x="19" y="2" width="2" height="18" fill="#c0d0c0" rx="1" />
                <rect x="2" y="19" width="18" height="2" fill="#c0d0c0" rx="1" />
                <rect x="19" y="20" width="2" height="18" fill="#c0d0c0" rx="1" />
                <rect x="20" y="19" width="18" height="2" fill="#c0d0c0" rx="1" />
              </g>
              <circle cx="20" cy="20" r="3" fill="#e0e8e0" />
            </svg>
            <svg style={{ position: 'absolute', bottom: '65px', left: '130px' }} width="30" height="55" viewBox="0 0 30 55">
              <rect x="14" y="15" width="2" height="40" fill="#8a9a8a" />
              <g className="windmill-arm2" style={{ transformOrigin: '15px 15px' }}>
                <rect x="14" y="1" width="2" height="14" fill="#c0d0c0" rx="1" />
                <rect x="1" y="14" width="14" height="2" fill="#c0d0c0" rx="1" />
                <rect x="14" y="15" width="2" height="14" fill="#c0d0c0" rx="1" />
                <rect x="15" y="14" width="14" height="2" fill="#c0d0c0" rx="1" />
              </g>
              <circle cx="15" cy="15" r="2" fill="#e0e8e0" />
            </svg>
          </>
        )}

        {/* Trees (deforestation / reforestation based on Eco Score) */}
        <svg style={{ position: 'absolute', bottom: '14px' }} width="600" height="36" viewBox="0 0 600 36">
          <polygon points="5,36 12,20 19,36" fill="#1a4a1a" />
          <polygon points="8,28 12,14 16,28" fill="#22601a" />
          
          {displayEcoScore >= 45 && (
            <>
              <polygon points="30,36 38,18 46,36" fill="#1a4a1a" />
              <polygon points="33,26 38,12 43,26" fill="#22601a" />
            </>
          )}
          
          {displayEcoScore >= 60 && (
            <>
              <polygon points="70,36 77,22 84,36" fill="#1a4a1a" />
              <polygon points="73,30 77,18 81,30" fill="#22601a" />
            </>
          )}

          {displayEcoScore >= 65 && (
            <polygon points="110,36 116,24 122,36" fill="#1a5a1a" />
          )}

          {displayEcoScore >= 75 && (
            <polygon points="150,36 158,20 166,36" fill="#1a4a1a" />
          )}

          {displayEcoScore >= 80 && (
            <polygon points="540,36 547,22 554,36" fill="#1a4a1a" />
          )}

          {displayEcoScore >= 85 && (
            <>
              <polygon points="570,36 577,20 584,36" fill="#1a4a1a" />
              <polygon points="573,28 577,14 581,28" fill="#22601a" />
            </>
          )}
        </svg>

        {/* Ground */}
        <div className="ground" />

        {/* Road */}
        <div className="road">
          <div className="road-line" style={{ left: '5%' }} />
          <div className="road-line" style={{ left: '20%' }} />
          <div className="road-line" style={{ left: '35%' }} />
          <div className="road-line" style={{ left: '50%' }} />
          <div className="road-line" style={{ left: '65%' }} />
          <div className="road-line" style={{ left: '80%' }} />
        </div>

        {/* Animated Train (Only active when Eco Score shows progress) */}
        {displayEcoScore >= 50 && (
          <div className="train-wrapper">
            <svg width="260" height="32" viewBox="0 0 260 32">
              {/* Engine */}
              <rect x="180" y="6" width="70" height="20" rx="3" fill="#c0c8d0" />
              <rect x="185" y="3" width="55" height="8" rx="2" fill="#d0d8e0" />
              <rect x="230" y="2" width="15" height="6" rx="2" fill="#a0a8b0" />
              {/* engine windows */}
              <rect x="192" y="8" width="8" height="7" rx="1" fill="#60a5fa" opacity=".7" />
              <rect x="204" y="8" width="8" height="7" rx="1" fill="#60a5fa" opacity=".7" />
              <rect x="216" y="8" width="8" height="7" rx="1" fill="#60a5fa" opacity=".7" />
              {/* engine front */}
              <polygon points="246,6 258,10 258,22 246,26" fill="#b0b8c0" />
              <rect x="246" y="11" width="4" height="4" rx="1" fill="#fbbf24" opacity=".8" />
              {/* wheels */}
              <circle cx="196" cy="26" r="5" fill="#606870" stroke="#808890" strokeWidth="1" />
              <circle cx="196" cy="26" r="2" fill="#a0a8b0" />
              <circle cx="214" cy="26" r="5" fill="#606870" stroke="#808890" strokeWidth="1" />
              <circle cx="214" cy="26" r="2" fill="#a0a8b0" />
              <circle cx="234" cy="26" r="5" fill="#606870" stroke="#808890" strokeWidth="1" />
              <circle cx="234" cy="26" r="2" fill="#a0a8b0" />
              <circle cx="250" cy="26" r="5" fill="#606870" stroke="#808890" strokeWidth="1" />
              <circle cx="250" cy="26" r="2" fill="#a0a8b0" />
              {/* Car 1 */}
              <rect x="100" y="6" width="74" height="20" rx="3" fill="#4a7a5a" />
              <rect x="106" y="3" width="62" height="8" rx="2" fill="#5a8a6a" />
              <rect x="108" y="8" width="9" height="7" rx="1" fill="#e8f8f0" opacity=".6" />
              <rect x="122" y="8" width="9" height="7" rx="1" fill="#e8f8f0" opacity=".6" />
              <rect x="136" y="8" width="9" height="7" rx="1" fill="#e8f8f0" opacity=".6" />
              <rect x="150" y="8" width="9" height="7" rx="1" fill="#e8f8f0" opacity=".6" />
              <rect x="104" y="22" width="66" height="3" rx="1" fill="#3a6a4a" />
              <circle cx="112" cy="27" r="4" fill="#505850" stroke="#707870" strokeWidth="1" />
              <circle cx="112" cy="27" r="1.5" fill="#909890" />
              <circle cx="128" cy="27" r="4" fill="#505850" stroke="#707870" strokeWidth="1" />
              <circle cx="128" cy="27" r="1.5" fill="#909890" />
              <circle cx="156" cy="27" r="4" fill="#505850" stroke="#707870" strokeWidth="1" />
              <circle cx="156" cy="27" r="1.5" fill="#909890" />
              <circle cx="170" cy="27" r="4" fill="#505850" stroke="#707870" strokeWidth="1" />
              <circle cx="170" cy="27" r="1.5" fill="#909890" />
              {/* EcoShift logo on car */}
              <text x="130" y="18" textAnchor="middle" fill="#4ade80" fontSize="5" fontWeight="700">🌿 EcoShift</text>
              {/* Car 2 */}
              <rect x="20" y="6" width="74" height="20" rx="3" fill="#3a6a8a" />
              <rect x="26" y="3" width="62" height="8" rx="2" fill="#4a7a9a" />
              <rect x="28" y="8" width="9" height="7" rx="1" fill="#e0f0ff" opacity=".6" />
              <rect x="42" y="8" width="9" height="7" rx="1" fill="#e0f0ff" opacity=".6" />
              <rect x="56" y="8" width="9" height="7" rx="1" fill="#e0f0ff" opacity=".6" />
              <rect x="70" y="8" width="9" height="7" rx="1" fill="#e0f0ff" opacity=".6" />
              <rect x="24" y="22" width="66" height="3" rx="1" fill="#2a5a7a" />
              <circle cx="32" cy="27" r="4" fill="#505870" stroke="#707890" strokeWidth="1" />
              <circle cx="32" cy="27" r="1.5" fill="#9098b0" />
              <circle cx="48" cy="27" r="4" fill="#505870" stroke="#707890" strokeWidth="1" />
              <circle cx="48" cy="27" r="1.5" fill="#9098b0" />
              <circle cx="76" cy="27" r="4" fill="#505870" stroke="#707890" strokeWidth="1" />
              <circle cx="76" cy="27" r="1.5" fill="#9098b0" />
              <circle cx="90" cy="27" r="4" fill="#505870" stroke="#707890" strokeWidth="1" />
              <circle cx="90" cy="27" r="1.5" fill="#9098b0" />
              {/* connector */}
              <rect x="95" y="14" width="8" height="3" fill="#808080" />
              <rect x="175" y="14" width="8" height="3" fill="#808080" />
              {/* smoke from engine */}
              <circle cx="240" cy="-2" r="5" fill="#c0c8d0" opacity=".3" />
              <circle cx="248" cy="-6" r="4" fill="#c0c8d0" opacity=".2" />
              <circle cx="255" cy="-9" r="3" fill="#c0c8d0" opacity=".1" />
            </svg>
          </div>
        )}
      </div>

      {/* Dynamic Zone Badges */}
      <div className="bio-zones">
        <div className={`zone ${isZone1Active ? 'active' : ''}`} style={{ color: '#e87a30' }}>
          <div className="zone-num">&lt; 45</div>
          <div className="zone-name">Industrial Smogscape (Degraded Grid)</div>
        </div>
        <div className={`zone ${isZone2Active ? 'active' : ''}`} style={{ color: '#c0c840' }}>
          <div className="zone-num">45 - 65</div>
          <div className="zone-name">Wind-Powered Valley (Recovering)</div>
        </div>
        <div className={`zone ${isZone3Active ? 'active' : ''}`} style={{ color: '#80c840' }}>
          <div className="zone-num">65 - 80</div>
          <div className="zone-name">Solar Suburban Oasis (Sustainable)</div>
        </div>
        <div className={`zone ${isZone4Active ? 'active' : ''}`} style={{ color: '#4ade80' }}>
          <div className="zone-num">80 - 90</div>
          <div className="zone-name">Eco-City Future (Biodiverse)</div>
        </div>
        <div className={`zone ${isZone5Active ? 'active' : ''}`} style={{ color: '#22c55e' }}>
          <div className="zone-num">&gt; 90</div>
          <div className="zone-name">Eco-Futurist Utopia (Utopia)</div>
        </div>
      </div>

      <div className="tip">
        <span>✅</span>
        <span className="ml-1 text-[9px] text-[#4ade80] font-semibold">Tip: Keep improving your score to unlock new milestones and a greener world!</span>
      </div>
    </div>
  );
});

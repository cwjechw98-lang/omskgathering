import { useEffect, useState } from 'react';

// Color palettes for each card color
const COLOR_PALETTES: Record<string, string[]> = {
  white:     ['#f5f0e1','#d4c5a0','#fffbe6','#c9a84c','#ffffff'],
  blue:      ['#4a90d9','#1a3a5c','#70b8ff','#2a5f8f','#a0d0ff'],
  black:     ['#6a2c8a','#2d1b3d','#9955bb','#1a1a2e','#c080e0'],
  red:       ['#ff4444','#ff7700','#ff2200','#ffaa00','#ff6633'],
  green:     ['#22aa44','#44dd66','#1a5a1a','#88ff88','#33cc55'],
  colorless: ['#888888','#aaaaaa','#666666','#bbbbbb','#999999'],
};

// Single particle component
function Particle({ 
  x, y, color, delay, size, angle, speed, type 
}: { 
  x: number; y: number; color: string; delay: number; 
  size: number; angle: number; speed: number; type: 'destroy' | 'play';
}) {
  const endX = x + Math.cos(angle) * speed * 150;
  const endY = y + Math.sin(angle) * speed * 150 + (type === 'destroy' ? 100 : -50);

  return (
    <div
      className="absolute rounded-sm"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        animation: `particleExplode 1.2s ease-out ${delay}s forwards`,
        '--end-x': `${endX - x}px`,
        '--end-y': `${endY - y}px`,
        transform: `rotate(${Math.random() * 360}deg)`,
      } as React.CSSProperties}
    />
  );
}

// Card play animation overlay - FULL SCREEN with portal-like behavior
export function CardPlayAnimation({ 
  cardName, 
  cardEmoji,
  cardColor,
  onComplete 
}: { 
  cardName: string; 
  cardEmoji: string;
  cardColor: string;
  onComplete: () => void;
}) {
  const [particles] = useState(() => {
    const palette = COLOR_PALETTES[cardColor] || COLOR_PALETTES.colorless;
    const arr = [];
    const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
    const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;
    
    // Create 40 particles exploding from center
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1 + Math.random() * 2;
      arr.push({
        x: centerX,
        y: centerY,
        color: palette[Math.floor(Math.random() * palette.length)],
        delay: Math.random() * 0.2,
        size: 4 + Math.random() * 8,
        angle,
        speed,
      });
    }
    return arr;
  });

  useEffect(() => {
    const timer = setTimeout(onComplete, 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%)',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <Particle key={i} {...p} type="play" />
        ))}
      </div>

      {/* Card name display */}
      <div 
        className="relative z-10 text-center px-8 py-6 rounded-2xl"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          border: `2px solid ${COLOR_PALETTES[cardColor]?.[0] || '#c9a84c'}`,
          boxShadow: `0 0 60px ${COLOR_PALETTES[cardColor]?.[0] || '#c9a84c'}40`,
          animation: 'cardNameAppear 0.5s ease-out',
        }}
      >
        <div className="text-6xl mb-4" style={{ animation: 'emojiPulse 1s ease-in-out infinite' }}>
          {cardEmoji}
        </div>
        <div 
          className="font-heading font-bold text-white"
          style={{ 
            fontSize: 'clamp(24px, 4vw, 40px)',
            textShadow: `0 0 20px ${COLOR_PALETTES[cardColor]?.[0] || '#c9a84c'}`,
          }}
        >
          {cardName}
        </div>
        <div className="text-[#c9a84c] font-body mt-2 text-sm">разыграна</div>
      </div>
    </div>
  );
}

// Card death animation overlay
export function CardDeathAnimation({ 
  cardName, 
  cardEmoji,
  cardColor,
  onComplete 
}: { 
  cardName: string; 
  cardEmoji: string;
  cardColor: string;
  onComplete: () => void;
}) {
  const [particles] = useState(() => {
    const palette = COLOR_PALETTES[cardColor] || COLOR_PALETTES.colorless;
    const arr = [];
    const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
    const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;
    
    // Create 30 particles for death
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      arr.push({
        x: centerX + (Math.random() - 0.5) * 200,
        y: centerY + (Math.random() - 0.5) * 200,
        color: palette[Math.floor(Math.random() * palette.length)],
        delay: Math.random() * 0.3,
        size: 3 + Math.random() * 6,
        angle,
        speed,
      });
    }
    return arr;
  });

  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(30,0,0,0.5) 0%, rgba(0,0,0,0.7) 100%)',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p, i) => (
          <Particle key={i} {...p} type="destroy" />
        ))}
      </div>

      {/* Card name display */}
      <div 
        className="relative z-10 text-center px-6 py-4 rounded-xl"
        style={{
          background: 'rgba(20,0,0,0.8)',
          border: '2px solid #ff4444',
          boxShadow: '0 0 40px rgba(255,0,0,0.3)',
          animation: 'cardNameAppear 0.4s ease-out',
        }}
      >
        <div className="text-4xl mb-2 opacity-50 grayscale">{cardEmoji}</div>
        <div 
          className="font-heading font-bold text-red-400"
          style={{ fontSize: 'clamp(18px, 3vw, 28px)' }}
        >
          {cardName}
        </div>
        <div className="text-red-500 font-body mt-1 text-sm">💀 УНИЧТОЖЕН</div>
      </div>
    </div>
  );
}

// Dust effect interface for backward compatibility
export interface DustEffect {
  x: number; 
  y: number; 
  w: number; 
  h: number;
  color: string; 
  type: 'destroy' | 'move';
}

// Main component - now just triggers the overlay animations
export function CardDustEffect({ 
  effects, 
  onEffectDone 
}: { 
  effects: DustEffect[];
  onEffectDone: (index: number) => void;
}) {
  // This is now handled by the overlay components directly
  // Just clean up effects immediately
  useEffect(() => {
    effects.forEach((_, idx) => {
      setTimeout(() => onEffectDone(idx), 100);
    });
  }, [effects, onEffectDone]);

  return null;
}

// Sparkle line for collection scroll
export function SparkleLoadLine({ visible }: { visible: boolean }) {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; delay: number }>>([]);

  useEffect(() => {
    if (!visible) return;
    
    const interval = setInterval(() => {
      setSparkles(prev => {
        const newSparkles = [...prev];
        if (newSparkles.length < 20) {
          newSparkles.push({
            id: Date.now() + Math.random(),
            x: Math.random() * 100,
            delay: Math.random() * 0.5,
          });
        }
        return newSparkles.filter(s => Date.now() - s.id < 2000);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="relative h-10 w-full overflow-hidden">
      {/* Horizontal line */}
      <div 
        className="absolute top-1/2 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #c9a84c 20%, #f0d68a 50%, #c9a84c 80%, transparent 100%)',
        }}
      />
      
      {/* Sparkles */}
      {sparkles.map(s => (
        <div
          key={s.id}
          className="absolute top-1/2 w-2 h-2 rounded-full bg-[#f0d68a]"
          style={{
            left: `${s.x}%`,
            transform: 'translateY(-50%)',
            boxShadow: '0 0 8px #c9a84c, 0 0 16px #f0d68a',
            animation: `sparkleFloat 1s ease-out ${s.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

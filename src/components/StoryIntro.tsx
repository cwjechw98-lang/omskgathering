import { useState, useEffect, useRef } from 'react';
import { INTRO_SEQUENCE } from '../data/lore';

interface Props {
  onComplete: () => void;
}

// Each slide has its own visual theme
const SLIDE_THEMES: Array<{
  bg: string;
  particleColor: string;
  effect: 'none' | 'lightning' | 'pulse' | 'vortex' | 'snow' | 'fire' | 'zoom' | 'shake';
}> = [
  {
    bg: 'radial-gradient(ellipse at center, #0a1628 0%, #050510 100%)',
    particleColor: '#4488ff',
    effect: 'none',
  },
  {
    bg: 'radial-gradient(ellipse at bottom, #0a1a2a 0%, #050510 100%)',
    particleColor: '#3399ff',
    effect: 'pulse',
  },
  {
    bg: 'radial-gradient(ellipse at center, #0a0a1e 0%, #050508 100%)',
    particleColor: '#aaccff',
    effect: 'snow',
  },
  {
    bg: 'radial-gradient(ellipse at bottom, #1a0a0a 0%, #050508 100%)',
    particleColor: '#ff6600',
    effect: 'fire',
  },
  {
    bg: 'radial-gradient(ellipse at center, #1a1a00 0%, #050508 100%)',
    particleColor: '#ffcc00',
    effect: 'pulse',
  },
  {
    bg: 'radial-gradient(ellipse at center, #0a0a1a 0%, #050508 100%)',
    particleColor: '#aa66ff',
    effect: 'vortex',
  },
  {
    bg: 'radial-gradient(ellipse at center, #1a0000 0%, #050508 100%)',
    particleColor: '#ff3333',
    effect: 'lightning',
  },
  {
    bg: 'radial-gradient(ellipse at center, #1a1508 0%, #050508 100%)',
    particleColor: '#c9a84c',
    effect: 'fire',
  },
];

export function StoryIntro({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  // Show skip button after 1.5s
  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Slide timing
  useEffect(() => {
    if (step >= INTRO_SEQUENCE.length) {
      onComplete();
      return;
    }

    const dur = 3000; // Default duration per slide
    const nextT = setTimeout(() => setStep((s) => s + 1), dur);

    return () => {
      clearTimeout(nextT);
    };
  }, [step, onComplete]);

  // Canvas particle effects per slide
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;
    const theme = SLIDE_THEMES[step] || SLIDE_THEMES[0];

    interface P {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      decay: number;
      color: string;
      angle?: number;
      radius?: number;
      speed?: number;
    }

    const particles: P[] = [];
    const count =
      theme.effect === 'snow'
        ? 100
        : theme.effect === 'fire'
          ? 80
          : theme.effect === 'vortex'
            ? 60
            : 40;

    for (let i = 0; i < count; i++) {
      const p: P = {
        x: Math.random() * W(),
        y: Math.random() * H(),
        vx: (Math.random() - 0.5) * 0.5,
        vy:
          theme.effect === 'snow'
            ? 0.5 + Math.random() * 1.5
            : theme.effect === 'fire'
              ? -(1 + Math.random() * 2)
              : (Math.random() - 0.5) * 0.5,
        size:
          theme.effect === 'snow'
            ? 1 + Math.random() * 3
            : theme.effect === 'fire'
              ? 2 + Math.random() * 4
              : 1 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.6,
        decay: 0,
        color: theme.particleColor,
      };
      if (theme.effect === 'vortex') {
        p.angle = Math.random() * Math.PI * 2;
        p.radius = 50 + Math.random() * 200;
        p.speed = 0.005 + Math.random() * 0.01;
      }
      particles.push(p);
    }

    // Lightning bolts
    let lightningTimer = 0;
    let lightningBolts: Array<{ points: Array<{ x: number; y: number }>; alpha: number }> = [];

    const generateLightning = () => {
      const startX = W() * (0.2 + Math.random() * 0.6);
      const points: Array<{ x: number; y: number }> = [{ x: startX, y: 0 }];
      let cx = startX,
        cy = 0;
      while (cy < H() * 0.8) {
        cx += (Math.random() - 0.5) * 80;
        cy += 20 + Math.random() * 40;
        points.push({ x: cx, y: cy });
      }
      lightningBolts.push({ points, alpha: 1 });
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, W(), H());

      // Particles
      for (const p of particles) {
        if (
          theme.effect === 'vortex' &&
          p.angle !== undefined &&
          p.radius !== undefined &&
          p.speed !== undefined
        ) {
          p.angle += p.speed;
          p.x = W() / 2 + Math.cos(p.angle) * p.radius;
          p.y = H() / 2 + Math.sin(p.angle) * p.radius;
          p.radius -= 0.05;
          if (p.radius < 5) p.radius = 50 + Math.random() * 200;
        } else {
          p.x += p.vx;
          p.y += p.vy;

          if (theme.effect === 'snow') {
            p.vx = Math.sin(time * 0.0005 + p.x * 0.01) * 0.5;
            if (p.y > H()) {
              p.y = -5;
              p.x = Math.random() * W();
            }
          } else if (theme.effect === 'fire') {
            p.vx += Math.sin(time * 0.003 + p.y * 0.01) * 0.05;
            if (p.y < -10) {
              p.y = H() + 5;
              p.x = Math.random() * W();
              p.alpha = 0.3 + Math.random() * 0.6;
            }
            p.alpha -= 0.002;
            if (p.alpha <= 0) {
              p.y = H() + 5;
              p.alpha = 0.3 + Math.random() * 0.6;
            }
          }
        }

        // Wrap
        if (p.x < -10) p.x = W() + 10;
        if (p.x > W() + 10) p.x = -10;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);

        if (theme.effect === 'fire') {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          g.addColorStop(0, '#ffffcc');
          g.addColorStop(0.3, p.color);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (theme.effect === 'snow') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          g.addColorStop(0, '#fff');
          g.addColorStop(0.4, p.color);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Pulse effect
      if (theme.effect === 'pulse') {
        const pulseSize = 100 + Math.sin(time * 0.002) * 50;
        const g = ctx.createRadialGradient(W() / 2, H() / 2, 0, W() / 2, H() / 2, pulseSize);
        g.addColorStop(0, theme.particleColor + '15');
        g.addColorStop(0.5, theme.particleColor + '08');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(W() / 2, H() / 2, pulseSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lightning
      if (theme.effect === 'lightning') {
        lightningTimer += 16;
        if (lightningTimer > 800 + Math.random() * 2000) {
          generateLightning();
          lightningTimer = 0;
        }

        for (let i = lightningBolts.length - 1; i >= 0; i--) {
          const bolt = lightningBolts[i];
          bolt.alpha -= 0.03;
          if (bolt.alpha <= 0) {
            lightningBolts.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = bolt.alpha;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.shadowColor = theme.particleColor;
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
          for (let j = 1; j < bolt.points.length; j++) {
            ctx.lineTo(bolt.points[j].x, bolt.points[j].y);
          }
          ctx.stroke();

          // Glow layer
          ctx.strokeStyle = theme.particleColor;
          ctx.lineWidth = 4;
          ctx.globalAlpha = bolt.alpha * 0.3;
          ctx.beginPath();
          ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
          for (let j = 1; j < bolt.points.length; j++) {
            ctx.lineTo(bolt.points[j].x, bolt.points[j].y);
          }
          ctx.stroke();
          ctx.restore();

          // Flash overlay
          if (bolt.alpha > 0.7) {
            ctx.save();
            ctx.globalAlpha = (bolt.alpha - 0.7) * 0.15;
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, W(), H());
            ctx.restore();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      lightningBolts = [];
    };
  }, [step]);

  if (step >= INTRO_SEQUENCE.length) return null;
  const current = INTRO_SEQUENCE[step];
  const isLast = step === INTRO_SEQUENCE.length - 1;
  const theme = SLIDE_THEMES[step] || SLIDE_THEMES[0];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: theme.bg }}
    >
      {/* Canvas effects layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Content */}
      <div className="text-center px-8 max-w-2xl relative cinematic-in" style={{ zIndex: 10 }}>
        {/* Emoji with effects */}
        <div className="mb-6 relative">
          {/* Glow behind emoji */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-32 h-32 rounded-full"
              style={{
                background: `radial-gradient(circle, ${theme.particleColor}20 0%, transparent 70%)`,
                animation: 'pulseRing 2s ease-in-out infinite',
              }}
            />
          </div>
          <div
            className="emoji-float inline-block"
            style={{
              fontSize: isLast ? '6rem' : '5rem',
              filter: `drop-shadow(0 0 30px ${theme.particleColor}40)`,
            }}
          >
            {current.emoji}
          </div>
        </div>

        {/* Text */}
        <p
          className={`leading-relaxed tracking-wide ${
            isLast
              ? 'font-title text-5xl md:text-7xl lg:text-8xl text-[#f0d68a] title-glow'
              : 'font-heading text-xl md:text-3xl lg:text-4xl text-gray-100'
          }`}
          style={
            !isLast
              ? { textShadow: `0 0 20px ${theme.particleColor}30, 0 2px 4px rgba(0,0,0,0.8)` }
              : undefined
          }
        >
          {current.text}
        </p>

        {/* Subtitle on last slide */}
        {isLast && (
          <div className="mt-4 flex items-center gap-4 justify-center">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#c9a84c]/50" />
            <span className="font-heading text-lg md:text-xl tracking-[0.4em] subtitle-shimmer">
              КАРТОЧНАЯ ИГРА
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#c9a84c]/50" />
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div
        className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2"
        style={{ zIndex: 10 }}
      >
        {INTRO_SEQUENCE.map((__, i: number) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === step ? 'w-10' : i < step ? 'w-4' : 'w-4'
            }`}
            style={{
              backgroundColor:
                i === step ? theme.particleColor : i < step ? theme.particleColor + '40' : '#333',
              boxShadow: i === step ? `0 0 8px ${theme.particleColor}60` : 'none',
            }}
          />
        ))}
      </div>

      {/* Skip button */}
      {showSkip && (
        <button
          onClick={onComplete}
          className="absolute bottom-5 right-6 text-gray-600 hover:text-[#c9a84c] font-heading text-sm px-4 py-2 rounded-lg hover:bg-[#1a1508]/50 transition-all backdrop-blur-sm border border-transparent hover:border-[#c9a84c]/20"
          style={{ zIndex: 20 }}
        >
          Пропустить ▸▸
        </button>
      )}

      {/* Click to advance */}
      <button
        onClick={() => setStep((s) => s + 1)}
        className="absolute inset-0 cursor-pointer"
        style={{ zIndex: 5 }}
        aria-label="Далее"
      />
    </div>
  );
}

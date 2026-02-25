import { useRef, useEffect } from 'react';

interface Props {
  side: 'left' | 'right';
  className?: string;
}

export function Torch({ side, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 120;
    const H = 300;
    canvas.width = W * 2;
    canvas.height = H * 2;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(2, 2);

    interface Flame {
      x: number; y: number;
      vx: number; vy: number;
      size: number; alpha: number;
      decay: number; color: string;
    }

    const flames: Flame[] = [];
    const sparks: Flame[] = [];

    const flameColors = ['#ff6600', '#ff4400', '#ffaa00', '#ff8800', '#ff2200', '#ffcc00', '#ff0000'];
    const sparkColors = ['#ffee00', '#ffaa00', '#ff6600', '#ffffff'];

    const createFlame = (): Flame => ({
      x: W / 2 + (Math.random() - 0.5) * 16,
      y: H * 0.45,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -(1.5 + Math.random() * 3),
      size: 6 + Math.random() * 14,
      alpha: 0.7 + Math.random() * 0.3,
      decay: 0.01 + Math.random() * 0.015,
      color: flameColors[Math.floor(Math.random() * flameColors.length)],
    });

    const createSpark = (): Flame => ({
      x: W / 2 + (Math.random() - 0.5) * 10,
      y: H * 0.42,
      vx: (Math.random() - 0.5) * 2,
      vy: -(2 + Math.random() * 4),
      size: 0.5 + Math.random() * 2,
      alpha: 0.8 + Math.random() * 0.2,
      decay: 0.008 + Math.random() * 0.01,
      color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
    });

    // Init
    for (let i = 0; i < 40; i++) flames.push(createFlame());
    for (let i = 0; i < 15; i++) sparks.push(createSpark());

    const animate = (time: number) => {
      ctx.clearRect(0, 0, W, H);

      // === TORCH BODY (wooden stick) ===
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(W / 2 - 5, H * 0.45, 10, H * 0.55);

      // Wood grain
      const woodGrad = ctx.createLinearGradient(W / 2 - 4, 0, W / 2 + 4, 0);
      woodGrad.addColorStop(0, '#4a3020');
      woodGrad.addColorStop(0.3, '#6a4830');
      woodGrad.addColorStop(0.5, '#7a5840');
      woodGrad.addColorStop(0.7, '#6a4830');
      woodGrad.addColorStop(1, '#4a3020');
      ctx.fillStyle = woodGrad;
      ctx.fillRect(W / 2 - 4, H * 0.45, 8, H * 0.52);

      // Metal bracket
      const bracketGrad = ctx.createLinearGradient(W / 2 - 8, 0, W / 2 + 8, 0);
      bracketGrad.addColorStop(0, '#555');
      bracketGrad.addColorStop(0.3, '#888');
      bracketGrad.addColorStop(0.5, '#aaa');
      bracketGrad.addColorStop(0.7, '#888');
      bracketGrad.addColorStop(1, '#555');
      ctx.fillStyle = bracketGrad;
      ctx.fillRect(W / 2 - 8, H * 0.44, 16, 6);
      ctx.fillRect(W / 2 - 6, H * 0.48, 12, 4);

      // === FIRE BOWL (top of torch) ===
      ctx.fillStyle = '#3a2a1a';
      ctx.beginPath();
      ctx.moveTo(W / 2 - 12, H * 0.46);
      ctx.lineTo(W / 2 - 8, H * 0.42);
      ctx.lineTo(W / 2 + 8, H * 0.42);
      ctx.lineTo(W / 2 + 12, H * 0.46);
      ctx.closePath();
      ctx.fill();

      // === DYNAMIC FIRE GLOW (ambient light) ===
      const flicker = Math.sin(time * 0.005) * 0.1 + Math.sin(time * 0.013) * 0.05 + Math.cos(time * 0.007) * 0.08;
      const glowRadius = 70 + flicker * 30;
      const glowAlpha = 0.15 + flicker * 0.05;

      const glow = ctx.createRadialGradient(W / 2, H * 0.35, 0, W / 2, H * 0.35, glowRadius);
      glow.addColorStop(0, `rgba(255, 120, 0, ${glowAlpha + 0.1})`);
      glow.addColorStop(0.3, `rgba(255, 80, 0, ${glowAlpha})`);
      glow.addColorStop(0.6, `rgba(255, 40, 0, ${glowAlpha * 0.5})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // === FLAME PARTICLES ===
      for (let i = flames.length - 1; i >= 0; i--) {
        const f = flames[i];
        f.x += f.vx + Math.sin(time * 0.003 + i) * 0.5;
        f.y += f.vy;
        f.alpha -= f.decay;
        f.size *= 0.99;

        if (f.alpha <= 0 || f.y < H * 0.1) {
          flames[i] = createFlame();
          continue;
        }

        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
        grad.addColorStop(0, `rgba(255, 255, 200, ${f.alpha})`);
        grad.addColorStop(0.2, f.color + Math.floor(f.alpha * 255).toString(16).padStart(2, '0'));
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        // Elongated flame shape
        ctx.ellipse(f.x, f.y, f.size * 0.7, f.size, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // === SPARKS ===
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx + Math.sin(time * 0.01 + i * 3) * 0.3;
        s.y += s.vy;
        s.vy += 0.02; // slight gravity
        s.alpha -= s.decay;

        if (s.alpha <= 0 || s.y < 0) {
          sparks[i] = createSpark();
          continue;
        }

        ctx.save();
        ctx.globalAlpha = s.alpha;
        // Spark glow
        const sg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3);
        sg.addColorStop(0, '#fff');
        sg.addColorStop(0.3, s.color);
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
        ctx.fill();
        // Core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      style={{
        transform: side === 'right' ? 'scaleX(-1)' : undefined,
        filter: 'drop-shadow(0 0 20px rgba(255,100,0,0.3))',
      }}
    />
  );
}

import { useRef, useEffect } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; alpha: number;
  decay: number; color: string;
  life: number; maxLife: number;
}

interface Props {
  type?: 'embers' | 'snow' | 'magic' | 'smoke';
  density?: number;
  className?: string;
  interactive?: boolean;
}

export function ParticleCanvas({ type = 'embers', density = 60, className = '', interactive = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const mouse = useRef({ x: -1, y: -1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    const colors: Record<string, string[]> = {
      embers: ['#ff6600', '#ff4400', '#ffaa00', '#ff8800', '#cc3300', '#ffcc44'],
      snow: ['#ffffff', '#ddeeff', '#bbccff', '#aabbee', '#cce0ff'],
      magic: ['#c9a84c', '#f0d68a', '#ff66ff', '#66aaff', '#44ffaa', '#ffaa44'],
      smoke: ['#333333', '#444444', '#555555', '#3a3a3a', '#4a4a4a'],
    };

    const createParticle = (): Particle => {
      const c = colors[type];
      const color = c[Math.floor(Math.random() * c.length)];

      if (type === 'embers') {
        // Embers rise from bottom, drift, flicker
        const side = Math.random() > 0.7;
        return {
          x: side ? (Math.random() > 0.5 ? W() * 0.15 : W() * 0.85) + (Math.random() - 0.5) * 60 : Math.random() * W(),
          y: H() + 10,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -(0.5 + Math.random() * 1.5),
          size: 1 + Math.random() * 3,
          alpha: 0.6 + Math.random() * 0.4,
          decay: 0.003 + Math.random() * 0.005,
          color, life: 0, maxLife: 150 + Math.random() * 200,
        };
      }
      if (type === 'snow') {
        return {
          x: Math.random() * W(),
          y: -10,
          vx: (Math.random() - 0.5) * 0.3,
          vy: 0.3 + Math.random() * 1,
          size: 1 + Math.random() * 3,
          alpha: 0.2 + Math.random() * 0.5,
          decay: 0.001,
          color, life: 0, maxLife: 500,
        };
      }
      if (type === 'magic') {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 0.6;
        return {
          x: W() / 2 + (Math.random() - 0.5) * W() * 0.8,
          y: H() / 2 + (Math.random() - 0.5) * H() * 0.8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 1 + Math.random() * 2.5,
          alpha: 0.3 + Math.random() * 0.6,
          decay: 0.004 + Math.random() * 0.004,
          color, life: 0, maxLife: 120 + Math.random() * 150,
        };
      }
      // smoke
      return {
        x: W() / 2 + (Math.random() - 0.5) * 100,
        y: H() * 0.6,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(0.2 + Math.random() * 0.5),
        size: 5 + Math.random() * 15,
        alpha: 0.05 + Math.random() * 0.1,
        decay: 0.001,
        color, life: 0, maxLife: 300,
      };
    };

    // Initialize particles
    particles.current = [];
    for (let i = 0; i < density; i++) {
      const p = createParticle();
      p.y = Math.random() * H();
      p.life = Math.random() * p.maxLife;
      particles.current.push(p);
    }

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    if (interactive) {
      canvas.addEventListener('mousemove', handleMouse);
    }

    let lastTime = 0;
    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.67, 3); // normalize to ~60fps
      lastTime = time;

      ctx.clearRect(0, 0, W(), H());

      const ps = particles.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += dt;

        if (p.life > p.maxLife || p.alpha <= 0 || p.y < -20 || p.y > H() + 20) {
          ps[i] = createParticle();
          continue;
        }

        // Mouse repulsion
        const mx = mouse.current.x, my = mouse.current.y;
        if (interactive && mx >= 0) {
          const dx = p.x - mx, dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80 && dist > 0) {
            const force = (80 - dist) / 80 * 0.3;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Wind effect for embers
        if (type === 'embers') {
          p.vx += Math.sin(time * 0.001 + p.y * 0.01) * 0.02;
        }
        // Sway for snow
        if (type === 'snow') {
          p.vx = Math.sin(time * 0.0005 + p.x * 0.01) * 0.3;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * dt;

        // Draw
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);

        if (type === 'embers') {
          // Glow effect
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          grd.addColorStop(0, p.color);
          grd.addColorStop(0.4, p.color + '88');
          grd.addColorStop(1, 'transparent');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
          // Core
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = Math.max(0, p.alpha * 0.8);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === 'magic') {
          // Sparkle
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          grd.addColorStop(0, '#fff');
          grd.addColorStop(0.3, p.color);
          grd.addColorStop(1, 'transparent');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === 'snow') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Smoke
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      if (interactive) {
        canvas.removeEventListener('mousemove', handleMouse);
      }
    };
  }, [type, density, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
    />
  );
}

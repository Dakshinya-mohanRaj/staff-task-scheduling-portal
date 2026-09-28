"use client";

import * as React from "react";

export interface LightfallStreamProps {
  className?: string;
  speed?: number;
  density?: number;
  interactive?: boolean;
}

/**
 * Lightfall Stream
 * Procedural canvas flow field with sine-wave velocity and pointer interaction.
 */
export function LightfallStream({
  className = "w-full h-full min-h-[260px] relative overflow-hidden",
  speed = 1.0,
  density = 1800,
  interactive = true,
}: LightfallStreamProps): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const mouseRef = React.useRef({ x: 0, y: 0, active: false });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = (canvas.width = canvas.parentElement?.clientWidth ?? 600);
    let h = (canvas.height = canvas.parentElement?.clientHeight ?? 300);

    type Particle = { x: number; y: number; px: number; py: number; hue: number };
    const cols = Math.ceil(Math.sqrt(density * (w / h)));
    const rows = Math.ceil(density / cols);
    const particles: Particle[] = [];
    for (let i = 0; i < density; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      particles.push({ x, y, px: x, py: y, hue: Math.random() * 60 + 190 });
    }

    let t = 0, animId: number;
    const render = () => {
      ctx.fillStyle = "rgba(8, 10, 18, 0.12)";
      ctx.fillRect(0, 0, w, h);
      t += 0.015 * speed;
      for (const p of particles) {
        const angle = Math.sin(p.x / 120 + t) * Math.cos(p.y / 120 + t * 0.7) * Math.PI * 2;
        const spd = 1.2 * speed;
        if (interactive && mouseRef.current.active) {
          const dx = mouseRef.current.x - p.x, dy = mouseRef.current.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < 100) { p.x -= (dx / d) * 2; p.y -= (dy / d) * 2; }
        }
        p.px = p.x; p.py = p.y;
        p.x += Math.cos(angle) * spd;
        p.y += Math.sin(angle) * spd;
        if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = Math.random() * w; p.y = Math.random() * h; p.px = p.x; p.py = p.y;
        }
        ctx.strokeStyle = `hsla(${p.hue}, 75%, 65%, 0.55)`;
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      animId = requestAnimationFrame(render);
    };
    render();

    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top, active: true };
    };
    const onLeave = () => { mouseRef.current.active = false; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
    };
  }, [density, speed, interactive]);

  return (
    <div className={className} style={{ background: "#08090f" }}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

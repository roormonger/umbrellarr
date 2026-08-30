import { useMantineColorScheme } from "@mantine/core";
import { useEffect, useRef } from "react";
import { parseHexRgb } from "@/lib/highlightCss";
import classes from "./NebulaBackground.module.css";

type Blob = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  /** Base opacity; gently pulses over time. */
  alpha: number;
  phase: number;
  pulse: number;
};

type Star = {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
};

type Props = {
  color: string;
};

function seedBlobs(width: number, height: number, count: number): Blob[] {
  const blobs: Blob[] = [];
  for (let i = 0; i < count; i += 1) {
    // Keep a floor speed so random values never look static under frost blur.
    const speed = 0.35 + Math.random() * 0.55;
    const angle = Math.random() * Math.PI * 2;
    blobs.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.min(width, height) * (0.22 + Math.random() * 0.38),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 0.14 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2,
      pulse: 0.35 + Math.random() * 0.55,
    });
  }
  return blobs;
}

function seedStars(width: number, height: number, count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 0.6 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 1.2,
    });
  }
  return stars;
}

export function NebulaBackground({ color }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { colorScheme } = useMantineColorScheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const rgb = parseHexRgb(color);
    if (!rgb) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const light = colorScheme === "light";
    const cloudBoost = light ? 0.55 : 1;
    const starBoost = light ? 0.35 : 1;

    let width = 0;
    let height = 0;
    let blobs: Blob[] = [];
    let stars: Star[] = [];
    let raf = 0;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      blobs = seedBlobs(width, height, 6);
      stars = seedStars(width, height, Math.floor((width * height) / 18000));
    };

    const drawFrame = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = light ? "#f3f0f8" : "#121018";
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "lighter";
      for (const blob of blobs) {
        if (!reducedMotion) {
          // Slow wander on top of constant drift so motion reads through the frost.
          const wobble = 0.22 * Math.sin(time * 0.00035 + blob.phase);
          blob.x += blob.vx + wobble;
          blob.y += blob.vy + wobble * 0.65;
          if (blob.x < -blob.r) blob.x = width + blob.r;
          if (blob.x > width + blob.r) blob.x = -blob.r;
          if (blob.y < -blob.r) blob.y = height + blob.r;
          if (blob.y > height + blob.r) blob.y = -blob.r;
        }

        const breathe = reducedMotion
          ? 1
          : 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(time * 0.0007 * blob.pulse + blob.phase));
        const radius = blob.r * breathe;
        const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, radius);
        const a0 = blob.alpha * cloudBoost * breathe;
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a0})`);
        gradient.addColorStop(0.45, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a0 * 0.45})`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(blob.x, blob.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      for (const star of stars) {
        const twinkle = reducedMotion
          ? 0.55
          : 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(time * 0.001 * star.speed + star.phase));
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * starBoost})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    resize();
    drawFrame(0);

    const onResize = () => {
      resize();
      drawFrame(performance.now());
    };
    window.addEventListener("resize", onResize);

    if (!reducedMotion) {
      const tick = (time: number) => {
        if (!running) return;
        drawFrame(time);
        raf = window.requestAnimationFrame(tick);
      };
      raf = window.requestAnimationFrame(tick);
    }

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [color, colorScheme]);

  return (
    <>
      <canvas ref={canvasRef} className={classes.canvas} aria-hidden />
      <div className={classes.frost} aria-hidden />
    </>
  );
}

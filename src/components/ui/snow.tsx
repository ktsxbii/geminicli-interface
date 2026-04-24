"use client";

import React, { useEffect, useRef } from "react";

interface SnowProps {
  particleCount?: number;
  minSpeed?: number;
  maxSpeed?: number;
  minSize?: number;
  maxSize?: number;
  opacity?: number;
}

const Snow: React.FC<SnowProps> = ({
  particleCount = 150,
  minSpeed = 0.2, // "much slower"
  maxSpeed = 0.8,
  minSize = 1,
  maxSize = 3,
  opacity = 0.4,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      size: number;
      speed: number;
      wind: number;
      alpha: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * (maxSize - minSize) + minSize;
        this.speed = Math.random() * (maxSpeed - minSpeed) + minSpeed;
        this.wind = Math.random() * 0.5 - 0.25; // Subtle horizontal drift
        this.alpha = Math.random() * opacity;
      }

      update() {
        this.y += this.speed;
        this.x += this.wind;

        // Loop back to top
        if (this.y > canvas.height) {
          this.y = -10;
          this.x = Math.random() * canvas.width;
        }

        // Wrap horizontal
        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [particleCount, minSpeed, maxSpeed, minSize, maxSize, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ filter: "blur(0.5px)" }} // High-fidelity soft look
    />
  );
};

export default Snow;

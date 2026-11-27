import { useReducedMotion } from 'motion/react';
import { useState, type PointerEvent, type ReactNode } from 'react';

interface Card3DProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

/**
 * Interactive pointer-tilting 3D container with soft specular studio glare.
 */
export function Card3D({ children, className = '', intensity = 8 }: Card3DProps) {
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setState({
      rx: Math.max(-intensity, Math.min(intensity, (0.5 - ny) * intensity * 2)),
      ry: Math.max(-intensity, Math.min(intensity, (nx - 0.5) * intensity * 2)),
      gx: Math.round(nx * 100),
      gy: Math.round(ny * 100),
      hovered: true,
    });
  };

  const handleLeave = () => {
    setState({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handleLeave}
      style={{
        transform: reducedMotion
          ? undefined
          : `perspective(920px) rotateX(${state.rx.toFixed(2)}deg) rotateY(${state.ry.toFixed(2)}deg) translateZ(${state.hovered ? 8 : 0}px)`,
        transition: state.hovered
          ? 'transform 90ms ease-out, box-shadow 220ms ease'
          : 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 240ms ease',
        transformStyle: 'preserve-3d',
        boxShadow: state.hovered ? 'var(--shadow-3d-lg)' : 'var(--shadow-3d-sm)',
      }}
      className={`relative ${className}`}
    >
      {children}
      {state.hovered && !reducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle at ${state.gx}% ${state.gy}%, rgba(255,255,255,0.16) 0%, transparent 62%)`,
          }}
        />
      )}
    </div>
  );
}

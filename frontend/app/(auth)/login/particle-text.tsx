"use client";

import * as React from "react";

export interface ParticleTextProps {
  text?: string;
  className?: string;
  delayMs?: number;
  restartMs?: number;
}

export function ParticleText({
  text = "Particle Text",
  className = "",
  delayMs = 50,
  restartMs = 2000,
}: ParticleTextProps): React.JSX.Element {
  const [chars, setChars] = React.useState(0);
  const [loop, setLoop] = React.useState(0);

  React.useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setChars(i);
      if (i >= text.length) {
        clearInterval(id);
        setTimeout(
          () => {
            setChars(0);
            setLoop((l) => l + 1);
          },
          restartMs
        );
      }
    }, delayMs);
    return () => clearInterval(id);
  }, [text, delayMs, restartMs, loop]);

  return (
    <span className={`select-none ${className}`}>
      {text.split("").map((c: string, i: number) => (
        <span
          key={`${loop}-${i}`}
          style={{
            display: "inline-block",
            opacity: i < chars ? 1 : 0,
            transform:
              i < chars ? "translateY(0) scale(1)" : "translateY(12px) scale(0.8)",
            transition: `opacity 0.25s ${i * 0.02}s, transform 0.3s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.02}s`,
          }}
        >
          {c === " " ? "\u00A0" : c}
        </span>
      ))}
      <span className="inline-block w-0.5 h-6 bg-gray-900 align-middle ml-1 animate-pulse" />
    </span>
  );
}
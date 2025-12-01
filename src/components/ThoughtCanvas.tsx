import { useState, useCallback, useRef } from "react";
import { ThoughtBubble, BubbleColor } from "./ThoughtBubble";

interface Thought {
  id: string;
  x: number;
  y: number;
  size: number;
  text: string;
  color: BubbleColor;
}

const COLORS: BubbleColor[] = ["rose", "mint", "sky"];

export function ThoughtCanvas() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const colorIndexRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  const getNextColor = useCallback((): BubbleColor => {
    const color = COLORS[colorIndexRef.current];
    colorIndexRef.current = (colorIndexRef.current + 1) % COLORS.length;
    return color;
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== canvasRef.current) return;

      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const text = prompt(
        "What thought / question is this?",
        "This is a thought or assumption / idea."
      );

      if (text !== null) {
        const newThought: Thought = {
          id: `thought-${Date.now()}`,
          x,
          y,
          size: 140,
          text: text || "Thought",
          color: getNextColor(),
        };
        setThoughts((prev) => [...prev, newThought]);
      }
    },
    [getNextColor]
  );

  const handleSizeChange = useCallback((id: string, newSize: number) => {
    setThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, size: newSize } : t))
    );
  }, []);

  const handleTextChange = useCallback((id: string, newText: string) => {
    setThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text: newText } : t))
    );
  }, []);

  // Create initial thought on mount
  useState(() => {
    setTimeout(() => {
      if (canvasRef.current && thoughts.length === 0) {
        const rect = canvasRef.current.getBoundingClientRect();
        setThoughts([
          {
            id: "initial-thought",
            x: rect.width * 0.35,
            y: rect.height * 0.55,
            size: 280,
            text: "This is a thought or assumption / idea. A question I ask.",
            color: "rose",
          },
        ]);
        colorIndexRef.current = 1; // Start next color at mint
      }
    }, 100);
  });

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-screen overflow-hidden canvas-grid bg-canvas-bg cursor-crosshair"
      onDoubleClick={handleDoubleClick}
      title="Double-click to add a thought. Click & hold a bubble to grow it."
    >
      {thoughts.map((thought) => (
        <ThoughtBubble
          key={thought.id}
          {...thought}
          onSizeChange={handleSizeChange}
          onTextChange={handleTextChange}
        />
      ))}
      
      {/* Instructions overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground text-sm bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
        Double-click to add a thought • Click & hold to grow
      </div>
    </div>
  );
}

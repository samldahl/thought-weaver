import { useState, useCallback, useRef, useEffect } from "react";
import { ThoughtBubble, BubbleColor } from "./ThoughtBubble";

interface Thought {
  id: string;
  x: number;
  y: number;
  size: number;
  text: string;
  color: BubbleColor;
  isNew?: boolean;
  readyToEdit?: boolean;
}

const COLORS: BubbleColor[] = ["rose", "mint", "sky"];
const MIN_SIZE = 60;
const INITIAL_SIZE = 40;

export function ThoughtCanvas() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const colorIndexRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const growingRef = useRef<{
    id: string;
    animationId: number;
    lastTime: number;
  } | null>(null);

  const getNextColor = useCallback((): BubbleColor => {
    const color = COLORS[colorIndexRef.current];
    colorIndexRef.current = (colorIndexRef.current + 1) % COLORS.length;
    return color;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== canvasRef.current || e.button !== 0) return;

      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newId = `thought-${Date.now()}`;
      const newThought: Thought = {
        id: newId,
        x,
        y,
        size: INITIAL_SIZE,
        text: "",
        color: getNextColor(),
        isNew: true,
        readyToEdit: false,
      };

      setThoughts((prev) => [...prev, newThought]);

      // Start growing animation
      const lastTime = performance.now();

      const grow = (time: number) => {
        if (!growingRef.current || growingRef.current.id !== newId) return;

        const dt = time - growingRef.current.lastTime;
        growingRef.current.lastTime = time;

        setThoughts((prev) =>
          prev.map((t) =>
            t.id === newId ? { ...t, size: t.size + dt * 0.15 } : t
          )
        );

        growingRef.current.animationId = requestAnimationFrame(grow);
      };

      growingRef.current = {
        id: newId,
        animationId: requestAnimationFrame(grow),
        lastTime,
      };
    },
    [getNextColor]
  );

  const handleMouseUp = useCallback(() => {
    if (growingRef.current) {
      cancelAnimationFrame(growingRef.current.animationId);
      const finishedId = growingRef.current.id;
      growingRef.current = null;

      // Ensure minimum size and trigger editing
      setThoughts((prev) =>
        prev.map((t) =>
          t.id === finishedId
            ? { ...t, size: Math.max(MIN_SIZE, t.size), readyToEdit: true }
            : t
        )
      );
    }
  }, []);

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

  const handleColorChange = useCallback((id: string, newColor: BubbleColor) => {
    setThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, color: newColor } : t))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setThoughts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleFinishNew = useCallback((id: string) => {
    setThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isNew: false } : t))
    );
  }, []);

  // Global mouseup listener
  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-screen overflow-hidden canvas-grid bg-canvas-bg cursor-crosshair"
      onMouseDown={handleMouseDown}
    >
      {thoughts.map((thought) => (
        <ThoughtBubble
          key={thought.id}
          {...thought}
          readyToEdit={thought.readyToEdit}
          onSizeChange={handleSizeChange}
          onTextChange={handleTextChange}
          onColorChange={handleColorChange}
          onDelete={handleDelete}
          onFinishNew={handleFinishNew}
        />
      ))}

      {/* Instructions overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground text-sm bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
        Click & hold to create • Release to type • Click bubble to edit
      </div>
    </div>
  );
}

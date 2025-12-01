import { useRef, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type BubbleColor = "rose" | "mint" | "sky";

interface ThoughtBubbleProps {
  id: string;
  x: number;
  y: number;
  size: number;
  text: string;
  color: BubbleColor;
  onSizeChange: (id: string, newSize: number) => void;
  onTextChange: (id: string, newText: string) => void;
}

export function ThoughtBubble({
  id,
  x,
  y,
  size,
  text,
  color,
  onSizeChange,
  onTextChange,
}: ThoughtBubbleProps) {
  const growingRef = useRef(false);
  const lastTimeRef = useRef(0);
  const animationRef = useRef<number>();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const colorClass = {
    rose: "thought-bubble-rose",
    mint: "thought-bubble-mint",
    sky: "thought-bubble-sky",
  }[color];

  const startGrow = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || isEditing) return;
      e.stopPropagation();
      growingRef.current = true;
      lastTimeRef.current = performance.now();

      const step = (time: number) => {
        if (!growingRef.current) return;

        const dt = time - lastTimeRef.current;
        lastTimeRef.current = time;

        const delta = dt * 0.18;
        const newSize = size + delta;
        onSizeChange(id, newSize);

        animationRef.current = requestAnimationFrame(step);
      };

      animationRef.current = requestAnimationFrame(step);
    },
    [id, size, onSizeChange, isEditing]
  );

  const stopGrow = useCallback(() => {
    growingRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editText.trim() !== text) {
      onTextChange(id, editText.trim() || "Thought");
    }
  }, [id, editText, text, onTextChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
      }
      if (e.key === "Escape") {
        setEditText(text);
        setIsEditing(false);
      }
    },
    [handleBlur, text]
  );

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    document.addEventListener("mouseup", stopGrow);
    return () => document.removeEventListener("mouseup", stopGrow);
  }, [stopGrow]);

  // Calculate font size based on bubble size
  const fontSize = Math.max(10, Math.min(16, size / 12));

  return (
    <div
      className={cn(
        "thought-bubble animate-bubble-pop",
        colorClass
      )}
      style={{
        width: size,
        height: size,
        left: x - size / 2,
        top: y - size / 2,
        fontSize: `${fontSize}px`,
      }}
      onMouseDown={startGrow}
      onMouseUp={stopGrow}
      onMouseLeave={stopGrow}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent text-center resize-none outline-none text-foreground"
          style={{ fontSize: `${fontSize}px` }}
        />
      ) : (
        <span className="text-foreground/80 pointer-events-none px-2">
          {text}
        </span>
      )}
    </div>
  );
}

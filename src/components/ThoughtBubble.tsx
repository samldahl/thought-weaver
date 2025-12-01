import { useRef, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Trash2, Minus, Plus } from "lucide-react";

export type BubbleColor = "rose" | "mint" | "sky";

interface ThoughtBubbleProps {
  id: string;
  x: number;
  y: number;
  size: number;
  text: string;
  color: BubbleColor;
  isNew?: boolean;
  onSizeChange: (id: string, newSize: number) => void;
  onTextChange: (id: string, newText: string) => void;
  onColorChange: (id: string, newColor: BubbleColor) => void;
  onDelete: (id: string) => void;
  onFinishNew: (id: string) => void;
}

const COLORS: { value: BubbleColor; label: string }[] = [
  { value: "rose", label: "Rose" },
  { value: "mint", label: "Mint" },
  { value: "sky", label: "Sky" },
];

export function ThoughtBubble({
  id,
  x,
  y,
  size,
  text,
  color,
  isNew,
  onSizeChange,
  onTextChange,
  onColorChange,
  onDelete,
  onFinishNew,
}: ThoughtBubbleProps) {
  const [isEditing, setIsEditing] = useState(isNew);
  const [editText, setEditText] = useState(text);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const colorClass = {
    rose: "thought-bubble-rose",
    mint: "thought-bubble-mint",
    sky: "thought-bubble-sky",
  }[color];

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isNew) {
      setPopoverOpen(true);
    }
  }, [isNew]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const finalText = editText.trim() || "Thought";
    onTextChange(id, finalText);
    if (isNew) {
      onFinishNew(id);
    }
  }, [id, editText, onTextChange, isNew, onFinishNew]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
      }
      if (e.key === "Escape") {
        setEditText(text);
        setIsEditing(false);
        if (isNew) {
          onFinishNew(id);
        }
      }
    },
    [handleBlur, text, isNew, id, onFinishNew]
  );

  const handleEditText = useCallback(() => {
    setPopoverOpen(false);
    setIsEditing(true);
  }, []);

  const handleSizeAdjust = useCallback((delta: number) => {
    const newSize = Math.max(80, size + delta);
    onSizeChange(id, newSize);
  }, [id, size, onSizeChange]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (!isNew) {
        inputRef.current.select();
      }
    }
  }, [isEditing, isNew]);

  // Calculate font size based on bubble size
  const fontSize = Math.max(10, Math.min(16, size / 12));

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "thought-bubble",
            colorClass,
            !isNew && "cursor-pointer"
          )}
          style={{
            width: size,
            height: size,
            left: x - size / 2,
            top: y - size / 2,
            fontSize: `${fontSize}px`,
          }}
          onClick={handleClick}
        >
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Enter your thought..."
              className="w-full h-full bg-transparent text-center resize-none outline-none text-foreground placeholder:text-foreground/40"
              style={{ fontSize: `${fontSize}px` }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-foreground/80 pointer-events-none px-2">
              {text}
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          {/* Size controls */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Size</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleSizeAdjust(-30)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex-1 text-center text-sm text-muted-foreground">
                {Math.round(size)}px
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleSizeAdjust(30)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    c.value === "rose" && "bg-bubble-rose/50",
                    c.value === "mint" && "bg-bubble-mint/50",
                    c.value === "sky" && "bg-bubble-sky/50",
                    color === c.value
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  )}
                  onClick={() => onColorChange(id, c.value)}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={handleEditText}
            >
              Edit Text
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDelete(id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { useRef, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Trash2, Minus, Plus } from "lucide-react";

interface ThoughtBubbleProps {
  id: string;
  x: number;
  y: number;
  size: number;
  text: string;
  color: string; // Now a hex color
  isNew?: boolean;
  readyToEdit?: boolean;
  zoom?: number;
  onSizeChange: (id: string, newSize: number) => void;
  onTextChange: (id: string, newText: string) => void;
  onDelete: (id: string) => void;
  onFinishNew: (id: string) => void;
}

export function ThoughtBubble({
  id,
  x,
  y,
  size,
  text,
  color,
  isNew,
  readyToEdit,
  zoom = 1,
  onSizeChange,
  onTextChange,
  onDelete,
  onFinishNew,
}: ThoughtBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
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
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!isEditing) {
          e.preventDefault();
          onDelete(id);
        }
      }
    },
    [handleBlur, text, isNew, id, onFinishNew, isEditing, onDelete]
  );

  const handleEditText = useCallback(() => {
    setPopoverOpen(false);
    setIsEditing(true);
  }, []);

  const handleSizeAdjust = useCallback((delta: number) => {
    const newSize = Math.max(80, size + delta);
    onSizeChange(id, newSize);
  }, [id, size, onSizeChange]);

  // Start editing when readyToEdit becomes true for new bubbles
  useEffect(() => {
    if (isNew && readyToEdit && !isEditing) {
      setIsEditing(true);
    }
  }, [isNew, readyToEdit, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (!isNew) {
        inputRef.current.select();
      }
    }
  }, [isEditing, isNew]);

  // Calculate font size based on bubble size, scaled inversely with zoom
  const baseFontSize = Math.max(10, Math.min(16, size / 12));
  const fontSize = baseFontSize / zoom;

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "thought-bubble",
            !isNew && "cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-primary/50"
          )}
          style={{
            width: size,
            height: size,
            left: x - size / 2,
            top: y - size / 2,
            fontSize: `${fontSize}px`,
            backgroundColor: `${color}40`,
            borderColor: `${color}60`,
          }}
          tabIndex={0}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
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
              onMouseDown={(e) => e.stopPropagation()}
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

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
  color: string;
  isNew?: boolean;
  readyToEdit?: boolean;
  zoom?: number;
  onSizeChange: (id: string, newSize: number) => void;
  onTextChange: (id: string, newText: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
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
  onPositionChange,
  onDelete,
  onFinishNew,
}: ThoughtBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; bubbleX: number; bubbleY: number } | null>(null);
  const hasDraggedRef = useRef(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isNew && !hasDraggedRef.current) {
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

  const handleSizeAdjust = useCallback((delta: number) => {
    const newSize = Math.max(80, size + delta);
    onSizeChange(id, newSize);
  }, [id, size, onSizeChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Allow Ctrl/Cmd + Delete to delete bubble even while editing
      if ((e.key === "Delete" || e.key === "Backspace") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onDelete(id);
        return;
      }
      
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
      // Size adjustment shortcuts
      if (!isEditing) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          handleSizeAdjust(30);
        }
        if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          handleSizeAdjust(-30);
        }
        // Edit mode shortcut
        if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          setIsEditing(true);
        }
      }
    },
    [handleBlur, text, isNew, id, onFinishNew, isEditing, onDelete, handleSizeAdjust]
  );

  const handleEditText = useCallback(() => {
    setPopoverOpen(false);
    setIsEditing(true);
  }, []);

  // Drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isNew || isEditing || e.button !== 0) return;
    
    e.stopPropagation();
    hasDraggedRef.current = false;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      bubbleX: x,
      bubbleY: y,
    };
  }, [isNew, isEditing, x, y]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      
      const dx = (e.clientX - dragStartRef.current.mouseX) / zoom;
      const dy = (e.clientY - dragStartRef.current.mouseY) / zoom;
      
      // Mark as dragged if moved more than 3 pixels
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDraggedRef.current = true;
      }
      
      onPositionChange(
        id,
        dragStartRef.current.bubbleX + dx,
        dragStartRef.current.bubbleY + dy
      );
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, id, zoom, onPositionChange]);

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
            !isNew && !isDragging && "cursor-grab",
            isDragging && "cursor-grabbing",
            "focus:outline-none focus:ring-2 focus:ring-primary/50",
            "transition-shadow duration-150",
            isDragging && "shadow-lg"
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
          onMouseDown={handleMouseDown}
          onClick={handleClick}
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
              className="w-full h-full bg-transparent text-center resize-none outline-none text-foreground placeholder:text-foreground/40 cursor-text"
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
              onClick={() => {
                setPopoverOpen(false);
                onDelete(id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

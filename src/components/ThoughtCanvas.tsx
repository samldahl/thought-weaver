import { useState, useCallback, useRef, useEffect } from "react";
import { ThoughtBubble, BubbleColor } from "./ThoughtBubble";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

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
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const INITIAL_ZOOM = 0.5;

export function ThoughtCanvas() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const colorIndexRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const creatingRef = useRef<{
    id: string;
    originX: number;
    originY: number;
  } | null>(null);

  const getNextColor = useCallback((): BubbleColor => {
    const color = COLORS[colorIndexRef.current];
    colorIndexRef.current = (colorIndexRef.current + 1) % COLORS.length;
    return color;
  }, []);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const x = (screenX - rect.left - pan.x) / zoom;
      const y = (screenY - rect.top - pan.y) / zoom;
      return { x, y };
    },
    [zoom, pan]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Mouse position relative to canvas element
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * delta));

      // Adjust pan to zoom toward mouse position
      const scale = newZoom / zoom;
      const newPanX = mouseX - (mouseX - pan.x) * scale;
      const newPanY = mouseY - (mouseY - pan.y) * scale;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    },
    [zoom, pan]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button for panning
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        return;
      }

      if (e.target !== canvasRef.current || e.button !== 0) return;

      const { x, y } = screenToCanvas(e.clientX, e.clientY);

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

      // Store origin for drag-to-size
      creatingRef.current = {
        id: newId,
        originX: e.clientX,
        originY: e.clientY,
      };
    },
    [getNextColor, screenToCanvas, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan({
          x: panStartRef.current.panX + dx,
          y: panStartRef.current.panY + dy,
        });
      }

      // Drag-to-size: calculate distance from origin (no size limit)
      if (creatingRef.current) {
        const dx = e.clientX - creatingRef.current.originX;
        const dy = e.clientY - creatingRef.current.originY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Scale by zoom so the visual size matches the drag distance
        const newSize = Math.max(INITIAL_SIZE, distance * 2 / zoom);

        setThoughts((prev) =>
          prev.map((t) =>
            t.id === creatingRef.current?.id ? { ...t, size: newSize } : t
          )
        );
      }
    },
    [isPanning, zoom]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    if (creatingRef.current) {
      const finishedId = creatingRef.current.id;
      creatingRef.current = null;

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

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z * 1.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z / 1.2));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(INITIAL_ZOOM);
    setPan({ x: 0, y: 0 });
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
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isPanning ? "grabbing" : "crosshair" }}
    >
      {/* Zoomable/pannable layer */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {thoughts.map((thought) => (
          <ThoughtBubble
            key={thought.id}
            {...thought}
            readyToEdit={thought.readyToEdit}
            zoom={zoom}
            onSizeChange={handleSizeChange}
            onTextChange={handleTextChange}
            onColorChange={handleColorChange}
            onDelete={handleDelete}
            onFinishNew={handleFinishNew}
          />
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleResetView} title="Reset view">
          <Maximize className="h-4 w-4" />
        </Button>
        <div className="text-xs text-muted-foreground text-center bg-background/80 rounded px-2 py-1">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Instructions overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground text-sm bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
        Click & drag to create • Double-click to edit • Delete key to remove • Scroll to zoom
      </div>
    </div>
  );
}

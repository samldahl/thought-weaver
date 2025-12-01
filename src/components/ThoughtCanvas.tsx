import { useState, useCallback, useRef, useEffect } from "react";
import { ThoughtBubble } from "./ThoughtBubble";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize, Trash2 } from "lucide-react";
import { DocumentPicker, Document } from "./DocumentPicker";

interface Thought {
  id: string;
  x: number;
  y: number;
  size: number;
  text: string;
  color: string;
  isNew?: boolean;
  readyToEdit?: boolean;
}

// 40 unique, visually distinct colors
const UNIQUE_COLORS: string[] = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
  "#F8B500", "#00CED1", "#FF69B4", "#32CD32", "#FFD700",
  "#FF7F50", "#6495ED", "#DC143C", "#00FA9A", "#FF1493",
  "#1E90FF", "#FF4500", "#2E8B57", "#9370DB", "#20B2AA",
  "#FF6347", "#4169E1", "#8B4513", "#00BFFF", "#228B22",
  "#DA70D6", "#CD853F", "#40E0D0", "#C71585", "#7B68EE",
  "#3CB371", "#DB7093", "#008B8B", "#B8860B", "#9932CC"
];

const MIN_SIZE = 60;
const INITIAL_SIZE = 40;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const INITIAL_ZOOM = 0.5;

const DOCUMENTS_KEY = "thought-canvas-documents";
const CURRENT_DOC_KEY = "thought-canvas-current-doc";

interface DocumentData {
  thoughts: Thought[];
  zoom: number;
  pan: { x: number; y: number };
  usedColors: string[];
}

function generateDocId() {
  return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getStorageKey(docId: string) {
  return `thought-canvas-doc-${docId}`;
}

export function ThoughtCanvas() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string>("");
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [usedColors, setUsedColors] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const transformLayerRef = useRef<HTMLDivElement>(null);
  const creatingRef = useRef<{
    id: string;
    originX: number;
    originY: number;
  } | null>(null);

  // Load documents list and current document on mount
  useEffect(() => {
    try {
      const savedDocs = localStorage.getItem(DOCUMENTS_KEY);
      const savedCurrentId = localStorage.getItem(CURRENT_DOC_KEY);
      
      let docs: Document[] = savedDocs ? JSON.parse(savedDocs) : [];
      let docId = savedCurrentId || "";
      
      // If no documents exist, create the first one
      if (docs.length === 0) {
        const newDoc: Document = {
          id: generateDocId(),
          name: "Untitled",
          createdAt: Date.now(),
        };
        docs = [newDoc];
        docId = newDoc.id;
        localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
        localStorage.setItem(CURRENT_DOC_KEY, docId);
      } else if (!docId || !docs.find(d => d.id === docId)) {
        docId = docs[0].id;
        localStorage.setItem(CURRENT_DOC_KEY, docId);
      }
      
      setDocuments(docs);
      setCurrentDocId(docId);
      
      // Load the current document's data
      const docData = localStorage.getItem(getStorageKey(docId));
      if (docData) {
        const data: DocumentData = JSON.parse(docData);
        setThoughts(data.thoughts || []);
        setZoom(data.zoom || INITIAL_ZOOM);
        setPan(data.pan || { x: 0, y: 0 });
        setUsedColors(new Set(data.usedColors || []));
      }
    } catch (e) {
      console.error("Failed to load saved data:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save current document data whenever state changes
  useEffect(() => {
    if (!isLoaded || !currentDocId) return;
    const data: DocumentData = {
      thoughts,
      zoom,
      pan,
      usedColors: Array.from(usedColors),
    };
    localStorage.setItem(getStorageKey(currentDocId), JSON.stringify(data));
  }, [thoughts, zoom, pan, usedColors, isLoaded, currentDocId]);

  // Save documents list when it changes
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
  }, [documents, isLoaded]);

  const handleNewDocument = useCallback(() => {
    const newDoc: Document = {
      id: generateDocId(),
      name: `Document ${documents.length + 1}`,
      createdAt: Date.now(),
    };
    setDocuments(prev => [...prev, newDoc]);
    setCurrentDocId(newDoc.id);
    localStorage.setItem(CURRENT_DOC_KEY, newDoc.id);
    
    // Reset canvas state for new document
    setThoughts([]);
    setZoom(INITIAL_ZOOM);
    setPan({ x: 0, y: 0 });
    setUsedColors(new Set());
  }, [documents.length]);

  const handleSelectDocument = useCallback((docId: string) => {
    if (docId === currentDocId) return;
    
    setCurrentDocId(docId);
    localStorage.setItem(CURRENT_DOC_KEY, docId);
    
    // Load the selected document's data
    try {
      const docData = localStorage.getItem(getStorageKey(docId));
      if (docData) {
        const data: DocumentData = JSON.parse(docData);
        setThoughts(data.thoughts || []);
        setZoom(data.zoom || INITIAL_ZOOM);
        setPan(data.pan || { x: 0, y: 0 });
        setUsedColors(new Set(data.usedColors || []));
      } else {
        setThoughts([]);
        setZoom(INITIAL_ZOOM);
        setPan({ x: 0, y: 0 });
        setUsedColors(new Set());
      }
    } catch (e) {
      console.error("Failed to load document:", e);
    }
  }, [currentDocId]);

  const handleDeleteDocument = useCallback((docId: string) => {
    if (documents.length <= 1) return;
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    
    // Remove document data from storage
    localStorage.removeItem(getStorageKey(docId));
    
    const newDocs = documents.filter(d => d.id !== docId);
    setDocuments(newDocs);
    
    // If deleting current document, switch to another
    if (docId === currentDocId) {
      const newCurrentId = newDocs[0].id;
      handleSelectDocument(newCurrentId);
    }
  }, [documents, currentDocId, handleSelectDocument]);

  const handleRenameDocument = useCallback((docId: string, newName: string) => {
    setDocuments(prev => prev.map(d => 
      d.id === docId ? { ...d, name: newName } : d
    ));
  }, []);

  const getNextColor = useCallback((): string => {
    // Find first unused color
    const availableColor = UNIQUE_COLORS.find(c => !usedColors.has(c));
    if (availableColor) {
      setUsedColors(prev => new Set([...prev, availableColor]));
      return availableColor;
    }
    // If all 40 used, generate a random one
    const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    setUsedColors(prev => new Set([...prev, randomColor]));
    return randomColor;
  }, [usedColors]);

  // When a thought is deleted, free its color
  const freeColor = useCallback((color: string) => {
    setUsedColors(prev => {
      const next = new Set(prev);
      next.delete(color);
      return next;
    });
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

  const [spaceHeld, setSpaceHeld] = useState(false);

  // Handle spacebar for pan mode (only when not typing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.code === "Space" && !e.repeat && !isTyping) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Pinch zoom (ctrlKey) or scroll wheel zoom
      if (e.ctrlKey || e.metaKey) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * delta));

        const scale = newZoom / zoom;
        const newPanX = mouseX - (mouseX - pan.x) * scale;
        const newPanY = mouseY - (mouseY - pan.y) * scale;

        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      } else {
        // Two-finger pan (no modifier)
        setPan((prev) => ({
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    },
    [zoom, pan]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button or spacebar held for panning
      if (e.button === 1 || (e.button === 0 && spaceHeld)) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
        return;
      }

      // Only create bubble if clicking on canvas or transform layer (not on existing bubbles)
      const isCanvasClick = e.target === canvasRef.current || e.target === transformLayerRef.current;
      if (!isCanvasClick || e.button !== 0) return;

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
    [getNextColor, screenToCanvas, pan, spaceHeld]
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

  const handlePositionChange = useCallback((id: string, newX: number, newY: number) => {
    setThoughts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, x: newX, y: newY } : t))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    const thought = thoughts.find(t => t.id === id);
    if (thought) {
      freeColor(thought.color);
    }
    setThoughts((prev) => prev.filter((t) => t.id !== id));
  }, [thoughts, freeColor]);

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

  const handleClearCanvas = useCallback(() => {
    if (window.confirm("Clear all thoughts? This cannot be undone.")) {
      setThoughts([]);
      setUsedColors(new Set());
      setZoom(INITIAL_ZOOM);
      setPan({ x: 0, y: 0 });
    }
  }, []);

  // Global mouseup listener
  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-screen overflow-hidden canvas-grid bg-canvas-bg"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isPanning ? "grabbing" : spaceHeld ? "grab" : "crosshair" }}
    >
      {/* Document picker */}
      <div className="absolute top-4 left-4 z-10">
        <DocumentPicker
          documents={documents}
          currentDocId={currentDocId}
          onNewDocument={handleNewDocument}
          onSelectDocument={handleSelectDocument}
          onDeleteDocument={handleDeleteDocument}
          onRenameDocument={handleRenameDocument}
        />
      </div>

      {/* Zoomable/pannable layer */}
      <div
        ref={transformLayerRef}
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
            onPositionChange={handlePositionChange}
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
        <Button variant="outline" size="icon" onClick={handleClearCanvas} title="Clear canvas" className="mt-2">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Instructions overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground text-sm bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
        Click & drag to create • Drag bubbles to move • Two-finger/Space+drag to pan • Pinch to zoom
      </div>
    </div>
  );
}

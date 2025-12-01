import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Plus, ChevronDown, Trash2 } from "lucide-react";

export interface Document {
  id: string;
  name: string;
  createdAt: number;
}

interface DocumentPickerProps {
  documents: Document[];
  currentDocId: string;
  onNewDocument: () => void;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onRenameDocument: (id: string, newName: string) => void;
}

export function DocumentPicker({
  documents,
  currentDocId,
  onNewDocument,
  onSelectDocument,
  onDeleteDocument,
}: DocumentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentDoc = documents.find(d => d.id === currentDocId);
  const currentName = currentDoc?.name || "Untitled";

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[160px] justify-between">
          <div className="flex items-center gap-2 truncate">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentName}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuItem onClick={onNewDocument} className="gap-2">
          <Plus className="h-4 w-4" />
          New Document
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {documents.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No documents yet
          </div>
        ) : (
          documents.map((doc) => (
            <DropdownMenuItem
              key={doc.id}
              className="flex items-center justify-between group"
              onClick={() => onSelectDocument(doc.id)}
            >
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 shrink-0" />
                <span className={`truncate ${doc.id === currentDocId ? "font-medium" : ""}`}>
                  {doc.name}
                </span>
              </div>
              {documents.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDocument(doc.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Plus, ChevronDown, Trash2, Pencil } from "lucide-react";

export interface Document {
  _id?: string;
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
  onRenameDocument,
}: DocumentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  
  const currentDoc = documents.find(d => (d._id || d.id) === currentDocId);
  const currentName = currentDoc?.name || "Untitled";

  const handleRenameClick = (docId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingDocId(docId);
    setNewName(currentName);
    setIsRenameDialogOpen(true);
    setIsOpen(false);
  };

  const handleRenameSubmit = () => {
    if (renamingDocId && newName.trim()) {
      onRenameDocument(renamingDocId, newName.trim());
      setIsRenameDialogOpen(false);
      setRenamingDocId(null);
      setNewName("");
    }
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="max-w-[200px] truncate">{currentName}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[250px]">
          <DropdownMenuItem onClick={onNewDocument} className="gap-2">
            <Plus className="h-4 w-4" />
            New Document
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {documents.length === 0 ? (
            <DropdownMenuItem disabled>No documents</DropdownMenuItem>
          ) : (
            documents.map((doc) => {
              const docId = doc._id || doc.id;
              return (
                <DropdownMenuItem
                  key={docId}
                  className="flex items-center justify-between group"
                  onClick={() => onSelectDocument(docId)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className={`truncate ${docId === currentDocId ? "font-medium" : ""}`}>
                      {doc.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => handleRenameClick(docId, doc.name, e)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {documents.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDocument(docId);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>
              Enter a new name for your document.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRenameSubmit();
              }
            }}
            placeholder="Document name"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!newName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

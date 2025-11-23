import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Copy, Trash2 } from "lucide-react";
import { ReactNode } from "react";

interface MessageContextMenuProps {
  children: ReactNode;
  onDelete: () => void;
  onCopy: () => void;
  canDelete: boolean;
}

export function MessageContextMenu({ 
  children, 
  onDelete, 
  onCopy,
  canDelete 
}: MessageContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onCopy}>
          <Copy className="mr-2 h-4 w-4" />
          Copy message
        </ContextMenuItem>
        {canDelete && (
          <ContextMenuItem 
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete message
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

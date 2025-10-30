import { MoreVertical, Copy, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Template {
  id: string;
  name: string;
  status: "draft" | "active" | "deprecated";
  version: number;
  usedIn: number;
  updatedAt: string;
}

const mockTemplates: Template[] = [
  {
    id: "invoice-1",
    name: "Standard Invoice",
    status: "active",
    version: 3,
    usedIn: 142,
    updatedAt: "2h ago",
  },
  {
    id: "invoice-2",
    name: "Minimal Black & White",
    status: "active",
    version: 1,
    usedIn: 28,
    updatedAt: "1d ago",
  },
  {
    id: "invoice-3",
    name: "Draft Template",
    status: "draft",
    version: 1,
    usedIn: 0,
    updatedAt: "3d ago",
  },
];

interface TemplateListProps {
  selectedTemplate: string | null;
  onSelectTemplate: (id: string) => void;
}

export function TemplateList({
  selectedTemplate,
  onSelectTemplate,
}: TemplateListProps) {
  return (
    <div className="divide-y divide-border">
      {mockTemplates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelectTemplate(template.id)}
          className={`
            w-full p-4 text-left transition-colors hover:bg-muted
            ${selectedTemplate === template.id ? "bg-accent" : ""}
          `}
        >
          <div className="flex items-start gap-3">
            {/* Thumbnail */}
            <div className="w-12 h-16 rounded border border-border bg-background flex items-center justify-center flex-shrink-0">
              <div className="text-xs text-muted-foreground font-mono">A4</div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-medium text-sm truncate pr-2">
                  {template.name}
                </h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mr-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Copy className="h-3 w-3 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-3 w-3 mr-2" />
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`
                  status-pill
                  ${template.status === "active" ? "status-new" : ""}
                  ${template.status === "draft" ? "status-paying" : ""}
                  ${template.status === "deprecated" ? "status-completed" : ""}
                `}
                >
                  {template.status}
                </span>
              </div>

              <p className="text-xs text-muted-foreground font-mono">
                v{template.version} · used in {template.usedIn} orders
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {template.updatedAt}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

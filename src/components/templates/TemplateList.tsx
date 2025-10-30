import { FileText } from "lucide-react";

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
    <div className="p-3 space-y-1">
      {mockTemplates.map((template) => (
        <button
          key={template.id}
          className={`w-full flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors ${
            selectedTemplate === template.id ? "bg-muted" : ""
          }`}
          onClick={() => onSelectTemplate(template.id)}
        >
          {/* Minimal A4 thumbnail */}
          <div className="w-7 h-10 rounded border border-border bg-background flex items-center justify-center flex-shrink-0">
            <FileText className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Template info */}
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-medium truncate mb-0.5">
              {template.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {template.status === "active" ? "Active" : "Draft"} · v{template.version}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

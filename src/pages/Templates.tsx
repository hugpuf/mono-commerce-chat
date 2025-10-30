import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Sparkles,
  Palette,
  Send,
  Search,
  ZoomIn,
  ZoomOut,
  Monitor,
  Smartphone,
  Plus,
} from "lucide-react";
import { TemplateList } from "@/components/templates/TemplateList";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { TemplateConfig } from "@/components/templates/TemplateConfig";
import { UploadTemplateDialog } from "@/components/templates/UploadTemplateDialog";
import { GenerateWithAIDialog } from "@/components/templates/GenerateWithAIDialog";
import { TestSendDialog } from "@/components/templates/TestSendDialog";

export default function Templates() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>("invoice-1");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [testSendDialogOpen, setTestSendDialogOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [pageSize, setPageSize] = useState<"a4" | "letter">("a4");

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background">
          <h1 className="text-lg font-semibold">Invoice Templates</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenerateDialogOpen(true)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate with AI
            </Button>
            <Button variant="outline" size="sm">
              <Palette className="h-4 w-4 mr-2" />
              Design in Canva
            </Button>
            <Button variant="outline" size="sm" disabled={!selectedTemplate}>
              Set Default
            </Button>
            <Button
              size="sm"
              disabled={!selectedTemplate}
              onClick={() => setTestSendDialogOpen(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              Test Send
            </Button>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Rail - Template List */}
          <div className="w-80 border-r border-border flex flex-col bg-background">
            <div className="p-4 border-b border-border">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search templates..." className="pl-9" />
              </div>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="all" className="text-xs">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="draft" className="text-xs">
                    Draft
                  </TabsTrigger>
                  <TabsTrigger value="active" className="text-xs">
                    Active
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <ScrollArea className="flex-1">
              <TemplateList
                selectedTemplate={selectedTemplate}
                onSelectTemplate={setSelectedTemplate}
              />
            </ScrollArea>
          </div>

          {/* Center Canvas - Preview */}
          <div className="flex-1 flex flex-col bg-muted/30">
            {/* Preview Controls */}
            <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-background">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-mono text-muted-foreground min-w-12 text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom(Math.min(200, zoom + 10))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-2" />
                <Button
                  variant={previewMode === "desktop" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewMode("desktop")}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === "mobile" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewMode("mobile")}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={pageSize === "a4" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPageSize("a4")}
                >
                  A4
                </Button>
                <Button
                  variant={pageSize === "letter" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPageSize("letter")}
                >
                  Letter
                </Button>
                <div className="w-px h-6 bg-border mx-2" />
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  Sample Data
                </Button>
              </div>
            </div>

            {/* Preview Area */}
            <ScrollArea className="flex-1 p-8">
              <TemplatePreview
                templateId={selectedTemplate}
                zoom={zoom}
                previewMode={previewMode}
                pageSize={pageSize}
              />
            </ScrollArea>
          </div>

          {/* Right Drawer - Config */}
          <div className="w-96 border-l border-border bg-background">
            <TemplateConfig templateId={selectedTemplate} />
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <UploadTemplateDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
      <GenerateWithAIDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
      />
      <TestSendDialog
        open={testSendDialogOpen}
        onOpenChange={setTestSendDialogOpen}
        templateId={selectedTemplate}
      />
    </AppShell>
  );
}

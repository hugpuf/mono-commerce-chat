import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DrilldownData {
  title: string;
  description: string;
  records: Array<Record<string, any>>;
  columns: Array<{ key: string; label: string }>;
}

interface AnalyticsDrilldownProps {
  isOpen: boolean;
  onClose: () => void;
  data: DrilldownData | null;
}

export function AnalyticsDrilldown({ isOpen, onClose, data }: AnalyticsDrilldownProps) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[600px] bg-background border-l shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">{data.title}</h3>
          <p className="text-sm text-muted-foreground">{data.description}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                {data.columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.records.map((record, idx) => (
                <TableRow key={idx}>
                  {data.columns.map((col) => (
                    <TableCell key={col.key}>
                      {record[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full">
          View Full Details
        </Button>
      </div>
    </div>
  );
}

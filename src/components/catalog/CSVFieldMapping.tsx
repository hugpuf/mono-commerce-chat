import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { ParsedCSVData, FieldMapping, TARGET_FIELDS } from "./types";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CSVFieldMappingProps {
  csvData: ParsedCSVData;
  onComplete: (mapping: FieldMapping) => void;
  onBack: () => void;
}

export function CSVFieldMapping({ csvData, onComplete, onBack }: CSVFieldMappingProps) {
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [autoMapped, setAutoMapped] = useState(false);

  // Auto-map fields based on name similarity
  useEffect(() => {
    if (autoMapped) return;
    
    const newMapping: FieldMapping = {};
    
    TARGET_FIELDS.forEach(targetField => {
      const possibleMatches = [
        targetField.key,
        targetField.label.toLowerCase(),
        targetField.key.replace(/_/g, ' '),
      ];
      
      const matchedColumn = csvData.headers.find(header => 
        possibleMatches.some(match => 
          header.toLowerCase().includes(match) || 
          match.includes(header.toLowerCase())
        )
      );
      
      if (matchedColumn) {
        newMapping[targetField.key] = {
          sourceColumn: matchedColumn,
          transform: "none",
        };
      }
    });
    
    setMapping(newMapping);
    setAutoMapped(true);
  }, [csvData.headers, autoMapped]);

  const handleMappingChange = (targetField: string, sourceColumn: string) => {
    if (sourceColumn === "none") {
      const newMapping = { ...mapping };
      delete newMapping[targetField];
      setMapping(newMapping);
    } else {
      setMapping({
        ...mapping,
        [targetField]: {
          sourceColumn,
          transform: "none",
        },
      });
    }
  };

  const requiredFieldsMapped = TARGET_FIELDS
    .filter(f => f.required)
    .every(f => mapping[f.key]);

  const getSampleValue = (targetField: string) => {
    const sourceColumn = mapping[targetField]?.sourceColumn;
    if (!sourceColumn) return null;
    
    const sampleRow = csvData.rows[0];
    return sampleRow?.[sourceColumn];
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Map your CSV columns to our product fields. Required fields are marked with a badge.
          We've automatically matched some fields based on column names.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {TARGET_FIELDS.map(targetField => {
          const sampleValue = getSampleValue(targetField.key);
          const isMapped = !!mapping[targetField.key];
          
          return (
            <div key={targetField.key} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-base">{targetField.label}</Label>
                  {targetField.required && (
                    <Badge variant="secondary" className="text-xs">Required</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">({targetField.type})</span>
                </div>
              </div>

              <Select
                value={mapping[targetField.key]?.sourceColumn || "none"}
                onValueChange={(value) => handleMappingChange(targetField.key, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a column from your CSV" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Don't import this field</SelectItem>
                  {csvData.headers.map(header => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isMapped && sampleValue && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  <span className="font-medium">Sample: </span>
                  {sampleValue}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={() => onComplete(mapping)}
          disabled={!requiredFieldsMapped}
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

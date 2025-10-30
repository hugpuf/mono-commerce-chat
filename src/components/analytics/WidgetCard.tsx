import { Download, HelpCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface WidgetCardProps {
  title: string;
  value?: string | number;
  description?: string;
  change?: number;
  sparklineData?: Array<{ value: number }>;
  children?: React.ReactNode;
  onDownload?: () => void;
  className?: string;
}

export function WidgetCard({
  title,
  value,
  description,
  change,
  sparklineData,
  children,
  onDownload,
  className,
}: WidgetCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {title}
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-xs">{description || title}</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
        {onDownload && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload}>
            <Download className="h-3 w-3" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {value !== undefined && (
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold">{value}</div>
              {change !== undefined && (
                <div className="flex items-center gap-1 text-xs mt-1">
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-foreground" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-foreground" />
                  )}
                  <span className={isPositive ? "text-foreground" : "text-foreground"}>
                    {isPositive ? "↑" : "↓"} {Math.abs(change)}%
                  </span>
                </div>
              )}
            </div>
            {sparklineData && sparklineData.length > 0 && (
              <div className="h-16 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

import { LucideIcon, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface IntegrationCircleProps {
  id: string;
  name: string;
  icon: LucideIcon;
  connected?: boolean;
  active?: boolean;
  disabled?: boolean;
}

export function IntegrationCircle({
  name,
  icon: Icon,
  connected = false,
  active = false,
  disabled = false,
}: IntegrationCircleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={`
            integration-circle relative
            ${connected ? "integration-circle-connected" : "integration-circle-inactive"}
            ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
            ${active ? "ring-2 ring-foreground ring-offset-2" : ""}
          `}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" />
          {connected && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-background rounded-full flex items-center justify-center">
              <Check className="h-2 w-2 text-foreground" />
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        <p>{name}</p>
        {connected && <p className="text-muted-foreground">Connected</p>}
        {disabled && <p className="text-muted-foreground">Coming soon</p>}
      </TooltipContent>
    </Tooltip>
  );
}

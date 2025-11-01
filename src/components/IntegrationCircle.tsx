import { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface IntegrationCircleProps {
  name: string;
  icon: LucideIcon | string;
  connected?: boolean;
  active?: boolean;
  disabled?: boolean;
  status?: "connected" | "syncing" | "error";
  onClick?: () => void;
}

export function IntegrationCircle({
  name,
  icon,
  connected = false,
  active = false,
  disabled = false,
  status,
  onClick,
}: IntegrationCircleProps) {
  const Icon = typeof icon !== 'string' ? icon : null;
  const getStatusColor = () => {
    if (!status) return "";
    switch (status) {
      case "connected":
        return "bg-foreground";
      case "syncing":
        return "bg-muted-foreground animate-pulse";
      case "error":
        return "bg-destructive";
      default:
        return "";
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`
            integration-circle relative
            ${connected ? "integration-circle-connected" : "integration-circle-inactive"}
            ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
            ${active ? "ring-2 ring-foreground ring-offset-2" : ""}
          `}
          disabled={disabled}
        >
          {typeof icon === 'string' ? (
            <img src={icon} alt={name} className="w-full h-full object-contain p-0" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
          {status && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${getStatusColor()}`}
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs flex flex-col gap-0.5">
        <p className="font-medium">{name}</p>
        {status && (
          <p className="text-muted-foreground capitalize text-[10px]">{status}</p>
        )}
        {disabled && <p className="text-muted-foreground text-[10px]">Coming soon</p>}
      </TooltipContent>
    </Tooltip>
  );
}

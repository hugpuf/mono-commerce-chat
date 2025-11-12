import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionStatusProps {
  status: "connected" | "connecting" | "disconnected";
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const statusConfig = {
    connected: {
      icon: Wifi,
      label: "Connected",
      variant: "default" as const,
      className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    },
    connecting: {
      icon: Wifi,
      label: "Connecting",
      variant: "secondary" as const,
      className: "animate-pulse",
    },
    disconnected: {
      icon: WifiOff,
      label: "Disconnected",
      variant: "destructive" as const,
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

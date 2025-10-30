import { Check, Circle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  status: "completed" | "pending";
  buttonLabel: string;
}

const checklistItems: ChecklistItem[] = [
  {
    id: "catalog",
    title: "Connect Catalog",
    description: "Shopify connected · 12,481 SKUs",
    status: "completed",
    buttonLabel: "Connected",
  },
  {
    id: "whatsapp",
    title: "Configure WhatsApp Business Profile",
    description: "Add logo, display name, About, email, website, address",
    status: "pending",
    buttonLabel: "Configure",
  },
  {
    id: "payments",
    title: "Connect Payments",
    description: "Enable Stripe checkout links",
    status: "completed",
    buttonLabel: "Connected",
  },
  {
    id: "skus",
    title: "Upload/Sync SKUs",
    description: "CSV import, manual entry, or connector sync",
    status: "pending",
    buttonLabel: "Upload",
  },
];

export function OnboardingChecklist() {
  const completedCount = checklistItems.filter((item) => item.status === "completed").length;
  const totalCount = checklistItems.length;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Get Started</h1>
        <p className="text-muted-foreground">
          Complete these steps to start selling on WhatsApp
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {checklistItems.map((item) => (
          <Card
            key={item.id}
            className={`
              transition-all duration-200
              ${item.status === "completed" ? "border-foreground" : "border-border hover:border-foreground/20"}
            `}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center mt-0.5
                    ${
                      item.status === "completed"
                        ? "bg-foreground text-background"
                        : "border-2 border-border"
                    }
                  `}
                >
                  {item.status === "completed" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Circle className="h-2 w-2" />
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription className="mt-1 text-xs">{item.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant={item.status === "completed" ? "outline" : "default"}
                size="sm"
                className="w-full"
                disabled={item.status === "completed"}
              >
                {item.buttonLabel}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

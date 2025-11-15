import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CatalogWelcomeBannerProps {
  productsCount: number;
  onDismiss: () => void;
}

export function CatalogWelcomeBanner({ productsCount, onDismiss }: CatalogWelcomeBannerProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  if (!isVisible) return null;

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="p-6">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-xl font-semibold mb-1">🎉 Your catalog is live!</h3>
              <p className="text-sm text-muted-foreground">
                Your {productsCount} product{productsCount !== 1 ? 's are' : ' is'} now ready to sell via WhatsApp. 
                The AI assistant can help customers browse, search, and purchase any of these items.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  navigate("/conversations");
                  handleDismiss();
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                View in Conversations
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

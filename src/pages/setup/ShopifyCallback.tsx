import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShopifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract OAuth parameters from URL
        const code = searchParams.get("code");
        const shop = searchParams.get("shop");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        // Check for OAuth errors
        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        // Validate required parameters
        if (!code || !shop || !state) {
          throw new Error("Missing required OAuth parameters");
        }

        // Verify state matches workspace ID (CSRF protection)
        if (state !== workspaceId) {
          throw new Error("Invalid state parameter. Please try again.");
        }

        setMessage("Exchanging authorization code...");

        // Call the shopify-oauth edge function
        const { data, error: functionError } = await supabase.functions.invoke(
          "shopify-oauth",
          {
            body: {
              code,
              shop,
              workspaceId,
            },
          }
        );

        if (functionError) {
          throw functionError;
        }

        if (!data?.success) {
          throw new Error(data?.error || "Failed to connect Shopify store");
        }

        setStatus("success");
        setMessage("Shopify store connected successfully! Your products are being imported in the background.");

        toast({
          title: "Store connected",
          description: "Your Shopify products are now being imported.",
        });

        // Redirect to catalog page after 2 seconds
        setTimeout(() => {
          navigate("/setup/catalog");
        }, 2000);

      } catch (err) {
        console.error("Shopify OAuth error:", err);
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to connect Shopify store");

        toast({
          title: "Connection failed",
          description: err instanceof Error ? err.message : "Failed to connect Shopify store",
          variant: "destructive",
        });
      }
    };

    handleCallback();
  }, [searchParams, workspaceId, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === "success" && <CheckCircle2 className="h-5 w-5 text-success" />}
            {status === "error" && <XCircle className="h-5 w-5 text-destructive" />}
            {status === "loading" && "Connecting to Shopify..."}
            {status === "success" && "Connection Successful"}
            {status === "error" && "Connection Failed"}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "error" && (
            <div className="space-y-4">
              <Button
                onClick={() => navigate("/setup/catalog")}
                className="w-full"
              >
                Back to Catalog Setup
              </Button>
            </div>
          )}
          {status === "loading" && (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

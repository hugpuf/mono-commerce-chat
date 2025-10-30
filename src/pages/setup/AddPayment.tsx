import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Wallet, DollarSign, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PaymentProvider {
  id: string;
  name: string;
  icon: typeof CreditCard;
  description: string;
}

const paymentProviders: PaymentProvider[] = [
  {
    id: "stripe",
    name: "Stripe",
    icon: CreditCard,
    description: "Online payment processing",
  },
  {
    id: "adyen",
    name: "Adyen",
    icon: CreditCard,
    description: "End-to-end payment platform",
  },
  {
    id: "paypal",
    name: "PayPal",
    icon: Wallet,
    description: "Digital wallet & payments",
  },
  {
    id: "square",
    name: "Square",
    icon: CreditCard,
    description: "Payment processing & POS",
  },
  {
    id: "braintree",
    name: "Braintree",
    icon: CreditCard,
    description: "PayPal-owned payment processor",
  },
  {
    id: "checkout",
    name: "Checkout.com",
    icon: CreditCard,
    description: "Global payment gateway",
  },
  {
    id: "razorpay",
    name: "Razorpay",
    icon: DollarSign,
    description: "Payments for India",
  },
];

export default function AddPayment() {
  const navigate = useNavigate();

  const handleConnect = (providerId: string) => {
    console.log("Connecting to:", providerId);
  };

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Add Payment Provider</h1>
          <p className="text-muted-foreground">
            Connect a payment processor to accept transactions
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {paymentProviders.map((provider) => {
            const Icon = provider.icon;
            return (
              <Card
                key={provider.id}
                className="border-border hover:border-foreground/20 transition-all duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {provider.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleConnect(provider.id)}
                  >
                    Connect
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

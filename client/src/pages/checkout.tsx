import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, ChevronLeft } from "lucide-react";
import Layout from "@/components/Layout";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ amount }: { amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [_, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin, // Stripe will redirect here after payment
      },
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Thank you for your purchase!",
      });
      setLocation("/");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-6 bg-secondary rounded-lg">
        <PaymentElement />
      </div>
      
      <Button 
        type="submit" 
        className="w-full py-6" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" /> Pay ${amount.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const [selectedAmount, setSelectedAmount] = useState(10); // Default $10
  const [isLoading, setIsLoading] = useState(false);
  
  // Credit packages
  const creditPackages = [
    { amount: 5, credits: 5000, label: "$5" },
    { amount: 10, credits: 10000, label: "$10" },
    { amount: 20, credits: 20000, label: "$20" },
    { amount: 50, credits: 50000, label: "$50" },
    { amount: 100, credits: 100000, label: "$100" },
  ];

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
      return;
    }
  }, [user, setLocation]);

  const createPaymentIntent = async (amount: number) => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/create-payment-intent", { amount });
      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Error creating payment intent:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && selectedAmount > 0) {
      createPaymentIntent(selectedAmount);
    }
  }, [selectedAmount, user]);

  const handleGoBack = () => {
    setLocation("/");
  };

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-5 max-w-3xl">
        <Button 
          variant="outline" 
          className="mb-6" 
          onClick={handleGoBack}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to homepage
        </Button>
        
        <div className="p-6 bg-card rounded-lg shadow-lg mb-8">
          <h1 className="text-2xl font-bold mb-6">Purchase Credits</h1>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {creditPackages.map((pkg) => (
              <Button
                key={pkg.amount}
                variant={selectedAmount === pkg.amount ? "default" : "outline"}
                className="relative h-20 flex flex-col items-center justify-center"
                onClick={() => setSelectedAmount(pkg.amount)}
              >
                <span className="text-lg font-bold">{pkg.label}</span>
                <span className="text-xs">{pkg.credits.toLocaleString()} credits</span>
                {selectedAmount === pkg.amount && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                )}
              </Button>
            ))}
          </div>
          
          <div className="bg-secondary/50 p-4 rounded-lg mb-6">
            <div className="flex justify-between mb-2">
              <span>Amount:</span>
              <span>${selectedAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Credits to receive:</span>
              <span>{(selectedAmount * 1000).toLocaleString()}</span>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm amount={selectedAmount} />
            </Elements>
          ) : (
            <div className="flex justify-center items-center py-10">
              <p>Something went wrong. Please try again.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
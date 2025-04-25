import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditPackage, PaymentMethod } from "@/types";
import { X } from "lucide-react";
import { cn, calculatePrice } from "@/lib/utils";

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (amount: number) => void;
}

export default function CreditPurchaseModal({
  isOpen,
  onClose,
  onPurchase,
}: CreditPurchaseModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(0);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<string>("visa");

  const creditPackages: CreditPackage[] = [
    { id: 0, amount: 1000, price: 1.00 },
    { id: 1, amount: 5000, price: 4.50, discount: 10 },
    { id: 2, amount: 10000, price: 9.00, discount: 10 },
    { id: 3, amount: 25000, price: 20.00, discount: 20 },
  ];

  const paymentMethods: PaymentMethod[] = [
    { id: "visa", name: "Visa", icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>' },
    { id: "mastercard", name: "Mastercard", icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>' },
    { id: "paypal", name: "PayPal", icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 12V6h7c1.7 0 3 1.3 3 3s-1.3 3-3 3H7z"/><path d="M4 18h7c1.7 0 3-1.3 3-3s-1.3-3-3-3H4v6z"/><line x1="16" x2="19" y1="12" y2="12"/></svg>' },
    { id: "bitcoin", name: "Bitcoin", icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97"/></svg>' },
  ];

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setCustomAmount(value);
      if (value) {
        setSelectedPackage(null);
      }
    }
  };

  const handlePurchase = () => {
    let amount = 0;
    
    if (selectedPackage !== null) {
      amount = creditPackages[selectedPackage].amount;
    } else if (customAmount) {
      amount = parseInt(customAmount);
    }
    
    if (amount >= 1000) {
      onPurchase(amount);
      onClose();
    }
  };

  // Calculate price based on custom amount
  const customPrice = customAmount 
    ? calculatePrice(parseInt(customAmount) || 0) 
    : "$0.00";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">Purchase Credits</DialogTitle>
          <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-primary">
            <X size={18} />
          </DialogClose>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-muted-foreground mb-4">Select a credit package or enter a custom amount:</p>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            {creditPackages.map((pkg, index) => (
              <div
                key={pkg.id}
                className={cn(
                  "package-card",
                  selectedPackage === index && "selected"
                )}
                onClick={() => {
                  setSelectedPackage(index);
                  setCustomAmount("");
                }}
              >
                <div className="font-bold text-lg">{pkg.amount.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">${pkg.price.toFixed(2)}</div>
                {pkg.discount && (
                  <div className="text-xs text-primary mt-1">Save {pkg.discount}%</div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mb-4">
            <label className="block text-muted-foreground mb-2">Custom Amount</label>
            <div className="flex items-center">
              <Input
                type="text"
                placeholder="Enter credit amount"
                className="flex-1 p-3 bg-muted text-foreground rounded-l-lg"
                value={customAmount}
                onChange={handleCustomAmountChange}
                min="1000"
                step="100"
              />
              <div className="bg-muted p-3 rounded-r-lg text-muted-foreground border border-l-0 border-input">
                {customPrice}
              </div>
            </div>
            <p className="text-muted-foreground text-xs mt-1">* Minimum purchase: 1,000 credits</p>
          </div>
          
          <div className="border-t border-gray-700 pt-4 mt-4">
            <h4 className="font-bold mb-2">Payment Method</h4>
            <div className="flex space-x-3 mb-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={cn(
                    "payment-method cursor-pointer",
                    selectedPayment === method.id && "selected"
                  )}
                  onClick={() => setSelectedPayment(method.id)}
                >
                  <span dangerouslySetInnerHTML={{ __html: method.icon }} />
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90"
            onClick={handlePurchase}
            disabled={selectedPackage === null && (!customAmount || parseInt(customAmount) < 1000)}
          >
            Purchase Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

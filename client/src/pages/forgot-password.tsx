import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/SEO";
import Layout from "@/components/Layout";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/forgot-password", data);
      const result = await response.json();
      
      if (response.ok) {
        setEmailSent(true);
      } else {
        toast({
          title: "Error",
          description: result.error || "An error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to the server. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout simpleHeader>
      <SEO
        title="Forgot Password | DeepTube: Ethical AI Media Hub"
        description="Reset your password for DeepTube.co - the ethical AI media platform. Recover your account to continue sharing and accessing innovative and responsible AI-generated videos."
        canonicalUrl="https://deeptube.co/forgot-password"
        ogType="website"
        keywords="password reset, account recovery, forgot password, DeepTube, AI media"
      />
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md mx-auto space-y-6 bg-card p-8 rounded-lg shadow-lg border border-border">
          <div className="text-center mb-8">
            <Link href="/">
              <h1 className="text-4xl font-bold text-primary mb-2 cursor-pointer">
                DeepTube<span className="text-sm">.co</span>
              </h1>
            </Link>
            <p className="text-muted-foreground">
              {emailSent ? "Check your email" : "Reset your password"}
            </p>
          </div>

          {emailSent ? (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-primary/10 rounded-md mb-4">
                <p className="text-foreground">
                  If an account exists with the email you provided, we've sent
                  password reset instructions to that address.
                </p>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Please check your email inbox and follow the instructions to reset
                your password. The link will expire in 1 hour.
              </p>
              <Button
                variant="outline"
                className="w-full flex items-center justify-center"
                onClick={() => navigate("/auth")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email address"
                          {...field}
                          autoComplete="email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Send Reset Link
                </Button>

                <div className="text-center mt-4">
                  <Link
                    href="/auth"
                    className="text-sm text-primary hover:underline"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </Layout>
  );
}

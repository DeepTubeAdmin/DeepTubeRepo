import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Check } from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/SEO";

const resetPasswordSchema = z
  .object({
    token: z.string(),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

enum ResetPasswordState {
  LOADING,
  INVALID_TOKEN,
  READY,
  SUCCESS,
  ERROR,
}

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<ResetPasswordState>(ResetPasswordState.LOADING);
  const [token, setToken] = useState("");

  // Extract token from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get("token");

    if (!tokenParam) {
      setState(ResetPasswordState.INVALID_TOKEN);
      return;
    }

    setToken(tokenParam);

    // Verify token is valid
    const verifyToken = async () => {
      try {
        const response = await apiRequest(
          "GET",
          `/api/verify-reset-token/${tokenParam}`
        );

        if (response.ok) {
          setState(ResetPasswordState.READY);
        } else {
          setState(ResetPasswordState.INVALID_TOKEN);
        }
      } catch (error) {
        setState(ResetPasswordState.ERROR);
      }
    };

    verifyToken();
  }, []);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update form values when token changes
  useEffect(() => {
    form.setValue("token", token);
  }, [token, form]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/reset-password", {
        token: data.token,
        newPassword: data.newPassword,
      });
      const result = await response.json();

      if (response.ok) {
        setState(ResetPasswordState.SUCCESS);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to reset password. Please try again.",
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

  const renderContent = () => {
    switch (state) {
      case ResetPasswordState.LOADING:
        return (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        );

      case ResetPasswordState.INVALID_TOKEN:
        return (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-destructive/10 rounded-md">
              <p className="text-destructive font-medium">Invalid or expired token</p>
              <p className="text-sm text-muted-foreground mt-2">
                The password reset link is invalid or has expired. Please request a
                new password reset link.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => navigate("/forgot-password")}
            >
              Request New Reset Link
            </Button>
          </div>
        );

      case ResetPasswordState.SUCCESS:
        return (
          <div className="space-y-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/20 p-3 rounded-full">
                <Check className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h2 className="text-xl font-bold">Password Reset Successful</h2>
            <p className="text-muted-foreground mb-4">
              Your password has been successfully reset. You can now log in with your
              new password.
            </p>
            <Button
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              Go to Sign In
            </Button>
          </div>
        );

      case ResetPasswordState.ERROR:
        return (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-destructive/10 rounded-md">
              <p className="text-destructive font-medium">Server Error</p>
              <p className="text-sm text-muted-foreground mt-2">
                There was a problem connecting to the server. Please try again later.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              Back to Sign In
            </Button>
          </div>
        );

      case ResetPasswordState.READY:
      default:
        return (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        {...field}
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormDescription>
                      Password must be at least 6 characters long
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        {...field}
                        autoComplete="new-password"
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
                Reset Password
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
        );
    }
  };

  return (
    <Layout simpleHeader showFooter>
      <SEO
        title="Reset Password | DeepTube: Ethical AI Media Hub"
        description="Reset your password for DeepTube.co - the ethical AI media platform. Create a new password to secure your account."
        canonicalUrl="https://deeptube.co/reset-password"
        ogType="website"
        keywords="password reset, create new password, account security, DeepTube, AI media"
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
              Reset your password
            </p>
          </div>

          {renderContent()}
        </div>
      </div>
    </Layout>
  );
}

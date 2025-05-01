import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import SEO from "@/components/SEO";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Video, CreditCard, Search, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { FaFacebook, FaGoogle, FaApple } from "react-icons/fa";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Calculate date 18 years ago to enforce minimum age
const eighteenYearsAgo = new Date();
eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"), // Email is now required
  dateOfBirth: z.date()
    .refine(date => date <= eighteenYearsAgo, {
      message: "You must be at least 18 years old to register"
    }),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  termsAccepted: z.boolean().refine(value => value === true, {
    message: "You must accept the Terms of Service to register"
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [_, setLocation] = useLocation();
  const { user, loginMutation, registerMutation, isLoading } = useAuth();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      dateOfBirth: new Date(2000, 0, 1), // Default date for better UX
      password: "",
      confirmPassword: "",
      termsAccepted: false,
    },
  });

  // Use the useEffect hook for navigation after render
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);
  
  // If user is logged in, we'll render nothing but useEffect will handle redirect
  if (user) {
    return null;
  }

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, ...rest } = data;
    
    // Convert date to ISO string for server-side processing
    const registerData = {
      ...rest,
      dateOfBirth: rest.dateOfBirth.toISOString(),
    };
    
    registerMutation.mutate(registerData);
  };
  
  const handleSocialLogin = (provider: string) => {
    // Show a toast notification
    toast({
      title: "Social Login Not Implemented",
      description: `Login with ${provider} is not available in this demo version.`,
      variant: "default"
    });
    
    // Log the attempt
    console.log(`Initiating ${provider} login flow`);
  };

  return (
    <Layout simpleHeader showFooter>
      <SEO 
        title="Sign In or Register | DeepTube: Ethical AI Media Hub"
        description="Join DeepTube.co - the ethical AI media platform where creators share innovative and responsible AI-generated videos. Sign in or create an account to start uploading and sharing your content."
        canonicalUrl="https://deeptube.co/auth"
        ogType="website"
        keywords="AI media hosting, login, register, create account, DeepTube, AI-powered video, Trusted video content, Creator media platform, AI content sharing"
      />
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Auth Form */}
      <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">DeepTube<span className="text-sm">.co</span></h1>
            <p className="text-muted-foreground">
              The premier media sharing platform for AI-generated content
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login" className="space-y-4 mt-4">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      {/* Add remember me checkbox here if needed */}
                    </div>
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Login
                  </Button>
                </form>
              </Form>
              
              <div className="relative flex items-center pt-4">
                <div className="flex-grow border-t border-muted"></div>
                <span className="flex-shrink mx-4 text-muted-foreground text-sm">or continue with</span>
                <div className="flex-grow border-t border-muted"></div>
              </div>
              
              <div className="flex flex-col space-y-3 pt-4">
                <Button 
                  onClick={() => handleSocialLogin("facebook")}
                  className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
                >
                  <FaFacebook className="mr-2 h-4 w-4" />
                  Continue with Facebook
                </Button>
                
                <Button 
                  onClick={() => handleSocialLogin("google")}
                  className="bg-white border border-gray-300 hover:bg-gray-100 text-black"
                >
                  <FaGoogle className="mr-2 h-4 w-4 text-[#4285F4]" />
                  Continue with Google
                </Button>
                
                <Button 
                  onClick={() => handleSocialLogin("apple")}
                  className="bg-black hover:bg-black/90 text-white"
                >
                  <FaApple className="mr-2 h-4 w-4" />
                  Continue with Apple
                </Button>
              </div>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register" className="space-y-4 mt-4">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Birth <span className="text-red-500">*</span></FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={`w-full pl-3 text-left font-normal ${!field.value ? "text-muted-foreground" : ""}`}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date > eighteenYearsAgo}
                              initialFocus
                              captionLayout="dropdown"
                              fromYear={1940}
                              toYear={new Date().getFullYear() - 18}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">
                          You must be at least 18 years old to use the platform
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Create a password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2 bg-muted/40 rounded-md">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            I accept the <Link href="/terms-of-service" className="text-primary hover:underline" target="_blank">Terms of Service</Link>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Create Account
                  </Button>
                </form>
              </Form>
              
              <div className="relative flex items-center pt-4">
                <div className="flex-grow border-t border-muted"></div>
                <span className="flex-shrink mx-4 text-muted-foreground text-sm">or register with</span>
                <div className="flex-grow border-t border-muted"></div>
              </div>
              
              <div className="flex flex-col space-y-3 pt-4">
                <Button 
                  onClick={() => handleSocialLogin("facebook")}
                  className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
                >
                  <FaFacebook className="mr-2 h-4 w-4" />
                  Continue with Facebook
                </Button>
                
                <Button 
                  onClick={() => handleSocialLogin("google")}
                  className="bg-white border border-gray-300 hover:bg-gray-100 text-black"
                >
                  <FaGoogle className="mr-2 h-4 w-4 text-[#4285F4]" />
                  Continue with Google
                </Button>
                
                <Button 
                  onClick={() => handleSocialLogin("apple")}
                  className="bg-black hover:bg-black/90 text-white"
                >
                  <FaApple className="mr-2 h-4 w-4" />
                  Continue with Apple
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Hero Section */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-primary/90 to-primary-foreground/90 p-8 flex flex-col justify-center text-white">
        <div className="max-w-lg mx-auto space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Welcome to DeepTube.co
          </h2>
          <p className="text-lg mb-6">
            Discover and share high-quality AI-generated media from creators around the world. 
            Upload your own AI-generated content and join our community.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Video className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Premium Quality</h3>
                <p className="text-white/80">HD and 4K AI-generated videos</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-lg">AI Showcase</h3>
                <p className="text-white/80">Share your AI generation skills</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Diverse Categories</h3>
                <p className="text-white/80">Find exactly what you're looking for</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Loader2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Regular Updates</h3>
                <p className="text-white/80">New content added daily</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Layout>
  );
}
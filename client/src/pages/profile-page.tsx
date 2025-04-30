import { useState } from "react";
import Layout from "@/components/Layout";
import MiniFooter from "@/components/MiniFooter";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, isLoading, logoutMutation } = useAuth();
  const { toast } = useToast();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form states
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    
    try {
      const response = await apiRequest("PATCH", "/api/user", { 
        username, 
        email 
      });
      
      const updatedUser = await response.json();
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      
      // Force refresh to update the user state
      window.location.reload();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Your new password and confirmation don't match.",
        variant: "destructive",
      });
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      await apiRequest("POST", "/api/user/change-password", { 
        currentPassword, 
        newPassword 
      });
      
      toast({
        title: "Password Changed",
        description: "Your password has been successfully changed.",
      });
      
      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        title: "Password Change Failed",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== user.username) {
      toast({
        title: "Confirmation Failed",
        description: "Please type your username exactly to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDeleting(true);
    
    try {
      await apiRequest("DELETE", "/api/user");
      
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      
      // Logout the user
      logoutMutation.mutate();
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <Layout>
      <div className="container max-w-4xl py-8">
        <h1 className="text-4xl font-bold mb-6 text-white">My Profile</h1>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="bg-[#272727] p-1 rounded-lg mb-6">
            <TabsTrigger 
              value="profile" 
              className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:font-bold rounded"
            >
              <i className="fas fa-user mr-2"></i> Profile
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:font-bold rounded"
            >
              <i className="fas fa-lock mr-2"></i> Security
            </TabsTrigger>
            <TabsTrigger 
              value="danger" 
              className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:font-bold rounded"
            >
              <i className="fas fa-exclamation-triangle mr-2"></i> Danger Zone
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-0">
            <Card className="bg-[#1a1a1a] border-gray-800 text-white">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription className="text-gray-400">
                  Update your account information
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdateProfile}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-[#111] border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-[#111] border-gray-700"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    disabled={isUpdating}
                    className="bg-primary text-black hover:bg-primary/90 font-bold"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="security" className="mt-0">
            <Card className="bg-[#1a1a1a] border-gray-800 text-white">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription className="text-gray-400">
                  Update your password to improve security
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleChangePassword}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input 
                      id="current-password" 
                      type="password" 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="bg-[#111] border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input 
                      id="new-password" 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-[#111] border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-[#111] border-gray-700"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    disabled={isChangingPassword}
                    className="bg-primary text-black hover:bg-primary/90 font-bold"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing Password...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="danger" className="mt-0">
            <Card className="bg-[#1a1a1a] border-red-900/30 border-2 text-white">
              <CardHeader>
                <CardTitle className="text-red-500">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Permanently delete your account and all your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-red-950/20 rounded-lg border border-red-900/30">
                  <h3 className="text-lg font-semibold text-red-400 mb-2">Delete your account</h3>
                  <p className="text-gray-400 mb-4">
                    Once you delete your account, there is no going back. All of your data will be permanently deleted.
                  </p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#1a1a1a] border-gray-800 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-2 my-4">
                        <Label htmlFor="delete-confirmation">
                          Type your username <span className="font-mono text-primary">{user.username}</span> to confirm:
                        </Label>
                        <Input 
                          id="delete-confirmation" 
                          value={deleteConfirmation} 
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          className="bg-[#111] border-gray-700"
                          placeholder={user.username}
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteAccount();
                          }}
                          className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Delete Account"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
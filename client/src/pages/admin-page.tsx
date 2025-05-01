import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Video, User } from '@shared/schema';

// Type augmentation for admin purposes
type AdminUser = User & { banned: boolean };

// Define content types for admin page
type PendingContent = Video;

// Extended type for reported content
type ReportedContent = Video & { 
  reportReason: string;
  reportedAt: string;
  reportedBy: string;
};
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportedContent, setReportedContent] = useState<ReportedContent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    // Only admin can access this page (user with ID 1 or 2 as defined in server/routes.ts)
    console.log("AdminPage: Current user:", user);
    
    if (!user) {
      console.log("AdminPage: No user logged in, redirecting to home");
      setLocation('/');
      return;
    }
    
    if (user.id !== 1 && user.id !== 2) {
      console.log("AdminPage: User is not an admin (ID not 1 or 2), redirecting to home");
      setLocation('/');
      return;
    }
    
    console.log("AdminPage: User is an admin, allowing access");

    const fetchData = async () => {
      try {
        // Fetch all users first
        const usersRes = await apiRequest('GET', '/api/admin/users');
        const usersData = await usersRes.json();
        setUsers(usersData);
        
        // Then try to get content for demo purposes
        try {
          const contentRes = await apiRequest('GET', '/api/content/featured');
          if (contentRes.ok) {
            const contentData = await contentRes.json();
            
            // Create some "reported" content for demonstration purposes
            if (contentData && Array.isArray(contentData) && contentData.length > 0) {
              const demoReported = contentData.slice(0, 3).map((video: Video): ReportedContent => ({
                ...video,
                reportReason: 'Content violates community guidelines',
                reportedAt: new Date().toISOString(),
                reportedBy: 'user123'
              }));
              
              setReportedContent(demoReported);
            } else {
              // If no content, use empty array
              setReportedContent([]);
            }
          }
        } catch (contentError) {
          console.warn('Could not load demo content for admin page:', contentError);
          // Continue with empty reported content
          setReportedContent([]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load admin data',
          variant: 'destructive'
        });
        setLoading(false);
      }
    };

    fetchData();
  }, [user, setLocation, toast]);

  const handleDeleteContent = async (videoId: number) => {
    try {
      await apiRequest('DELETE', `/api/admin/content/${videoId}`);
      setReportedContent(prev => prev.filter(item => item.id !== videoId));
      toast({
        title: 'Success',
        description: 'Content deleted successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete content',
        variant: 'destructive'
      });
    }
  };

  const handleBanUser = async (userId: number, currentBanStatus: boolean) => {
    try {
      await apiRequest('PUT', `/api/admin/users/${userId}`, {
        banned: !currentBanStatus
      });
      
      // Update the local state to reflect the change
      setUsers(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, banned: !currentBanStatus } : user
        )
      );
      
      toast({
        title: 'Success',
        description: `User ${currentBanStatus ? 'unbanned' : 'banned'} successfully`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error updating user ban status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <SEO 
          title="Admin Dashboard | DeepTube: Ethical AI Media Hub"
          description="DeepTube.co administrator dashboard for content moderation, user management, and platform analytics. Restricted access area for managing AI-generated media."
          canonicalUrl="https://deeptube.co/admin"
          ogType="website"
          keywords="Admin dashboard, content moderation, user management, DeepTube admin, AI content management"
        />
        <div className="flex justify-center items-center h-[calc(100vh-160px)]">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO 
        title="Admin Dashboard | DeepTube: Ethical AI Media Hub"
        description="DeepTube.co administrator dashboard for content moderation, user management, and platform analytics. Restricted access area for managing AI-generated media."
        canonicalUrl="https://deeptube.co/admin"
        ogType="website"
        keywords="Admin dashboard, content moderation, user management, DeepTube admin, AI content management"
      />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 text-white">Admin Dashboard</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="w-full bg-gray-800">
            <TabsTrigger value="content" className="flex-1">Reported Content</TabsTrigger>
            <TabsTrigger value="users" className="flex-1">User Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="py-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Reported Content</CardTitle>
                <CardDescription className="text-gray-400">
                  Review and moderate content that has been reported by users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {reportedContent.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No reported content to review</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800 hover:bg-gray-800">
                          <TableHead className="text-gray-300">Title</TableHead>
                          <TableHead className="text-gray-300">Report Reason</TableHead>
                          <TableHead className="text-gray-300">Content Type</TableHead>
                          <TableHead className="text-gray-300">Report Date</TableHead>
                          <TableHead className="text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportedContent.map((content) => (
                          <TableRow key={content.id} className="border-gray-800 hover:bg-gray-800">
                            <TableCell className="text-white font-medium">{content.title}</TableCell>
                            <TableCell className="text-gray-300">{content.reportReason}</TableCell>
                            <TableCell className="text-gray-300 capitalize">{content.contentType}</TableCell>
                            <TableCell className="text-gray-300">
                              {new Date(content.reportedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => window.open(`/media/${content.id}`, '_blank')}
                                >
                                  View
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDeleteContent(content.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="users" className="py-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage user accounts, including banning problematic users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {users.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No users found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800 hover:bg-gray-800">
                          <TableHead className="text-gray-300">Username</TableHead>
                          <TableHead className="text-gray-300">Email</TableHead>
                          <TableHead className="text-gray-300">Join Date</TableHead>
                          <TableHead className="text-gray-300">Status</TableHead>
                          <TableHead className="text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id} className="border-gray-800 hover:bg-gray-800">
                            <TableCell className="text-white font-medium">{user.username}</TableCell>
                            <TableCell className="text-gray-300">{user.email || 'N/A'}</TableCell>
                            <TableCell className="text-gray-300">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <span 
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  (user as AdminUser).banned ? 
                                  'bg-red-900 text-red-300' : 
                                  'bg-green-900 text-green-300'
                                }`}
                              >
                                {(user as AdminUser).banned ? 'Banned' : 'Active'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant={(user as AdminUser).banned ? "default" : "destructive"} 
                                size="sm"
                                onClick={() => handleBanUser(user.id, (user as AdminUser).banned)}
                              >
                                {(user as AdminUser).banned ? 'Unban User' : 'Ban User'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
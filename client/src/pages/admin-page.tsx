import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Video, User } from '@shared/schema';
import ThumbnailImage from '@/components/ThumbnailImage';
import { Link } from "wouter";

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
  const [pendingContent, setPendingContent] = useState<PendingContent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Handle approving content
  const handleApproveContent = async (videoId: number) => {
    try {
      await apiRequest('POST', `/api/admin/content/${videoId}/approve`);
      setPendingContent(prev => prev.filter(item => item.id !== videoId));
      toast({
        title: 'Success',
        description: 'Content approved successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error approving content:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve content',
        variant: 'destructive'
      });
    }
  };

  // Handle rejecting content
  const handleRejectContent = async (videoId: number) => {
    try {
      await apiRequest('POST', `/api/admin/content/${videoId}/reject`, {
        reason: 'Content rejected by admin'
      });
      setPendingContent(prev => prev.filter(item => item.id !== videoId));
      toast({
        title: 'Success',
        description: 'Content rejected successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error rejecting content:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject content',
        variant: 'destructive'
      });
    }
  };

  // Handle featuring content
  const handleFeatureContent = async (videoId: number) => {
    try {
      const response = await apiRequest('POST', `/api/admin/content/${videoId}/feature`);
      const updatedVideo = await response.json();
      
      // Update the pending content list with the updated featured status
      setPendingContent(prev => prev.map(item => 
        item.id === videoId ? { ...item, featured: updatedVideo.featured } : item
      ));
      
      toast({
        title: 'Success',
        description: `Content ${updatedVideo.featured ? 'featured' : 'unfeatured'} successfully`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error toggling feature status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feature status',
        variant: 'destructive'
      });
    }
  };

  // Filter users based on search query
  useEffect(() => {
    if (userSearchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = userSearchQuery.toLowerCase();
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(query) || 
        (user.email && user.email.toLowerCase().includes(query))
      );
      setFilteredUsers(filtered);
    }
  }, [userSearchQuery, users]);

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
        // Fetch all users
        const usersRes = await apiRequest('GET', '/api/admin/users');
        const usersData = await usersRes.json();
        setUsers(usersData);
        
        // Fetch pending content for review
        try {
          const pendingRes = await apiRequest('GET', '/api/admin/content/pending');
          if (pendingRes.ok) {
            const pendingData = await pendingRes.json();
            console.log('Pending content data:', pendingData);
            setPendingContent(pendingData);
          }
        } catch (pendingError) {
          console.error('Could not load pending content:', pendingError);
          setPendingContent([]);
        }
        
        // Fetch actual reported content
        try {
          const reportedRes = await apiRequest('GET', '/api/admin/content/reported');
          if (reportedRes.ok) {
            const reportedData = await reportedRes.json();
            console.log('Loaded reported content:', reportedData);
            setReportedContent(reportedData);
          } else {
            console.error('Failed to load reported content, status:', reportedRes.status);
            setReportedContent([]);
          }
        } catch (contentError) {
          console.error('Could not load reported content:', contentError);
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
      console.log(`Attempting to delete content with ID: ${videoId}`);
      const response = await apiRequest('DELETE', `/api/admin/content/${videoId}`);
      
      // Check if the request was successful
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response from server:', errorData);
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }
      
      console.log(`Successfully deleted content with ID: ${videoId}`);
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
        description: error instanceof Error ? error.message : 'Failed to delete content',
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
            <TabsTrigger value="pending" className="flex-1">Pending Review</TabsTrigger>
            <TabsTrigger value="content" className="flex-1">Reported Content</TabsTrigger>
            <TabsTrigger value="users" className="flex-1">User Management</TabsTrigger>
            <TabsTrigger value="system" className="flex-1">System Tools</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="py-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Pending Content Review</CardTitle>
                <CardDescription className="text-gray-400">
                  Approve or reject user-submitted content before it appears publicly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {pendingContent.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No content pending review</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800 hover:bg-gray-800">
                          <TableHead className="text-gray-300">Thumbnail</TableHead>
                          <TableHead className="text-gray-300">Title</TableHead>
                          <TableHead className="text-gray-300">Uploader</TableHead>
                          <TableHead className="text-gray-300">Content Type</TableHead>
                          <TableHead className="text-gray-300">Duration</TableHead>
                          <TableHead className="text-gray-300">Upload Date</TableHead>
                          <TableHead className="text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingContent.map((content) => (
                          <TableRow key={content.id} className="border-gray-800 hover:bg-gray-800">
                            <TableCell className="w-24">
                              <div className="h-16 w-24 overflow-hidden rounded border border-gray-700">
                                <ThumbnailImage 
                                  contentId={content.id} 
                                  contentType={content.contentType} 
                                  title={content.title}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-white font-medium">{content.title}</TableCell>
                            <TableCell className="text-gray-300">
                              {content.uploaderName ? (
                                <Link 
                                  href={content.userId ? `/user/${content.userId}` : '#'} 
                                  className="text-primary hover:text-primary/80 underline"
                                >
                                  {content.uploaderName}
                                </Link>
                              ) : 'Anonymous'}
                            </TableCell>
                            <TableCell className="text-gray-300 capitalize">{content.contentType}</TableCell>
                            <TableCell className="text-gray-300">
                              {content.contentType === 'video' ? 
                                (content.duration > 0 ? 
                                  `${Math.floor(content.duration / 60)}:${(content.duration % 60).toString().padStart(2, '0')}` 
                                  : 'N/A') 
                                : 'N/A'}
                              {/* Hidden span to avoid React warnings with console logs */}
                              <span style={{display: 'none'}}>{
                                // Log duration information for debugging
                                typeof window !== 'undefined' && console.log(`Duration for content ${content.id}: ${content.duration}, type: ${typeof content.duration}`)
                              }</span>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {new Date(content.createdAt).toLocaleDateString()}
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
                                  variant="secondary" 
                                  size="sm"
                                  onClick={() => handleFeatureContent(content.id)}
                                  className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                  {content.featured ? 'Unfeature' : 'Feature'}
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handleApproveContent(content.id)}
                                >
                                  Approve
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleRejectContent(content.id)}
                                >
                                  Reject
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
                {/* User search input */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Search users by username or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                    <div className="absolute right-3 top-2.5 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </div>
                  </div>
                </div>
                <ScrollArea className="h-[500px]">
                  {filteredUsers.length === 0 ? (
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
                        {filteredUsers.map((user) => (
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

          <TabsContent value="system" className="py-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>System Tools</CardTitle>
                <CardDescription className="text-gray-400">
                  System administration and maintenance tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-10 text-center text-gray-400">
                  <p>System tools have been removed as requested.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
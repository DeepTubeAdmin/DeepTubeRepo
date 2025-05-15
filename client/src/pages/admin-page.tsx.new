import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import SEO from '@/components/SEO';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Video, User } from '@shared/schema';
import ThumbnailImage from '@/components/ThumbnailImage';
import { Link } from "wouter";
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Loader2, X, Info } from 'lucide-react';

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

// Featured content type
type FeaturedContent = Video & {
  uploaderName?: string | null;
};
// apiRequest imported above
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
  
  // Helper function to view content with admin parameter
  const viewContentAsAdmin = (contentId: number) => {
    window.open(`/media/${contentId}?admin=1`, '_blank');
  };

  // Fetch featured content using React Query
  const featuredContent = useQuery<FeaturedContent[]>({
    queryKey: ['/api/admin/content/featured'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/content/featured');
      return res.json();
    }
  });
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  
  // For duplicate detection feature
  const [isGeneratingHashes, setIsGeneratingHashes] = useState(false);
  const [hashResults, setHashResults] = useState<any>(null);
  const [contentWithoutHashes, setContentWithoutHashes] = useState(0);

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

  // Handle unfeaturing content from the featured tab
  const handleToggleFeature = async (contentId: number) => {
    try {
      await apiRequest('POST', `/api/admin/content/${contentId}/feature`);

      // Refresh the featured content list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content/featured'] });

      toast({
        title: 'Success',
        description: 'Content removed from featured section',
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

  // Process content to generate perceptual hashes
  const handleGenerateHashes = async () => {
    setIsGeneratingHashes(true);
    setHashResults(null);
    
    try {
      const response = await apiRequest('POST', '/api/admin/generate-hashes');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || `Server returned ${response.status}`);
      }
      
      const data = await response.json();
      setHashResults(data);
      
      // Update stat counts if successfully processed
      if (data.success) {
        setContentWithoutHashes(prev => Math.max(0, prev - data.processed));
      }
      
      toast({
        title: data.success ? 'Success' : 'Error',
        description: data.message || 
          (data.success ? `Processed ${data.processed} content items` : 'Error generating hashes'),
        variant: data.success ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Error generating perceptual hashes:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate hashes',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingHashes(false);
    }
  };

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
        
        // Fetch dashboard stats to get content without hashes count
        try {
          const dashboardRes = await apiRequest('GET', '/api/admin/dashboard');
          if (dashboardRes.ok) {
            const dashboardData = await dashboardRes.json();
            if (dashboardData.stats && typeof dashboardData.stats.contentWithoutHashes === 'number') {
              setContentWithoutHashes(dashboardData.stats.contentWithoutHashes);
            }
          }
        } catch (statsError) {
          console.error('Could not load dashboard stats:', statsError);
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
            <TabsTrigger value="featured" className="flex-1">Featured Videos</TabsTrigger>
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
                          <TableHead className="text-gray-300">
                              Duration
                          </TableHead>
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
                            <TableCell className="font-medium text-gray-200 max-w-[200px] truncate">
                              {content.title}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              <Link href={`/user/${content.uploaderId}`} className="hover:underline hover:text-primary">
                                {content.uploaderName || `User ${content.uploaderId}`}
                              </Link>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              <span className={`px-2 py-1 rounded text-xs ${
                                content.contentType === 'video' ? 'bg-blue-900 text-blue-300' :
                                content.contentType === 'image' ? 'bg-green-900 text-green-300' :
                                'bg-purple-900 text-purple-300'
                              }`}>
                                {content.contentType?.charAt(0).toUpperCase() + content.contentType?.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {content.duration ? `${Math.floor(content.duration / 60)}:${(content.duration % 60).toString().padStart(2, '0')}` : 'N/A'}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {new Date(content.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => viewContentAsAdmin(content.id)}
                                >
                                  View
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handleApproveContent(content.id)}
                                  className="bg-green-600 hover:bg-green-700"
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
                  Review and moderate reported content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {reportedContent.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No reported content</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800 hover:bg-gray-800">
                          <TableHead className="text-gray-300">Thumbnail</TableHead>
                          <TableHead className="text-gray-300">Title</TableHead>
                          <TableHead className="text-gray-300">Report Reason</TableHead>
                          <TableHead className="text-gray-300">Reported By</TableHead>
                          <TableHead className="text-gray-300">Report Date</TableHead>
                          <TableHead className="text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportedContent.map((content) => (
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
                            <TableCell className="font-medium text-gray-200 max-w-[200px] truncate">
                              {content.title}
                            </TableCell>
                            <TableCell className="text-gray-300 max-w-[200px]">
                              {content.reportReason}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {content.reportedBy || 'Anonymous'}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {new Date(content.reportedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => viewContentAsAdmin(content.id)}
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
                  View and manage user accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search users by username or email"
                    className="w-full bg-gray-800 border-gray-700 rounded p-2 text-white"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                  />
                </div>
                <ScrollArea className="h-[500px]">
                  {filteredUsers.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No users found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800 hover:bg-gray-800">
                          <TableHead className="text-gray-300">ID</TableHead>
                          <TableHead className="text-gray-300">Username</TableHead>
                          <TableHead className="text-gray-300">Email</TableHead>
                          <TableHead className="text-gray-300">Status</TableHead>
                          <TableHead className="text-gray-300">Join Date</TableHead>
                          <TableHead className="text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id} className="border-gray-800 hover:bg-gray-800">
                            <TableCell className="font-medium text-gray-300">
                              {user.id}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              <Link href={`/user/${user.id}`} className="hover:underline hover:text-primary">
                                {user.username}
                              </Link>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {user.email}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${(user as AdminUser).banned ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                                {(user as AdminUser).banned ? 'Banned' : 'Active'}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant={(user as AdminUser).banned ? "default" : "destructive"} 
                                size="sm"
                                onClick={() => handleBanUser(user.id, (user as AdminUser).banned)}
                                className={(user as AdminUser).banned ? "bg-green-600 hover:bg-green-700" : ""}
                              >
                                {(user as AdminUser).banned ? 'Unban' : 'Ban'}
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

          <TabsContent value="featured" className="py-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Featured Content</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage what appears in the featured section on the home page
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {featuredContent.isLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : featuredContent.data?.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No featured content</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-800 hover:bg-gray-800">
                          <TableHead className="text-gray-300">Thumbnail</TableHead>
                          <TableHead className="text-gray-300">Title</TableHead>
                          <TableHead className="text-gray-300">Uploader</TableHead>
                          <TableHead className="text-gray-300">Type</TableHead>
                          <TableHead className="text-gray-300">Views</TableHead>
                          <TableHead className="text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {featuredContent.data?.map((content) => (
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
                            <TableCell className="font-medium text-gray-200 max-w-[200px] truncate">
                              {content.title}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              <Link href={`/user/${content.uploaderId}`} className="hover:underline hover:text-primary">
                                {content.uploaderName || `User ${content.uploaderId}`}
                              </Link>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              <span className={`px-2 py-1 rounded text-xs ${
                                content.contentType === 'video' ? 'bg-blue-900 text-blue-300' :
                                content.contentType === 'image' ? 'bg-green-900 text-green-300' :
                                'bg-purple-900 text-purple-300'
                              }`}>
                                {content.contentType?.charAt(0).toUpperCase() + content.contentType?.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {content.views || 0}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => viewContentAsAdmin(content.id)}
                                >
                                  View
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleToggleFeature(content.id)}
                                >
                                  Remove
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
        </Tabs>
        
        {/* Perceptual Hash Generation Feature */}
        <Card className="bg-gray-900 border-gray-800 mt-6">
          <CardHeader>
            <CardTitle>Duplicate Detection Tools</CardTitle>
            <CardDescription className="text-gray-400">
              Generate perceptual hashes for videos and images to detect duplicates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-800 p-4 rounded-md mb-4 flex items-center">
              <Info className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
              <p className="text-gray-300 text-sm">
                This tool will process existing content without perceptual hashes, generating hash values for duplicate detection. Content without hashes: {contentWithoutHashes}
              </p>
            </div>
            
            {hashResults && (
              <div className={`p-4 rounded-md mb-4 ${hashResults.success ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                <h3 className="text-lg font-medium mb-2">{hashResults.success ? 'Success' : 'Error'}</h3>
                <p className="text-gray-300 text-sm">{hashResults.message}</p>
                {hashResults.success && (
                  <div className="mt-2">
                    <p className="text-gray-300 text-sm">Processed: {hashResults.processed} items</p>
                    {hashResults.duplicates > 0 && (
                      <p className="text-amber-300 text-sm mt-1">Potential duplicates found: {hashResults.duplicates}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <Button 
              onClick={handleGenerateHashes} 
              disabled={isGeneratingHashes || contentWithoutHashes === 0}
              className="w-full"
            >
              {isGeneratingHashes ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : contentWithoutHashes === 0 ? (
                'All Content Has Hashes'
              ) : (
                `Generate Hashes (${contentWithoutHashes} Items Pending)`
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
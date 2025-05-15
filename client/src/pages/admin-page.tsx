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
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [featuredVideos, setFeaturedVideos] = useState<FeaturedContent[]>([]);
  
  // Redirect non-admin users
  useEffect(() => {
    if (user && (user.id !== 1 && user.id !== 2)) {
      setLocation("/");
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
    }
  }, [user, setLocation, toast]);

  // Load admin data
  useEffect(() => {
    const loadAdminData = async () => {
      try {
        setLoading(true);
        
        // Fetch pending content
        const pendingResponse = await apiRequest("GET", "/api/admin/pending-content");
        const pendingData = await pendingResponse.json();
        setPendingContent(pendingData);
        
        // Fetch reported content
        const reportedResponse = await apiRequest("GET", "/api/admin/reported-content");
        const reportedData = await reportedResponse.json();
        setReportedContent(reportedData);
        
        // Fetch users
        const usersResponse = await apiRequest("GET", "/api/admin/users");
        const usersData = await usersResponse.json();
        setUsers(usersData);
        setFilteredUsers(usersData);
        
        // Fetch featured videos
        const featuredResponse = await apiRequest("GET", "/api/admin/featured-videos");
        const featuredData = await featuredResponse.json();
        setFeaturedVideos(featuredData);
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading admin data:", error);
        toast({
          title: "Error",
          description: "Failed to load admin data",
          variant: "destructive",
        });
        setLoading(false);
      }
    };
    
    if (user && (user.id === 1 || user.id === 2)) {
      loadAdminData();
    }
  }, [user, toast]);

  // Handle user search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users as AdminUser[]);
    } else {
      const filtered = users.filter(
        (u) => 
          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered as AdminUser[]);
    }
  }, [searchTerm, users]);

  // Mutation to handle content approval
  const approveMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const response = await apiRequest("POST", `/api/admin/approve-content/${contentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Content Approved",
        description: "The content is now publicly visible",
      });
      
      // Refresh pending content list
      apiRequest("GET", "/api/admin/pending-content")
        .then(res => res.json())
        .then(data => setPendingContent(data));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to approve content: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to handle content rejection
  const rejectMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const response = await apiRequest("POST", `/api/admin/reject-content/${contentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Content Rejected",
        description: "The content has been rejected and won't be displayed",
      });
      
      // Refresh pending content list
      apiRequest("GET", "/api/admin/pending-content")
        .then(res => res.json())
        .then(data => setPendingContent(data));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to reject content: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to handle content deletion for reported content
  const deleteMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/content/${contentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Content Deleted",
        description: "The content has been permanently removed",
      });
      
      // Refresh reported content list
      apiRequest("GET", "/api/admin/reported-content")
        .then(res => res.json())
        .then(data => setReportedContent(data));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete content: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to handle user banning
  const banUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/admin/ban-user/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Banned",
        description: "The user has been banned from the platform",
      });
      
      // Refresh user list
      apiRequest("GET", "/api/admin/users")
        .then(res => res.json())
        .then(data => {
          setUsers(data);
          setFilteredUsers(data);
        });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to ban user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to handle user unbanning
  const unbanUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/admin/unban-user/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User Unbanned",
        description: "The user has been unbanned and can use the platform again",
      });
      
      // Refresh user list
      apiRequest("GET", "/api/admin/users")
        .then(res => res.json())
        .then(data => {
          setUsers(data);
          setFilteredUsers(data);
        });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to unban user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to handle featuring content
  const featureMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const response = await apiRequest("POST", `/api/admin/feature-content/${contentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Content Featured",
        description: "The content will now appear in featured sections",
      });
      
      // Refresh featured videos list
      apiRequest("GET", "/api/admin/featured-videos")
        .then(res => res.json())
        .then(data => setFeaturedVideos(data));
      
      // Refresh pending content list too as it shows featured status
      apiRequest("GET", "/api/admin/pending-content")
        .then(res => res.json())
        .then(data => setPendingContent(data));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to feature content: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to handle unfeaturing content
  const unfeatureMutation = useMutation({
    mutationFn: async (contentId: number) => {
      const response = await apiRequest("POST", `/api/admin/unfeature-content/${contentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Content Unfeatured",
        description: "The content has been removed from featured sections",
      });
      
      // Refresh featured videos list
      apiRequest("GET", "/api/admin/featured-videos")
        .then(res => res.json())
        .then(data => setFeaturedVideos(data));
      
      // Refresh pending content list too as it shows featured status
      apiRequest("GET", "/api/admin/pending-content")
        .then(res => res.json())
        .then(data => setPendingContent(data));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to unfeature content: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle action functions
  const handleApproveContent = (contentId: number) => {
    approveMutation.mutate(contentId);
  };
  
  const handleRejectContent = (contentId: number) => {
    rejectMutation.mutate(contentId);
  };
  
  const handleDeleteContent = (contentId: number) => {
    if (window.confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      deleteMutation.mutate(contentId);
    }
  };
  
  const handleBanUser = (userId: number) => {
    if (window.confirm('Are you sure you want to ban this user?')) {
      banUserMutation.mutate(userId);
    }
  };
  
  const handleUnbanUser = (userId: number) => {
    unbanUserMutation.mutate(userId);
  };
  
  const handleFeatureContent = (contentId: number) => {
    const content = [...pendingContent, ...featuredVideos].find(c => c.id === contentId);
    if (content?.featured) {
      unfeatureMutation.mutate(contentId);
    } else {
      featureMutation.mutate(contentId);
    }
  };

  // If not authenticated or loading, show loading spinner
  if (!user || loading) {
    return (
      <Layout>
        <SEO title="Admin Dashboard | DeepTube Beta" />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // If not an admin, don't render anything (redirect is handled by useEffect)
  if (user.id !== 1 && user.id !== 2) {
    return null;
  }

  return (
    <Layout>
      <SEO title="Admin Dashboard | DeepTube Beta" />
      <div className="container py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>
        
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
                <div className="text-sm text-amber-400 mb-2 md:hidden">
                  <div className="flex items-center">
                    <Info className="w-4 h-4 mr-1" />
                    Swipe left/right to see all columns
                  </div>
                </div>
                <ScrollArea className="h-[500px]">
                  {pendingContent.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No content pending review</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="min-w-[800px]">
                        <TableHeader>
                          <TableRow className="border-gray-800 hover:bg-gray-800">
                            <TableHead className="text-gray-300 w-24">Thumbnail</TableHead>
                            <TableHead className="text-gray-300 w-48 md:w-auto">Title</TableHead>
                            <TableHead className="text-gray-300 w-32 md:w-auto">Uploader</TableHead>
                            <TableHead className="text-gray-300 w-28 md:w-auto">Content Type</TableHead>
                            <TableHead className="text-gray-300 w-24 md:w-auto">
                                Duration
                            </TableHead>
                            <TableHead className="text-gray-300 w-32 md:w-auto">Upload Date</TableHead>
                            <TableHead className="text-gray-300 w-80 md:w-auto">Actions</TableHead>
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
                              <TableCell className="text-white font-medium max-w-[200px] truncate" title={content.title}>
                                {content.title}
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {content.uploaderName ? (
                                  <Link 
                                    href={`/user/${content.uploaderName}`} 
                                    className="text-primary hover:text-primary/80 underline"
                                  >
                                    {content.uploaderName}
                                  </Link>
                                ) : 'Anonymous'}
                              </TableCell>
                              <TableCell className="text-gray-300 capitalize">{content.contentType}</TableCell>
                              <TableCell>
                                {content.duration ? `${Math.floor(content.duration / 60)}:${String(Math.floor(content.duration % 60)).padStart(2, '0')}` : '-'}
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {new Date(content.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right md:text-left">
                                <div className="flex flex-wrap gap-2">
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
                    </div>
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
                <div className="text-sm text-amber-400 mb-2 md:hidden">
                  <div className="flex items-center">
                    <Info className="w-4 h-4 mr-1" />
                    Swipe left/right to see all columns
                  </div>
                </div>
                <ScrollArea className="h-[500px]">
                  {reportedContent.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No reported content to review</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="min-w-[700px]">
                        <TableHeader>
                          <TableRow className="border-gray-800 hover:bg-gray-800">
                            <TableHead className="text-gray-300 w-48 md:w-auto">Title</TableHead>
                            <TableHead className="text-gray-300 w-48 md:w-auto">Report Reason</TableHead>
                            <TableHead className="text-gray-300 w-28 md:w-auto">Content Type</TableHead>
                            <TableHead className="text-gray-300 w-32 md:w-auto">Report Date</TableHead>
                            <TableHead className="text-gray-300 w-48 md:w-auto">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportedContent.map((content) => (
                            <TableRow key={content.id} className="border-gray-800 hover:bg-gray-800">
                              <TableCell className="text-white font-medium max-w-[200px] truncate" title={content.title}>
                                {content.title}
                              </TableCell>
                              <TableCell className="text-gray-300 max-w-[200px] truncate" title={content.reportReason}>
                                {content.reportReason}
                              </TableCell>
                              <TableCell className="text-gray-300 capitalize">{content.contentType}</TableCell>
                              <TableCell className="text-gray-300">
                                {new Date(content.reportedAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right md:text-left">
                                <div className="flex flex-wrap gap-2">
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
                    </div>
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
                      placeholder="Search users by username or email..."
                      className="w-full p-2 pl-3 bg-gray-800 border border-gray-700 rounded text-white"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        onClick={() => setSearchTerm('')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <Table className="min-w-[700px]">
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
                            {user.banned ? (
                              <span className="text-red-500 font-medium">Banned</span>
                            ) : (
                              <span className="text-green-500 font-medium">Active</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedUser(user.id === selectedUser ? null : user.id)}
                              >
                                {user.id === selectedUser ? 'Hide Details' : 'Show Details'}
                              </Button>
                              
                              {user.banned ? (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handleUnbanUser(user.id)}
                                >
                                  Unban
                                </Button>
                              ) : (
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleBanUser(user.id)}
                                >
                                  Ban
                                </Button>
                              )}
                            </div>
                            
                            {user.id === selectedUser && (
                              <div className="mt-2 border border-gray-700 rounded p-2 bg-gray-800">
                                <p className="text-gray-300 text-sm"><strong>User ID:</strong> {user.id}</p>
                                <p className="text-gray-300 text-sm"><strong>Joined:</strong> {new Date(user.createdAt).toLocaleString()}</p>
                                <div className="mt-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.open(`/user/${user.username}`, '_blank')}
                                  >
                                    View Profile
                                  </Button>
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="featured" className="py-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Featured Videos</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage videos that appear in the featured section of the homepage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-amber-400 mb-2 md:hidden">
                  <div className="flex items-center">
                    <Info className="w-4 h-4 mr-1" />
                    Swipe left/right to see all columns
                  </div>
                </div>
                <ScrollArea className="h-[500px]">
                  {featuredVideos.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No featured videos</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="min-w-[700px]">
                        <TableHeader>
                          <TableRow className="border-gray-800 hover:bg-gray-800">
                            <TableHead className="text-gray-300">Thumbnail</TableHead>
                            <TableHead className="text-gray-300">Title</TableHead>
                            <TableHead className="text-gray-300">Uploader</TableHead>
                            <TableHead className="text-gray-300">Content Type</TableHead>
                            <TableHead className="text-gray-300">Views</TableHead>
                            <TableHead className="text-gray-300">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {featuredVideos.map((video) => (
                            <TableRow key={video.id} className="border-gray-800 hover:bg-gray-800">
                              <TableCell className="w-24">
                                <div className="h-16 w-24 overflow-hidden rounded border border-gray-700">
                                  <ThumbnailImage 
                                    contentId={video.id} 
                                    contentType={video.contentType} 
                                    title={video.title}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-white font-medium max-w-[200px] truncate" title={video.title}>
                                {video.title}
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {video.uploaderName ? (
                                  <Link 
                                    href={`/user/${video.uploaderName}`} 
                                    className="text-primary hover:text-primary/80 underline"
                                  >
                                    {video.uploaderName}
                                  </Link>
                                ) : 'Anonymous'}
                              </TableCell>
                              <TableCell className="text-gray-300 capitalize">{video.contentType}</TableCell>
                              <TableCell className="text-gray-300">{video.views.toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.open(`/media/${video.id}`, '_blank')}
                                  >
                                    View
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleFeatureContent(video.id)}
                                  >
                                    Unfeature
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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
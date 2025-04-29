import { useState, useEffect } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Ban, Flag, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Video, User } from '@shared/schema';

export default function AdminPage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("videos");
  const [videos, setVideos] = useState<Video[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reportedContent, setReportedContent] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check if user is admin (for demo, we'll consider users with ID 1 or 2 as admins)
  const isAdmin = user && (user.id === 1 || user.id === 2);
  
  useEffect(() => {
    if (!user) {
      setLocation('/auth');
      return;
    }
    
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin panel",
        variant: "destructive"
      });
      setLocation('/');
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch videos
        const videoResponse = await apiRequest('GET', '/api/content/all');
        if (!videoResponse.ok) throw new Error('Failed to fetch videos');
        const videoData = await videoResponse.json();
        setVideos(videoData);
        
        // Fetch users
        const userResponse = await apiRequest('GET', '/api/users');
        if (!userResponse.ok) throw new Error('Failed to fetch users');
        const userData = await userResponse.json();
        setUsers(userData);
        
        // For demo purposes, we'll show some random videos as reported
        // In a real app, you would have a separate API endpoint for reported content
        const demoReported = videoData.slice(0, 3).map(video => ({
          ...video,
          reportReason: "Inappropriate content",
          reportedBy: "user123"
        }));
        setReportedContent(demoReported);
        
      } catch (error) {
        console.error('Error fetching admin data:', error);
        toast({
          title: "Error",
          description: "Failed to load administrative data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user, isAdmin, setLocation, toast]);
  
  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm("Are you sure you want to delete this content? This action cannot be undone.")) {
      return;
    }
    
    try {
      const response = await apiRequest('DELETE', `/api/videos/${videoId}`);
      if (!response.ok) throw new Error('Failed to delete video');
      
      // Update the videos list
      setVideos(videos.filter(video => video.id !== videoId));
      // Also remove from reported content if it's there
      setReportedContent(reportedContent.filter(video => video.id !== videoId));
      
      toast({
        title: "Success",
        description: "Content has been deleted successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error",
        description: "Failed to delete content",
        variant: "destructive"
      });
    }
  };
  
  const handleBanUser = async (userId: number) => {
    if (!confirm("Are you sure you want to ban this user? They will no longer be able to upload content.")) {
      return;
    }
    
    try {
      const response = await apiRequest('PATCH', `/api/users/${userId}/ban`, { banned: true });
      if (!response.ok) throw new Error('Failed to ban user');
      
      // Update the users list to show banned status
      setUsers(users.map(user => 
        user.id === userId ? { ...user, banned: true } : user
      ));
      
      toast({
        title: "Success",
        description: "User has been banned successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error banning user:', error);
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive"
      });
    }
  };
  
  const handleUnbanUser = async (userId: number) => {
    try {
      const response = await apiRequest('PATCH', `/api/users/${userId}/ban`, { banned: false });
      if (!response.ok) throw new Error('Failed to unban user');
      
      // Update the users list to show unbanned status
      setUsers(users.map(user => 
        user.id === userId ? { ...user, banned: false } : user
      ));
      
      toast({
        title: "Success",
        description: "User has been unbanned successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast({
        title: "Error",
        description: "Failed to unban user",
        variant: "destructive"
      });
    }
  };
  
  const handleApproveContent = async (videoId: number) => {
    try {
      // In a real app, you would have a proper API endpoint for this
      // For now, we'll just remove it from the reported content
      setReportedContent(reportedContent.filter(video => video.id !== videoId));
      
      toast({
        title: "Success",
        description: "Content has been approved and removed from reported items",
        variant: "default"
      });
    } catch (error) {
      console.error('Error approving content:', error);
      toast({
        title: "Error",
        description: "Failed to approve content",
        variant: "destructive"
      });
    }
  };
  
  if (!user || !isAdmin) {
    return null; // Don't render anything if not authorized
  }
  
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md mb-6">
            <TabsTrigger value="videos">Videos & Images</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reported">Reported Content</TabsTrigger>
          </TabsList>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="videos" className="w-full">
                <div className="bg-gray-900 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">All Content ({videos.length})</h2>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-800 text-left">
                          <th className="px-4 py-3 text-sm">ID</th>
                          <th className="px-4 py-3 text-sm">Thumbnail</th>
                          <th className="px-4 py-3 text-sm">Title</th>
                          <th className="px-4 py-3 text-sm">Type</th>
                          <th className="px-4 py-3 text-sm">Category</th>
                          <th className="px-4 py-3 text-sm">Date Added</th>
                          <th className="px-4 py-3 text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {videos.map((video) => (
                          <tr key={video.id} className="border-t border-gray-700 hover:bg-gray-800">
                            <td className="px-4 py-3 text-sm">{video.id}</td>
                            <td className="px-4 py-3">
                              <div className="w-16 h-10 bg-gray-800 overflow-hidden rounded">
                                <img 
                                  src={video.thumbnail || 'https://via.placeholder.com/160x90'} 
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Link to={`/media/${video.id}`} className="hover:text-primary text-white">
                                {video.title}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-sm capitalize">{video.contentType}</td>
                            <td className="px-4 py-3 text-sm">
                              {video.category?.name || `Category ${video.categoryId}`}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {new Date(video.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteVideo(video.id)}
                                className="w-full"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="users" className="w-full">
                <div className="bg-gray-900 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">All Users ({users.length})</h2>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-800 text-left">
                          <th className="px-4 py-3 text-sm">ID</th>
                          <th className="px-4 py-3 text-sm">Username</th>
                          <th className="px-4 py-3 text-sm">Email</th>
                          <th className="px-4 py-3 text-sm">Status</th>
                          <th className="px-4 py-3 text-sm">Joined Date</th>
                          <th className="px-4 py-3 text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-t border-gray-700 hover:bg-gray-800">
                            <td className="px-4 py-3 text-sm">{user.id}</td>
                            <td className="px-4 py-3 text-sm">{user.username}</td>
                            <td className="px-4 py-3 text-sm">{user.email || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded text-xs ${user.banned ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                                {user.banned ? 'Banned' : 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              {user.banned ? (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleUnbanUser(user.id)}
                                  className="w-full text-green-500 border-green-800"
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Unban
                                </Button>
                              ) : (
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleBanUser(user.id)}
                                  className="w-full"
                                >
                                  <Ban className="h-4 w-4 mr-1" />
                                  Ban
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="reported" className="w-full">
                <div className="bg-gray-900 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Reported Content ({reportedContent.length})</h2>
                  
                  {reportedContent.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Flag className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p>No reported content at this time</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-800 text-left">
                            <th className="px-4 py-3 text-sm">ID</th>
                            <th className="px-4 py-3 text-sm">Thumbnail</th>
                            <th className="px-4 py-3 text-sm">Title</th>
                            <th className="px-4 py-3 text-sm">Type</th>
                            <th className="px-4 py-3 text-sm">Report Reason</th>
                            <th className="px-4 py-3 text-sm">Reported By</th>
                            <th className="px-4 py-3 text-sm">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportedContent.map((video) => (
                            <tr key={video.id} className="border-t border-gray-700 hover:bg-gray-800">
                              <td className="px-4 py-3 text-sm">{video.id}</td>
                              <td className="px-4 py-3">
                                <div className="w-16 h-10 bg-gray-800 overflow-hidden rounded">
                                  <img 
                                    src={video.thumbnail || 'https://via.placeholder.com/160x90'} 
                                    alt={video.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <Link to={`/media/${video.id}`} className="hover:text-primary text-white">
                                  {video.title}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-sm capitalize">{video.contentType}</td>
                              <td className="px-4 py-3 text-sm text-red-400">
                                {(video as any).reportReason || "Inappropriate content"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {(video as any).reportedBy || "anonymous"}
                              </td>
                              <td className="px-4 py-3 flex items-center space-x-2">
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDeleteVideo(video.id)}
                                  className="flex-1"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleApproveContent(video.id)}
                                  className="flex-1 text-green-500 border-green-800"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
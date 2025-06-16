import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Video, User } from "@shared/schema";
import ThumbnailImage from "@/components/ThumbnailImage";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Loader2,
  X,
  Info,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
} from "lucide-react";

// UI primitives --------------------------------------------------------------
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

export type AdminUser = User & { banned: boolean };
export type PendingContent = Video;
export type ReportedContent = Video & {
  reportReason: string;
  reportedAt: string;
  reportedBy: string;
};
export type FeaturedContent = Video & { uploaderName?: string | null };
export type ApprovedResponse = {
  content: (Video & { uploaderName?: string | null })[];
  totalCount: number;
};

// ---------------------------------------------------------------------------
// ADMIN PAGE COMPONENT
// ---------------------------------------------------------------------------
export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "pending" | "reported" | "users" | "featured" | "approved"
  >("pending");

  // -------------------------------------------------------------------------
  //  LOCAL STATE
  // -------------------------------------------------------------------------
  const [pending, setPending] = useState<PendingContent[]>([]);
  const [reported, setReported] = useState<ReportedContent[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [approved, setApproved] = useState<ApprovedResponse["content"]>([]);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [approvedPage, setApprovedPage] = useState(1);

  // Edit functionality state
  const [videoToEdit, setVideoToEdit] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // -------------------------------------------------------------------------
  //  FEATURED (react‑query cache)
  // -------------------------------------------------------------------------
  const {
    data: featured,
    isLoading: featuredLoading,
    error: featuredError,
  } = useQuery<FeaturedContent[]>({
    queryKey: ["/api/admin/content/featured"],
    queryFn: () =>
      apiRequest("GET", "/api/admin/content/featured").then((r) => r.json()),
  });

  // -------------------------------------------------------------------------
  //  AUTH GUARD
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (authLoading) return;
    if (!user || (!user.isAdmin && user.id !== 1 && user.id !== 2))
      navigate("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // -------------------------------------------------------------------------
  //  NOTIFICATION HELPERS
  // -------------------------------------------------------------------------
  const notifyError = (msg = "Something went wrong") =>
    toast.toast({ title: "Error", description: msg, variant: "destructive" });
  const notifySuccess = (msg: string) =>
    toast.toast({ title: "Success", description: msg, variant: "default" });

  // -------------------------------------------------------------------------
  //  DATA LOADERS
  // -------------------------------------------------------------------------
  const load = async <T,>(url: string, setter: (d: T) => void) => {
    try {
      const res = await apiRequest("GET", url);
      setter(await res.json());
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const loadApproved = async (page: number) => {
    try {
      const res = await apiRequest(
        "GET",
        `/api/admin/content/approved?page=${page}&limit=20`
      );
      const data: ApprovedResponse = await res.json();
      setApproved(data.content);
      setApprovedTotal(data.totalCount);
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  // -------------------------------------------------------------------------
  //  INITIAL + TAB CHANGE LOADS
  // -------------------------------------------------------------------------
  useEffect(() => {
    switch (activeTab) {
      case "pending":
        load("/api/admin/content/pending", setPending);
        break;
      case "reported":
        load("/api/admin/content/reported", setReported);
        break;
      case "users":
        load("/api/admin/users", setUsers);
        break;
      case "approved":
        loadApproved(approvedPage);
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, approvedPage]);

  // -------------------------------------------------------------------------
  //  ACTION WRAPPER (POST / DELETE / FEATURE etc.)
  // -------------------------------------------------------------------------
  const doAction = async (
    method: "POST" | "DELETE",
    url: string,
    successMsg: string
  ) => {
    try {
      const res = await apiRequest(method, url);
      if (!res.ok) throw new Error(await res.text());

      const id = Number(url.match(/\d+/)?.[0]);

      // ---------------- UI cache updates ----------------
      if (activeTab === "approved") {
        if (url.includes("/feature")) {
          // refresh list so "featured" badge disappears but keep row
          loadApproved(approvedPage);
        } else if (method === "DELETE") {
          setApproved((prev) => prev.filter((c) => c.id !== id));
        }
      } else if (activeTab === "pending") {
        setPending((prev) => prev.filter((c) => c.id !== id));
      } else if (activeTab === "reported") {
        setReported((prev) => prev.filter((c) => c.id !== id));
      } else if (activeTab === "featured") {
        // immediately remove from the list for a snappy UX
        queryClient.setQueryData<FeaturedContent[]>(
          ["/api/admin/content/featured"],
          (old) => old?.filter((v) => v.id !== id) || []
        );
      }

      // re‑validate featured list and any others
      queryClient.invalidateQueries(["/api/admin/content/featured"]);

      notifySuccess(successMsg);
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  // Edit functionality
  const editMutation = useMutation({
    mutationFn: async ({ videoId, title, description }: { videoId: number; title: string; description: string }) => {
      const response = await apiRequest("PUT", `/api/videos/${videoId}`, {
        title,
        description,
      });
      return response.json();
    },
    onSuccess: () => {
      toast.toast({
        title: "Video updated",
        description: "Video has been successfully updated",
      });
      // Refresh the approved list
      loadApproved(approvedPage);
      setVideoToEdit(null);
    },
    onError: (error: any) => {
      toast.toast({
        title: "Error",
        description: `Failed to update video: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const openEditModal = (video: Video) => {
    setVideoToEdit(video);
    setEditTitle(video.title);
    setEditDescription(video.description || '');
  };

  const handleEdit = () => {
    if (videoToEdit) {
      editMutation.mutate({
        videoId: videoToEdit.id,
        title: editTitle,
        description: editDescription,
      });
    }
  };

  const closeEditModal = () => {
    setVideoToEdit(null);
    setEditTitle('');
    setEditDescription('');
  };

  // -------------------------------------------------------------------------
  //  RENDER HELPERS
  // -------------------------------------------------------------------------
  const fmtDur = (s?: number | null) =>
    s
      ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
      : "-";

  const thumb = (c: Video, cls = "w-20 h-12") => (
    <div className={`relative overflow-hidden rounded ${cls}`}>
      <ThumbnailImage
        contentId={c.id}
        contentType={c.contentType || "video"}
        title={c.title}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );

  // ---------------------------------------------------------------------------
  return (
    <Layout>
      <SEO title="Admin Dashboard | DeepTube" />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 text-white">Admin Dashboard</h1>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full bg-gray-800">
            <TabsTrigger value="pending" className="flex-1">
              Pending Review
            </TabsTrigger>
            <TabsTrigger value="reported" className="flex-1">
              Reported
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1">
              Users
            </TabsTrigger>
            <TabsTrigger value="featured" className="flex-1">
              Featured
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">
              Approved
            </TabsTrigger>
          </TabsList>

          {/* ---------------- PENDING ---------------- */}
          <TabsContent value="pending">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Pending Content</CardTitle>
                <CardDescription>
                  Approve / reject uploaded items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {pending.length === 0 ? (
                    <p className="text-center py-8 text-gray-400">
                      Nothing pending
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>#</TableHead>
                          <TableHead>Preview</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pending.map((c) => (
                          <TableRow key={c.id} className="hover:bg-gray-800">
                            <TableCell>{c.id}</TableCell>
                            <TableCell>{thumb(c)}</TableCell>
                            <TableCell>{c.title}</TableCell>
                            <TableCell className="capitalize">
                              {c.contentType}
                            </TableCell>
                            <TableCell>{fmtDur(c.duration)}</TableCell>
                            <TableCell>
                              {new Date(c.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    window.open(`/media/${c.id}`, "_blank")
                                  }
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-amber-600 hover:bg-amber-700"
                                  onClick={() =>
                                    doAction(
                                      "POST",
                                      `/api/admin/content/${c.id}/feature`,
                                      "Toggled featured"
                                    )
                                  }
                                >
                                  {c.featured ? "Unfeature" : "Feature"}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    doAction(
                                      "POST",
                                      `/api/admin/content/${c.id}/approve`,
                                      "Approved"
                                    )
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    doAction(
                                      "POST",
                                      `/api/admin/content/${c.id}/reject`,
                                      "Rejected"
                                    )
                                  }
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

          {/* ---------------- REPORTED ---------------- */}
          <TabsContent value="reported">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Reported Content</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {reported.length === 0 ? (
                    <p className="text-center py-8 text-gray-400">No reports</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Preview</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reported.map((r) => (
                          <TableRow key={r.id} className="hover:bg-gray-800">
                            <TableCell>{thumb(r)}</TableCell>
                            <TableCell>{r.title}</TableCell>
                            <TableCell>{r.reportReason}</TableCell>
                            <TableCell>
                              {new Date(r.reportedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    window.open(`/media/${r.id}`, "_blank")
                                  }
                                >
                                  View
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    doAction(
                                      "DELETE",
                                      `/api/admin/content/${r.id}`,
                                      "Deleted"
                                    )
                                  }
                                >
                                  Delete <Trash2 className="ml-1 h-4 w-4" />
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

          {/* ---------------- USERS ---------------- */}
          <TabsContent value="users">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className="hover:bg-gray-800">
                          <TableCell>{u.username}</TableCell>
                          <TableCell>{u.email || "N/A"}</TableCell>
                          <TableCell>
                            {u.banned ? "Banned" : "Active"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={u.banned ? "default" : "destructive"}
                              onClick={() =>
                                doAction(
                                  "POST",
                                  `/api/admin/users/${u.id}`,
                                  `User ${
                                    u.banned ? "unbanned" : "banned"
                                  } successfully`
                                )
                              }
                            >
                              {u.banned ? "Unban" : "Ban"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- FEATURED ---------------- */}
          <TabsContent value="featured">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Featured Videos</CardTitle>
              </CardHeader>
              <CardContent>
                {featuredLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : featuredError ? (
                  <p className="text-red-500">Error loading featured</p>
                ) : featured && featured.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center text-gray-400">
                    <Info className="h-10 w-10 mb-4 text-orange-500" />
                    <p>
                      No featured videos. Mark content as "Feature" in the
                      Pending tab.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Preview</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Uploader</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {featured!.map((f) => (
                          <TableRow key={f.id} className="hover:bg-gray-800">
                            <TableCell>{f.id}</TableCell>
                            <TableCell>{thumb(f)}</TableCell>
                            <TableCell>{f.title}</TableCell>
                            <TableCell>{f.uploaderName || "Unknown"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  doAction(
                                    "POST",
                                    `/api/admin/content/${f.id}/feature`,
                                    "Removed from featured"
                                  )
                                }
                              >
                                <X className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- APPROVED ---------------- */}
          <TabsContent value="approved">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Approved Content</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {approved.length === 0 ? (
                    <p className="text-center py-8 text-gray-400">No content</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Preview</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approved.map((a) => (
                          <TableRow key={a.id} className="hover:bg-gray-800">
                            <TableCell>{a.id}</TableCell>
                            <TableCell>{thumb(a)}</TableCell>
                            <TableCell>{a.title}</TableCell>
                            <TableCell className="capitalize">
                              {a.contentType}
                            </TableCell>
                            <TableCell>
                              {new Date(a.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    window.open(`/media/${a.id}`, "_blank")
                                  }
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditModal(a)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                {!a.featured && (
                                  <Button
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-700"
                                    onClick={() =>
                                      doAction(
                                        "POST",
                                        `/api/admin/content/${a.id}/feature`,
                                        "Featured"
                                      )
                                    }
                                  >
                                    Feature
                                  </Button>
                                )}
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    doAction(
                                      "DELETE",
                                      `/api/admin/content/${a.id}`,
                                      "Deleted"
                                    )
                                  }
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
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

                {/* Pagination */}
                {approvedTotal > 20 && (
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={approvedPage === 1}
                      onClick={() => setApprovedPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Prev
                    </Button>
                    <span className="text-sm text-gray-400">
                      Page {approvedPage} of {Math.ceil(approvedTotal / 20)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={approvedPage >= Math.ceil(approvedTotal / 20)}
                      onClick={() => setApprovedPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Video Modal */}
      <Dialog open={videoToEdit !== null} onOpenChange={closeEditModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Video</DialogTitle>
            <DialogDescription>
              Update the title and description for this video.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter video title"
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter video description"
                rows={4}
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={closeEditModal}
              disabled={editMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEdit}
              disabled={editMutation.isPending || !editTitle.trim()}
            >
              {editMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Edit className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

import React from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import {
  MessageCircle,
  ChevronUp,
  Trash2,
  Clock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ForumThreadProps {
  thread: {
    id: number;
    title: string;
    content: string;
    userId: number;
    categoryId: number | null;
    createdAt: string | Date;
    updatedAt: string | Date | null;
    isSticky: boolean;
    upvotes: number;
    tags: string[] | null;
    user?: {
      id: number;
      username: string;
    };
    commentCount?: number;
  };
  isAdmin: boolean;
  userId?: number;
  onUpvote: (threadId: number) => void;
  onDelete: (threadId: number) => void;
  onReply: (threadId: number) => void;
  commentForm?: {
    isVisible: boolean;
    content: string;
    onChange: (content: string) => void;
    onSubmit: () => void;
  };
}

export default function ForumThreadCard({ 
  thread, 
  isAdmin, 
  userId,
  onUpvote, 
  onDelete,
  onReply,
  commentForm
}: ForumThreadProps) {
  
  return (
    <Card 
      key={thread.id} 
      className={`hover:shadow-lg transition-all duration-200 ${
        thread.isSticky 
          ? "border-primary border-2 shadow-md bg-gradient-to-b from-primary/10 to-background" 
          : "hover:border-primary/50"
      }`}
    >
      <CardHeader className={`p-4 pb-2 ${thread.isSticky ? "bg-primary/20 rounded-t-lg" : ""}`}>
        <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {thread.isSticky && (
                <Badge className="bg-primary text-xs font-bold">STICKY</Badge>
              )}
              <Link href={`/forum/thread/${thread.id}`}>
                <h3 className="text-lg font-semibold hover:text-primary cursor-pointer">
                  {thread.title}
                </h3>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="flex items-center">
                <Avatar className="h-5 w-5 mr-1">
                  <AvatarFallback>{thread.user?.username?.[0] || '?'}</AvatarFallback>
                </Avatar>
                {thread.user?.username || 'Anonymous'}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {format(new Date(thread.createdAt), 'MMM d, yyyy')}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <MessageCircle className="h-3 w-3 mr-1" />
                {thread.commentCount || 0} comment{(thread.commentCount !== 1) ? 's' : ''}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <ChevronUp className="h-3 w-3 mr-1" />
                {thread.upvotes} upvote{thread.upvotes !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        <Link href={`/forum/thread/${thread.id}`}>
          <div className="text-sm whitespace-pre-wrap line-clamp-4 hover:text-foreground/90 cursor-pointer">
            {thread.content}
          </div>
        </Link>
        
        {thread.tags && thread.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {thread.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">#{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col border-t border-border/40">
        <div className="flex justify-between items-center w-full pt-2">
          <Link href={`/forum/thread/${thread.id}`}>
            <Button 
              variant="secondary" 
              size="sm"
              className="text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              View Discussion
            </Button>
          </Link>
          
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => onUpvote(thread.id)}
            >
              <ChevronUp className="h-4 w-4 mr-1 text-primary" />
              Upvote
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={() => onReply(thread.id)}
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Reply
            </Button>
            
            {(isAdmin || (userId && thread.userId === userId)) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs text-destructive hover:bg-destructive hover:text-white"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Thread</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this thread? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onDelete(thread.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        
        {/* Comment Form */}
        {commentForm && commentForm.isVisible && (
          <div className="mt-4 w-full">
            <Separator className="mb-4" />
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Reply to this thread</h4>
              <Textarea 
                placeholder="Write your comment here..."
                value={commentForm.content}
                onChange={e => commentForm.onChange(e.target.value)}
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onReply(0)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={commentForm.onSubmit}
                  disabled={!commentForm.content.trim()}
                >
                  Post Comment
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
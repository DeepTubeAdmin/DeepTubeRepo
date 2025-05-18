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
        <div className="flex flex-col gap-2 w-full">
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
          
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
            {/* Removed redundant comment/upvote indicators */}
          </div>
          
          {thread.tags && thread.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {thread.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">#{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <div className="text-sm whitespace-pre-wrap mt-0 bg-muted/10 p-4 rounded-md border border-border/30 min-h-[120px] text-foreground">
          {thread.content}
          {thread.content.length > 300 && (
            <Link href={`/forum/thread/${thread.id}`}>
              <Button variant="link" className="p-0 mt-2 text-primary">
                View full thread
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col gap-3">
        <div className="flex justify-center w-full mt-2">
          <Link href={`/forum/thread/${thread.id}`} className="w-full">
            <Button 
              variant="secondary" 
              size="sm"
              className="w-full"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              View Thread
            </Button>
          </Link>
        </div>
        
        <div className="flex justify-between items-center w-full">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => onUpvote(thread.id)}
          >
            <ChevronUp className="h-4 w-4 text-primary" />
          </Button>
          
          <div className="flex gap-2">
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
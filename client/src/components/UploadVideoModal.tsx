import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from "lucide-react";

const uploadSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long"),
  aiGenerator: z.string().min(2, "AI Generator name is required"),
  prompt: z.string().min(10, "Prompt must be at least 10 characters long"),
  description: z.string().min(10, "Description must be at least 10 characters long"),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface UploadVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadVideoModal({ isOpen, onClose }: UploadVideoModalProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: "",
      aiGenerator: "",
      prompt: "",
      description: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith("video/")) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a video file",
          variant: "destructive",
        });
        e.target.value = ""; // Reset input
      }
    }
  };

  const onSubmit = async (data: UploadFormValues) => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a video file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Here we would normally upload the file and data to the server
      // For now, we'll just simulate a successful upload
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Upload successful",
        description: "Your video has been uploaded and is being processed",
      });
      
      form.reset();
      setSelectedFile(null);
      onClose();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your video",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Upload a Video</DialogTitle>
          <DialogDescription>
            Share your AI-generated video with the Deep-Tube community
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <label htmlFor="video" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-primary" />
                  <p className="mb-2 text-sm text-center">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    {selectedFile ? selectedFile.name : "MP4, WebM, or MOV (max. 500MB)"}
                  </p>
                </div>
                <input 
                  id="video" 
                  type="file" 
                  accept="video/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
            </div>
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Video Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a title for your video" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="aiGenerator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Generator</FormLabel>
                  <FormControl>
                    <Input placeholder="Which AI tool was used (e.g. Midjourney, DALL-E)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt Used</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter the prompt you used to generate this video" 
                      className="resize-none min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add a description for your video" 
                      className="resize-none min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="mr-2"
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Video"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
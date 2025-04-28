import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Image as ImageIcon, Video as VideoIcon, Link as LinkIcon } from "lucide-react";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import { youtubeUrlToEmbedCode, extractYoutubeVideoId, getYoutubeThumbnailUrl } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Category } from "@shared/schema";

interface UploadMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadMediaModal({ isOpen, onClose }: UploadMediaModalProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [aiGenerator, setAiGenerator] = useState("");
  const [prompt, setPrompt] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [contentType, setContentType] = useState<"video" | "image" | "embed">("video");
  const [embedCode, setEmbedCode] = useState<string>("");
  
  // Store original URL to allow toggling between URL and embed code
  const [originalYoutubeUrl, setOriginalYoutubeUrl] = useState<string>("");
  
  // Handle YouTube URL to embed code conversion
  const handleEmbedCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEmbedCode(value);
    
    // Store YouTube URL for reference, but don't auto-convert immediately
    if ((value.includes('youtube.com') || value.includes('youtu.be')) && !value.includes('<iframe')) {
      setOriginalYoutubeUrl(value);
    }
  }, []);
  
  // Fetch categories for the dropdown
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    enabled: isOpen, // Only fetch when modal is open
  });
  
  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setCategoryId("");
      setSelectedFile(null);
      setTitle("");
      setAiGenerator("");
      setPrompt("");
      setDescription("");
      setEmbedCode("");
    }
  }, [isOpen]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isValidType = contentType === "video" 
        ? file.type.startsWith("video/")
        : file.type.startsWith("image/");
      
      if (isValidType) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: `Please select a ${contentType} file`,
          variant: "destructive",
        });
        e.target.value = ""; // Reset input
      }
    }
  }, [toast, contentType]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form - only title and category are required
    if (!title || title.length < 3) {
      toast({
        title: "Invalid title",
        description: "Title must be at least 3 characters long",
        variant: "destructive",
      });
      return;
    }

    if (!categoryId) {
      toast({
        title: "Category required",
        description: `Please select a category for your ${contentType}`,
        variant: "destructive",
      });
      return;
    }

    if (contentType !== "embed" && !selectedFile) {
      toast({
        title: "No file selected",
        description: `Please select a ${contentType} file to upload`,
        variant: "destructive",
      });
      return;
    }
    
    if (contentType === "embed" && !embedCode) {
      toast({
        title: "No embed code",
        description: "Please enter the embed code from YouTube, Vimeo, or other platforms",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Generate a proper thumbnail for YouTube embeds
      let thumbnailUrl = "https://placehold.co/400x225?text=" + encodeURIComponent(title);
      
      // If it's a YouTube embed, extract the video ID and get a thumbnail
      if (contentType === "embed") {
        const videoId = extractYoutubeVideoId(originalYoutubeUrl || embedCode);
        if (videoId) {
          thumbnailUrl = getYoutubeThumbnailUrl(videoId);
        }
      }
      
      // Upload the form data to the server
      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          aiGenerator,
          prompt,
          categoryId,
          contentType,
          // Use YouTube thumbnail for embeds when available
          thumbnail: thumbnailUrl,
          [contentType === "video" ? "videoUrl" : contentType === "image" ? "imageUrl" : "embedCode"]: 
            contentType === "embed" ? embedCode : "https://example.com/placeholder",
          resolution: contentType === "video" ? "HD" : undefined,
          duration: 0, // This would come from analyzing the video file
          credits: 0, // Default to 0 credits for free content
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to upload ${contentType}`);
      }
      
      toast({
        title: "Upload successful",
        description: `Your ${contentType} has been uploaded and is being processed`,
      });
      
      // Reset form
      setTitle("");
      setAiGenerator("");
      setPrompt("");
      setDescription("");
      setCategoryId("");
      setSelectedFile(null);
      onClose();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || `There was an error uploading your ${contentType}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [title, description, aiGenerator, prompt, categoryId, contentType, selectedFile, embedCode, toast, onClose]);

  return (
    <SimpleDialog isOpen={isOpen} onClose={onClose} title="Upload Media">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Share your AI-generated content with the DeepTube community
        </p>
        
        <Tabs defaultValue="video" onValueChange={(value) => setContentType(value as "video" | "image" | "embed")}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="video" className="flex items-center gap-2">
              <VideoIcon className="w-4 h-4" />
              Video
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Image
            </TabsTrigger>
            <TabsTrigger value="embed" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Embed
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="video" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <label htmlFor="video-media" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <VideoIcon className="w-8 h-8 mb-2 text-primary" />
                    <p className="mb-2 text-sm text-center">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      {selectedFile ? selectedFile.name : "MP4, WebM, or MOV (max. 500MB)"}
                    </p>
                  </div>
                  <input 
                    id="video-media" 
                    type="file" 
                    accept="video/*"
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="video-title" className="text-sm font-medium">
                  Video Title <span className="text-destructive">*</span>
                </label>
                <Input 
                  id="video-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for your video"
                  required
                  minLength={3}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="video-category" className="text-sm font-medium">
                  Category <span className="text-destructive">*</span>
                </label>
                <Select 
                  value={categoryId} 
                  onValueChange={setCategoryId}
                  required
                >
                  <SelectTrigger id="video-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading categories...
                      </div>
                    ) : categories && categories.length > 0 ? (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No categories found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="video-aiGenerator" className="text-sm font-medium">
                  AI Generator (Optional)
                </label>
                <Input 
                  id="video-aiGenerator"
                  value={aiGenerator}
                  onChange={(e) => setAiGenerator(e.target.value)}
                  placeholder="Which AI tool was used (e.g. Midjourney, DALL-E)"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="video-prompt" className="text-sm font-medium">
                  Prompt Used (Optional)
                </label>
                <Textarea 
                  id="video-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter the prompt you used to generate this video"
                  className="resize-none min-h-[80px]"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="video-description" className="text-sm font-medium">
                  Description (Optional)
                </label>
                <Textarea 
                  id="video-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for your video"
                  className="resize-none min-h-[80px]"
                />
              </div>
              
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
          </TabsContent>
          
          <TabsContent value="image" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <label htmlFor="image-media" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 mb-2 text-primary" />
                    <p className="mb-2 text-sm text-center">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      {selectedFile ? selectedFile.name : "JPG, PNG, GIF, or WebP (max. 10MB)"}
                    </p>
                  </div>
                  <input 
                    id="image-media" 
                    type="file" 
                    accept="image/*"
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="image-title" className="text-sm font-medium">
                  Image Title <span className="text-destructive">*</span>
                </label>
                <Input 
                  id="image-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for your image"
                  required
                  minLength={3}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="image-category" className="text-sm font-medium">
                  Category <span className="text-destructive">*</span>
                </label>
                <Select 
                  value={categoryId} 
                  onValueChange={setCategoryId}
                  required
                >
                  <SelectTrigger id="image-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading categories...
                      </div>
                    ) : categories && categories.length > 0 ? (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No categories found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="image-aiGenerator" className="text-sm font-medium">
                  AI Generator (Optional)
                </label>
                <Input 
                  id="image-aiGenerator"
                  value={aiGenerator}
                  onChange={(e) => setAiGenerator(e.target.value)}
                  placeholder="Which AI tool was used (e.g. Midjourney, DALL-E)"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="image-prompt" className="text-sm font-medium">
                  Prompt Used (Optional)
                </label>
                <Textarea 
                  id="image-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter the prompt you used to generate this image"
                  className="resize-none min-h-[80px]"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="image-description" className="text-sm font-medium">
                  Description (Optional)
                </label>
                <Textarea 
                  id="image-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for your image"
                  className="resize-none min-h-[80px]"
                />
              </div>
              
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
                    "Upload Image"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="embed" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="embed-code" className="text-sm font-medium">
                  Embed Code <span className="text-destructive">*</span>
                </label>
                <Textarea 
                  id="embed-code"
                  value={embedCode}
                  onChange={handleEmbedCodeChange}
                  placeholder="Paste embed code or YouTube URL (e.g. https://youtu.be/abcdef or <iframe> code)"
                  className="resize-none min-h-[120px] font-mono text-sm"
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-muted-foreground">
                    You can paste a YouTube URL directly and click "Convert to Embed Code", or you can paste a regular embed code.
                  </p>
                  {originalYoutubeUrl && (
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      className="ml-2 text-xs" 
                      onClick={() => {
                        const embedCode = youtubeUrlToEmbedCode(originalYoutubeUrl);
                        if (embedCode) setEmbedCode(embedCode);
                      }}
                    >
                      Convert to Embed Code
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="embed-title" className="text-sm font-medium">
                  Media Title <span className="text-destructive">*</span>
                </label>
                <Input 
                  id="embed-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for your embedded media"
                  required
                  minLength={3}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="embed-category" className="text-sm font-medium">
                  Category <span className="text-destructive">*</span>
                </label>
                <Select 
                  value={categoryId} 
                  onValueChange={setCategoryId}
                  required
                >
                  <SelectTrigger id="embed-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading categories...
                      </div>
                    ) : categories && categories.length > 0 ? (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">
                        No categories found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="embed-aiGenerator" className="text-sm font-medium">
                  AI Generator (Optional)
                </label>
                <Input 
                  id="embed-aiGenerator"
                  value={aiGenerator}
                  onChange={(e) => setAiGenerator(e.target.value)}
                  placeholder="Which AI tool was used (e.g. Midjourney, DALL-E)"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="embed-prompt" className="text-sm font-medium">
                  Prompt Used (Optional)
                </label>
                <Textarea 
                  id="embed-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter the prompt you used to generate this content"
                  className="resize-none min-h-[80px]"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="embed-description" className="text-sm font-medium">
                  Description (Optional)
                </label>
                <Textarea 
                  id="embed-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for your embedded media"
                  className="resize-none min-h-[80px]"
                />
              </div>
              
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
                    "Upload Embed"
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </SimpleDialog>
  );
}
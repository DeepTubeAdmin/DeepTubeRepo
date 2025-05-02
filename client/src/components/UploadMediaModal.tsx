import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Image as ImageIcon, Video as VideoIcon, Link as LinkIcon } from "lucide-react";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import {
  isRedditEmbed,
  extractRedditInfo,
  getRedditThumbnailUrl,
  redditUrlToEmbedCode
} from "@/lib/utils";

import {
  youtubeUrlToEmbedCode,
  extractYoutubeVideoId,
  getYoutubeThumbnailUrl
} from "@/lib/youtubeUtils";
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
  const [customAiGenerator, setCustomAiGenerator] = useState("");
  const [showCustomAiGenerator, setShowCustomAiGenerator] = useState(false);
  
  // AI Generator options
  const aiGeneratorOptions = [
    "Runway", 
    "Google VEO2", 
    "Kling", 
    "Vidu", 
    "Luma", 
    "Open AI Sora", 
    "Other"
  ];
  const [prompt, setPrompt] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [contentType, setContentType] = useState<"video" | "image" | "embed">("embed");
  const [embedCode, setEmbedCode] = useState<string>("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  
  // Store original URLs to allow toggling between URL and embed code
  const [originalYoutubeUrl, setOriginalYoutubeUrl] = useState<string>("");
  const [originalRedditUrl, setOriginalRedditUrl] = useState<string>("");
  
  // Handle embed code changes - detect platform and store URLs
  const handleEmbedCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEmbedCode(value);
    
    // Check for YouTube URL
    if ((value.includes('youtube.com') || value.includes('youtu.be')) && !value.includes('<iframe')) {
      console.log("YouTube URL detected:", value);
      setOriginalYoutubeUrl(value);
      setOriginalRedditUrl("");
      
      // Auto-convert YouTube URLs to embedded format for better UX
      const videoId = extractYoutubeVideoId(value);
      console.log("Extracted YouTube ID:", videoId);
      
      if (videoId) {
        const youtubeEmbed = youtubeUrlToEmbedCode(value);
        console.log("Generated YouTube embed code:", youtubeEmbed);
        
        if (youtubeEmbed) {
          setEmbedCode(youtubeEmbed);
          
          // Also set thumbnail URL
          const thumbnailUrl = getYoutubeThumbnailUrl(videoId);
          console.log("Setting YouTube thumbnail URL:", thumbnailUrl);
          setThumbnailUrl(thumbnailUrl);
          
          // Show success toast
          toast({
            title: "YouTube URL detected",
            description: "URL has been automatically converted to embed format",
          });
        }
      }
    }
    // Check for Reddit URL - reject it
    else if (value.includes('reddit.com/r/') || value.includes('reddit-embed-bq') || value.includes('embed.reddit.com')) {
      console.log("Reddit URL detected - rejecting:", value);
      
      // Clear the embed code to prevent submission
      e.target.value = '';
      setEmbedCode('');
      setOriginalRedditUrl('');
      
      // Show error toast
      toast({
        title: "Reddit content not supported",
        description: "Reddit embeds are not supported. Please use YouTube or Vimeo links instead.",
        variant: "destructive",
      });
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
      setCustomAiGenerator("");
      setShowCustomAiGenerator(false);
      setPrompt("");
      setDescription("");
      setEmbedCode("");
      setThumbnailUrl("");
      setOriginalYoutubeUrl("");
      setOriginalRedditUrl("");
    }
  }, [isOpen]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const isValidType = contentType === "video" 
        ? file.type.startsWith("video/")
        : file.type.startsWith("image/");
      
      // Check file size (10MB limit for images, 500MB for videos)
      const maxSize = contentType === "video" ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
      const isValidSize = file.size <= maxSize;
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: `Please select a ${contentType} file`,
          variant: "destructive",
        });
        e.target.value = ""; // Reset input
        return;
      }
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${contentType === "video" ? "Video" : "Image"} must be less than ${contentType === "video" ? "500MB" : "10MB"}`,
          variant: "destructive",
        });
        e.target.value = ""; // Reset input
        return;
      }
      
      // All checks passed, set the file
      setSelectedFile(file);
    }
  }, [toast, contentType]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form - title, category, and AI generator are required
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
    
    // Check if AI Generator is selected or custom one is provided
    const finalAiGenerator = aiGenerator === "Other" ? customAiGenerator : aiGenerator;
    if (!finalAiGenerator) {
      toast({
        title: "AI Generator required",
        description: "Please select or specify the AI tool used to generate this content",
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
      // Use the existing thumbnail if one was set, otherwise generate a default
      let finalThumbnailUrl = thumbnailUrl || "https://placehold.co/400x225?text=" + encodeURIComponent(title);
      let videoUrl = null;
      let imageUrl = null;
      
      // Handle different file upload approaches based on content type
      if (contentType !== "embed" && selectedFile) {
        if (contentType === "video" && selectedFile.type.includes('mp4')) {
          console.log("Using direct file upload for MP4 video");
          
          // Create a FormData object for the file upload
          const formData = new FormData();
          formData.append('file', selectedFile);
          
          console.log('Starting MP4 file upload to /api/upload/file');
          // Upload the file first
          const fileUploadResponse = await fetch('/api/upload/file', {
            method: 'POST',
            body: formData,
            credentials: 'include',
            // Add timeout and retry options for large uploads
            signal: AbortSignal.timeout(120000), // 2 minute timeout
          }).catch(error => {
            console.error('Network error during MP4 file upload:', error);
            throw new Error(`Network error during upload: ${error.message}`);
          });
          
          if (!fileUploadResponse.ok) {
            const errorData = await fileUploadResponse.json();
            throw new Error(errorData.error || `Failed to upload ${contentType} file`);
          }
          
          // Get the file URL from the response (careful to only parse JSON once)
          let fileData;
          try {
            const responseText = await fileUploadResponse.text();
            console.log("Raw response text:", responseText);
            fileData = JSON.parse(responseText);
            console.log("File upload successful:", fileData);
          } catch (error) {
            const parseError = error as Error;
            console.error("Failed to parse response as JSON:", parseError);
            throw new Error(`Error parsing server response: ${parseError.message}`);
          }
          
          // All files are now uploaded to S3
          console.log("File was uploaded to S3:", fileData);
          console.log("Full S3 upload response:", fileData);
          
          // Store the URL for the video
          videoUrl = fileData.url;
          
          // Generate a thumbnail from the video if none exists
          if (!thumbnailUrl) {
            try {
              // Create a video element to extract the thumbnail
              const videoEl = document.createElement('video');
              videoEl.src = videoUrl;
              videoEl.crossOrigin = 'anonymous';
              videoEl.muted = true;
              videoEl.currentTime = 1; // Set to 1 second in to avoid black frames
              
              // Wait for the video to load enough to extract a frame
              finalThumbnailUrl = await new Promise((resolve, reject) => {
                // Set a timeout to prevent hanging if video loading fails
                const timeout = setTimeout(() => {
                  console.log("Thumbnail extraction timed out");
                  resolve("https://placehold.co/400x225?text=" + encodeURIComponent(title));
                }, 5000);
                
                videoEl.onloadeddata = async () => {
                  try {
                    // Allow some time for the frame to be loaded
                    await new Promise(r => setTimeout(r, 1000));
                    
                    // Create a canvas to draw the video frame
                    const canvas = document.createElement('canvas');
                    canvas.width = videoEl.videoWidth || 400;
                    canvas.height = videoEl.videoHeight || 225;
                    
                    // Draw the current frame of the video onto the canvas
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                      
                      // Convert canvas to data URL (thumbnail)
                      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                      console.log("Generated thumbnail from video");
                      clearTimeout(timeout);
                      resolve(thumbnailDataUrl);
                    } else {
                      console.error("Could not get canvas context");
                      clearTimeout(timeout);
                      resolve("https://placehold.co/400x225?text=" + encodeURIComponent(title));
                    }
                  } catch (err) {
                    console.error("Error generating thumbnail:", err);
                    clearTimeout(timeout);
                    resolve("https://placehold.co/400x225?text=" + encodeURIComponent(title));
                  }
                };
                
                videoEl.onerror = (e) => {
                  console.error("Error loading video for thumbnail:", e);
                  clearTimeout(timeout);
                  resolve("https://placehold.co/400x225?text=" + encodeURIComponent(title));
                };
              });
              
              console.log("Final thumbnail URL type:", typeof finalThumbnailUrl);
            } catch (thumbnailError) {
              console.error("Error creating thumbnail:", thumbnailError);
              // Fall back to placeholder if thumbnail generation fails
              finalThumbnailUrl = "https://placehold.co/400x225?text=" + encodeURIComponent(title);
            }
          }
          
          // Proceed with metadata upload in the next step
        } else if (contentType === "image") {
          // For images, we'll continue using the Data URL approach
          try {
            // Read image as data URL
            imageUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                const result = e.target?.result as string;
                resolve(result);
              };
              reader.onerror = reject;
              reader.readAsDataURL(selectedFile);
            });
            
            // Use the image data URL as the thumbnail as well
            if (imageUrl && typeof imageUrl === 'string') {
              finalThumbnailUrl = imageUrl;
            }
          } catch (error) {
            console.error("Error reading image file:", error);
            toast({
              title: "File read error",
              description: "There was an error processing your image file. Please try a different file.",
              variant: "destructive",
            });
            setIsUploading(false);
            return;
          }
        } else {
          // For all other video types, upload via FormData
          try {
            // Create a FormData object for the file upload
            const formData = new FormData();
            formData.append('file', selectedFile);
            
            console.log('Starting file upload to /api/upload/file');
            // Upload the file first
            const fileUploadResponse = await fetch('/api/upload/file', {
              method: 'POST',
              body: formData,
              credentials: 'include',
              // Add timeout and retry options for large uploads
              signal: AbortSignal.timeout(120000), // 2 minute timeout
            }).catch(error => {
              console.error('Network error during file upload:', error);
              throw new Error(`Network error during upload: ${error.message}`);
            });
            
            if (!fileUploadResponse.ok) {
              const errorData = await fileUploadResponse.json();
              throw new Error(errorData.error || `Failed to upload ${contentType} file`);
            }
            
            // Get the file URL from the response (careful to only parse JSON once)
            let fileData;
            try {
              const responseText = await fileUploadResponse.text();
              console.log("Raw response text:", responseText);
              fileData = JSON.parse(responseText);
              console.log("File upload successful:", fileData);
            } catch (error) {
              const parseError = error as Error;
              console.error("Failed to parse response as JSON:", parseError);
              throw new Error(`Error parsing server response: ${parseError.message}`);
            }
            
            // File is now uploaded to S3
            console.log("Video was uploaded to S3:", fileData);
            // Store the URL for the video
            videoUrl = fileData.url;
          } catch (error) {
            console.error("Error uploading video file:", error);
            toast({
              title: "Video upload error",
              description: "There was an error uploading your video file. Please try a different file.",
              variant: "destructive",
            });
            setIsUploading(false);
            return;
          }
        }
      }
      
      // If it's a YouTube embed and no thumbnail has been set, extract the video ID and get one
      if (contentType === "embed" && !thumbnailUrl) {
        // Check for YouTube content
        const videoId = extractYoutubeVideoId(originalYoutubeUrl || embedCode);
        if (videoId) {
          finalThumbnailUrl = getYoutubeThumbnailUrl(videoId);
        } 
        // Check for Reddit content
        else if (isRedditEmbed(embedCode)) {
          const redditInfo = extractRedditInfo(embedCode);
          // If we have subreddit info, use it for the thumbnail
          if (redditInfo.subreddit) {
            finalThumbnailUrl = getRedditThumbnailUrl(redditInfo.subreddit);
            
            // If we didn't extract a title from the form, try to use the post title from Reddit
            if (!title || title.length < 3) {
              // Extract title from Reddit embed
              const titleMatch = embedCode.match(/reddit\.com\/r\/[^\/]+\/comments\/[^\/]+\/([^\/]+)/);
              if (titleMatch && titleMatch[1]) {
                // Convert URL slug to readable title
                const extractedTitle = titleMatch[1]
                  .replace(/_/g, ' ')
                  .replace(/-/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                  
                setTitle(extractedTitle);
              }
            }
          }
        }
      }
      
      // Upload the form data to the server
      console.log('Submitting video metadata to /api/videos/upload');
      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add a longer timeout for large data payloads (especially base64 images)
        signal: AbortSignal.timeout(60000), // 1 minute timeout
        body: JSON.stringify({

          title,
          description,
          aiGenerator: aiGenerator === "Other" ? customAiGenerator : aiGenerator,
          prompt,
          categoryId,
          contentType,
          // Use YouTube thumbnail for embeds when available
          thumbnail: finalThumbnailUrl,
          videoUrl: videoUrl, // This will now be a server path for MP4s
          imageUrl: imageUrl, // This will still be a data URL for images
          embedCode: contentType === "embed" ? embedCode : null,
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
      setCustomAiGenerator("");
      setShowCustomAiGenerator(false);
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
  }, [title, description, aiGenerator, customAiGenerator, prompt, categoryId, contentType, selectedFile, embedCode, thumbnailUrl, originalYoutubeUrl, originalRedditUrl, toast, onClose]);

  return (
    <SimpleDialog isOpen={isOpen} onClose={onClose} title="Upload New Media" className="bg-[#1a1a1a] border-gray-800 max-w-md">
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-400">
            Share your AI-generated content with the DeepTube community
          </p>
          <a 
            href="https://www.synthesia.io/?via=seth-glass" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded flex items-center"
          >
            <i className="fas fa-magic mr-1"></i> Create AI Video
          </a>
        </div>
        
        <Tabs defaultValue="embed" onValueChange={(value) => setContentType(value as "video" | "image" | "embed")}>
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-[#272727] p-1 rounded-lg">
            <TabsTrigger 
              value="embed" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:font-bold uppercase font-semibold rounded"
            >
              <i className="fas fa-link"></i>
              Embed
            </TabsTrigger>
            <TabsTrigger 
              value="video" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:font-bold uppercase font-semibold rounded"
            >
              <i className="fas fa-video"></i>
              Video
            </TabsTrigger>
            <TabsTrigger 
              value="image" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:font-bold uppercase font-semibold rounded"
            >
              <i className="fas fa-image"></i>
              Image
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="video" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid w-full items-center gap-1.5">
                <label htmlFor="video-media" className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer bg-[#111] hover:bg-[#181818] transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <i className="fas fa-cloud-upload-alt text-3xl mb-3 text-primary"></i>
                    <p className="mb-2 text-sm text-center text-gray-300">
                      <span className="font-semibold text-white">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 text-center">
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
                  AI Generator <span className="text-destructive">*</span>
                </label>
                <Select
                  value={aiGenerator}
                  onValueChange={(value) => {
                    setAiGenerator(value);
                    setShowCustomAiGenerator(value === "Other");
                  }}
                  required
                >
                  <SelectTrigger id="video-aiGenerator">
                    <SelectValue placeholder="Select AI Generator" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiGeneratorOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {showCustomAiGenerator && (
                  <div className="mt-2">
                    <Input
                      id="video-customAiGenerator"
                      value={customAiGenerator}
                      onChange={(e) => setCustomAiGenerator(e.target.value)}
                      placeholder="Specify the AI tool used"
                      required
                    />
                  </div>
                )}
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
                  className="resize-none min-h-[40px]"
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
                  className="resize-none min-h-[60px]"
                />
              </div>
              
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="mr-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isUploading}
                  className="bg-primary text-black hover:bg-primary/90 font-bold uppercase"
                >
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
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid w-full items-center gap-1.5">
                <label htmlFor="image-media" className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer bg-[#111] hover:bg-[#181818] transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <i className="fas fa-cloud-upload-alt text-3xl mb-3 text-primary"></i>
                    <p className="mb-2 text-sm text-center text-gray-300">
                      <span className="font-semibold text-white">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 text-center">
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
                  AI Generator <span className="text-destructive">*</span>
                </label>
                <Select
                  value={aiGenerator}
                  onValueChange={(value) => {
                    setAiGenerator(value);
                    setShowCustomAiGenerator(value === "Other");
                  }}
                  required
                >
                  <SelectTrigger id="image-aiGenerator">
                    <SelectValue placeholder="Select AI Generator" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiGeneratorOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {showCustomAiGenerator && (
                  <div className="mt-2">
                    <Input
                      id="image-customAiGenerator"
                      value={customAiGenerator}
                      onChange={(e) => setCustomAiGenerator(e.target.value)}
                      placeholder="Specify the AI tool used"
                      required
                    />
                  </div>
                )}
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
                  className="resize-none min-h-[60px]"
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
                  className="resize-none min-h-[60px]"
                />
              </div>
              
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="mr-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isUploading}
                  className="bg-primary text-black hover:bg-primary/90 font-bold uppercase"
                >
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
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="embed-code" className="text-sm font-medium">
                  Embed Code <span className="text-destructive">*</span>
                </label>
                <Textarea 
                  id="embed-code"
                  value={embedCode}
                  onChange={handleEmbedCodeChange}
                  placeholder="Paste embed code from YouTube or Vimeo only"
                  className="resize-none min-h-[60px] font-mono text-sm"
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-muted-foreground">
                    Only YouTube and Vimeo embed links are supported. Reddit embeds are not supported.
                  </p>
                  <div className="flex space-x-2">
                    {/* Always show YouTube conversion button if embed code has youtube.com */}
                    {(originalYoutubeUrl || embedCode.includes('youtube.com') || embedCode.includes('youtu.be')) && (
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        className="text-xs" 
                        onClick={() => {
                          // Use either the stored original URL or the current embed code
                          const url = originalYoutubeUrl || embedCode;
                          console.log("Converting YouTube URL:", url);
                          
                          // First try to extract video ID
                          const videoId = extractYoutubeVideoId(url);
                          console.log("Extracted YouTube video ID:", videoId);
                          
                          if (videoId) {
                            // Generate the proper embed code
                            const newEmbedCode = youtubeUrlToEmbedCode(url);
                            if (newEmbedCode) {
                              console.log("Generated embed code:", newEmbedCode);
                              setEmbedCode(newEmbedCode);
                              // Update thumbnail
                              const thumbnailUrl = getYoutubeThumbnailUrl(videoId);
                              console.log("Setting thumbnail URL:", thumbnailUrl);
                              setThumbnailUrl(thumbnailUrl);
                              
                              // Toast success notification
                              toast({
                                title: "YouTube URL converted",
                                description: "URL has been converted to embed format",
                              });
                            }
                          } else {
                            toast({
                              title: "Invalid YouTube URL",
                              description: "Could not extract video ID from the provided URL",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Convert YouTube URL
                      </Button>
                    )}
                    {/* Reddit embeds are no longer supported */}
                  </div>
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
                  AI Generator <span className="text-destructive">*</span>
                </label>
                <Select
                  value={aiGenerator}
                  onValueChange={(value) => {
                    setAiGenerator(value);
                    setShowCustomAiGenerator(value === "Other");
                  }}
                  required
                >
                  <SelectTrigger id="embed-aiGenerator">
                    <SelectValue placeholder="Select AI Generator" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiGeneratorOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {showCustomAiGenerator && (
                  <div className="mt-2">
                    <Input
                      id="embed-customAiGenerator"
                      value={customAiGenerator}
                      onChange={(e) => setCustomAiGenerator(e.target.value)}
                      placeholder="Specify the AI tool used"
                      required
                    />
                  </div>
                )}
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
                  className="resize-none min-h-[60px]"
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
                  className="resize-none min-h-[60px]"
                />
              </div>
              
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="mr-2 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isUploading}
                  className="bg-primary text-black hover:bg-primary/90 font-bold uppercase"
                >
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
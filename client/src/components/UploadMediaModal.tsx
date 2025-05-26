import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  Loader2,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
} from "lucide-react";
import { SimpleDialog } from "@/components/ui/simple-dialog";
import {
  isRedditEmbed,
  extractRedditInfo,
  getRedditThumbnailUrl,
  redditUrlToEmbedCode,
} from "@/lib/utils";

import {
  youtubeUrlToEmbedCode,
  extractYoutubeVideoId,
  getYoutubeThumbnailUrl,
} from "@/lib/youtubeUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Category } from "@shared/schema";

interface UploadMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadMediaModal({
  isOpen,
  onClose,
}: UploadMediaModalProps) {
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
    "Higgsfield",
    "Midjourney",
    "Other",
  ];
  const [prompt, setPrompt] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [contentType, setContentType] = useState<"video" | "image" | "embed">(
    "video"
  );
  const [embedCode, setEmbedCode] = useState<string>("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);

  // Store original URLs to allow toggling between URL and embed code
  const [originalYoutubeUrl, setOriginalYoutubeUrl] = useState<string>("");
  const [originalRedditUrl, setOriginalRedditUrl] = useState<string>("");

  // Handle embed code changes - detect platform and store URLs
  const handleEmbedCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setEmbedCode(value);

      // Check for YouTube URL
      if (
        (value.includes("youtube.com") || value.includes("youtu.be")) &&
        !value.includes("<iframe")
      ) {
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
              description:
                "URL has been automatically converted to embed format",
            });
          }
        }
      }
      // Check for Reddit URL - reject it
      else if (
        value.includes("reddit.com/r/") ||
        value.includes("reddit-embed-bq") ||
        value.includes("embed.reddit.com")
      ) {
        console.log("Reddit URL detected - rejecting:", value);

        // Clear the embed code to prevent submission
        e.target.value = "";
        setEmbedCode("");
        setOriginalRedditUrl("");

        // Show error toast
        toast({
          title: "Reddit content not supported",
          description:
            "Reddit embeds are not supported. Please use YouTube or Vimeo links instead.",
          variant: "destructive",
        });
      }
    },
    []
  );

  // Fetch categories for the dropdown
  const { data: categories, isLoading: categoriesLoading } = useQuery<
    Category[]
  >({
    queryKey: ["/api/categories"],
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

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Check file type
        const isValidType =
          contentType === "video"
            ? file.type.startsWith("video/")
            : file.type.startsWith("image/");

        // Check file size (25MB limit for images, 750MB for videos)
        const maxSize =
          contentType === "video" ? 750 * 1024 * 1024 : 25 * 1024 * 1024;
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
            description: `${
              contentType === "video" ? "Video" : "Image"
            } must be less than ${contentType === "video" ? "750MB" : "25MB"}`,
            variant: "destructive",
          });
          e.target.value = ""; // Reset input
          return;
        }

        // All checks passed, set the file
        setSelectedFile(file);
      }
    },
    [toast, contentType]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsUploading(true);

    const showToast = (
      title: string,
      description: string,
      variant: any = "destructive"
    ) => toast({ title, description, variant });

    const validateForm = () => {
      if (!title || title.length < 3)
        return showToast(
          "Invalid title",
          "Title must be at least 3 characters long"
        );
      if (!categoryId)
        return showToast("Category required", "Please select a category");
      if (!aiGenerator && !customAiGenerator)
        return showToast(
          "AI Generator required",
          "Please select or specify an AI tool"
        );
      if (contentType !== "embed" && !selectedFile)
        return showToast("No file", `Please select a ${contentType} file`);
      if (contentType === "embed" && !embedCode)
        return showToast("No embed code", "Embed code is required");
      return true;
    };
    if (validateForm() !== true) return setIsUploading(false);

    let finalThumbnail =
      thumbnailUrl ||
      `https://placehold.co/400x225?text=${encodeURIComponent(title)}`;
    let videoUrl = null,
      imageUrl = null,
      duration = 0;

    const uploadFile = async () => {
      const formData = new FormData();
      formData.append("file", selectedFile!);
      const res = await fetch("/api/upload/file", {
        method: "POST",
        body: formData,
        credentials: "include",
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) throw new Error("File upload failed");
      return await res.json();
    };

    const generateThumbnailFromVideo = async (videoUrl: string) => {
      return new Promise<string>((resolve) => {
        const video = document.createElement("video");
        video.src = videoUrl;
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.currentTime = 1;
        const timeout = setTimeout(() => resolve(finalThumbnail), 10000);

        video.onloadeddata = async () => {
          duration = video.duration;
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 400;
          canvas.height = video.videoHeight || 225;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          clearTimeout(timeout);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        video.onerror = () => {
          clearTimeout(timeout);
          resolve(finalThumbnail);
        };
      });
    };

    try {
      if (contentType !== "embed" && selectedFile) {
        const fileData = await uploadFile();
        if (contentType === "video") {
          videoUrl = fileData.url;
          if (!thumbnailUrl)
            finalThumbnail = await generateThumbnailFromVideo(videoUrl);
        } else if (contentType === "image") {
          imageUrl = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = (e) => res(e.target?.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(selectedFile!);
          });
          finalThumbnail = imageUrl;
        }
      } else if (contentType === "embed") {
        const videoId = extractYoutubeVideoId(originalYoutubeUrl || embedCode);
        if (videoId) finalThumbnail = getYoutubeThumbnailUrl(videoId);
      }

      const userRes = await fetch("/api/user", { credentials: "include" });
      if (!userRes.ok) throw new Error("User not logged in");
      const user = await userRes.json();

      const payload = {
        userId: user.id,
        title,
        description,
        aiGenerator: aiGenerator === "Other" ? customAiGenerator : aiGenerator,
        prompt,
        tags,
        categoryId: parseInt(categoryId),
        contentType,
        thumbnail: finalThumbnail,
        videoUrl,
        imageUrl,
        embedCode: contentType === "embed" ? embedCode : null,
        resolution: "HD",
        duration,
        credits: 0,
      };

      console.log("Submitting payload:", payload);

      const submitRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(60000),
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!submitRes.ok) {
        const err = await submitRes.json();
        if (
          submitRes.status === 409 &&
          err.error === "Duplicate content detected"
        ) {
          return (
            showToast("Duplicate", "This content is a duplicate"),
            setIsUploading(false)
          );
        }
        throw new Error(err.error || "Upload failed");
      }

      toast({
        title: "Upload successful",
        description: "Content submitted and under review",
      });
      setTitle("");
      setAiGenerator("");
      setCustomAiGenerator("");
      setShowCustomAiGenerator(false);
      setPrompt("");
      setDescription("");
      setCategoryId("");
      setSelectedFile(null);
      onClose();
    } catch (err: any) {
      showToast("Upload error", err.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Upload New Media"
      className="bg-[#1a1a1a] border-gray-800 max-w-md"
    >
      <div>
        <div className="mb-4">
          <p className="text-sm text-gray-400">
            Share your AI-generated content with the DeepTube community
          </p>
          <p className="text-xs text-gray-400 mt-1">
            <strong>Rules:</strong>
            <br />
            1080p, Min 10sec, Max 15min & 1GB
            <br />
            PG-13 only
            <br />
            No deepfakes unless:
            <br />
            • Written permission
            <br />
            • Parody (non-commercial, marked AI/fake, not defamatory)
            <br />
            <button
              onClick={() => {
                const event = new CustomEvent("open-rules-modal");
                window.dispatchEvent(event);
              }}
              className="text-orange-500 hover:text-orange-400 underline bg-transparent border-none p-0 cursor-pointer"
            >
              Learn more here
            </button>
          </p>
        </div>

        <Tabs
          defaultValue="video"
          onValueChange={(value) =>
            setContentType(value as "video" | "image" | "embed")
          }
        >
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-[#272727] p-1 rounded-lg">
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
            <TabsTrigger
              value="embed"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:font-bold uppercase font-semibold rounded"
            >
              <i className="fas fa-link"></i>
              Embed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="video" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid w-full items-center gap-1.5">
                <label
                  htmlFor="video-media"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer bg-[#111] hover:bg-[#181818] transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <i className="fas fa-cloud-upload-alt text-3xl mb-3 text-primary"></i>
                    <p className="mb-2 text-sm text-center text-gray-300">
                      <span className="font-semibold text-white">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 text-center">
                      {selectedFile
                        ? selectedFile.name
                        : "MP4, WebM, or MOV (max. 750MB)"}
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
                        <SelectItem
                          key={category.id}
                          value={String(category.id)}
                        >
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
                <label
                  htmlFor="video-aiGenerator"
                  className="text-sm font-medium"
                >
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
                <label
                  htmlFor="video-description"
                  className="text-sm font-medium"
                >
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

              <div className="space-y-2">
                <label htmlFor="video-tags" className="text-sm font-medium">
                  Tags (Optional)
                </label>
                <Input
                  id="video-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Enter comma-separated tags (e.g. animation, landscape, sci-fi)"
                />
                <p className="text-xs text-gray-400">
                  Helps others discover your content
                </p>
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
                <label
                  htmlFor="image-media"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer bg-[#111] hover:bg-[#181818] transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <i className="fas fa-cloud-upload-alt text-3xl mb-3 text-primary"></i>
                    <p className="mb-2 text-sm text-center text-gray-300">
                      <span className="font-semibold text-white">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 text-center">
                      {selectedFile
                        ? selectedFile.name
                        : "JPG, PNG, GIF, or WebP (max. 25MB)"}
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
                        <SelectItem
                          key={category.id}
                          value={String(category.id)}
                        >
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
                <label
                  htmlFor="image-aiGenerator"
                  className="text-sm font-medium"
                >
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
                <label
                  htmlFor="image-description"
                  className="text-sm font-medium"
                >
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

              <div className="space-y-2">
                <label htmlFor="image-tags" className="text-sm font-medium">
                  Tags (Optional)
                </label>
                <Input
                  id="image-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Enter comma-separated tags (e.g. portrait, landscape, abstract)"
                />
                <p className="text-xs text-gray-400">
                  Helps others discover your content
                </p>
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
                    Only YouTube and Vimeo embed links are supported. Reddit
                    embeds are not supported.
                  </p>
                  <div className="flex space-x-2">
                    {/* Always show YouTube conversion button if embed code has youtube.com */}
                    {(originalYoutubeUrl ||
                      embedCode.includes("youtube.com") ||
                      embedCode.includes("youtu.be")) && (
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
                              console.log(
                                "Generated embed code:",
                                newEmbedCode
                              );
                              setEmbedCode(newEmbedCode);
                              // Update thumbnail
                              const thumbnailUrl =
                                getYoutubeThumbnailUrl(videoId);
                              console.log(
                                "Setting thumbnail URL:",
                                thumbnailUrl
                              );
                              setThumbnailUrl(thumbnailUrl);

                              // Toast success notification
                              toast({
                                title: "YouTube URL converted",
                                description:
                                  "URL has been converted to embed format",
                              });
                            }
                          } else {
                            toast({
                              title: "Invalid YouTube URL",
                              description:
                                "Could not extract video ID from the provided URL",
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
                        <SelectItem
                          key={category.id}
                          value={String(category.id)}
                        >
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
                <label
                  htmlFor="embed-aiGenerator"
                  className="text-sm font-medium"
                >
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
                <label
                  htmlFor="embed-description"
                  className="text-sm font-medium"
                >
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

              <div className="space-y-2">
                <label htmlFor="embed-tags" className="text-sm font-medium">
                  Tags (Optional)
                </label>
                <Input
                  id="embed-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Enter comma-separated tags (e.g. tutorial, gameplay, documentary)"
                />
                <p className="text-xs text-gray-400">
                  Helps others discover your content
                </p>
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

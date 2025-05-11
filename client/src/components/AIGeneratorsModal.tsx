import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface AIGeneratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Generator = {
  name: string;
  description: string;
  url: string;
};

const generators: Generator[] = [
  {
    name: "Runway",
    description: "Professional-grade video editing with advanced VFX and cinematic quality.",
    url: "https://runwayml.com"
  },
  {
    name: "Hailuo MiniMax",
    description: "High-quality, emotive videos for action scenes and storytelling.",
    url: "https://hailuoai.video"
  },
  {
    name: "Google Veo2",
    description: "Precise, 4K videos with realistic physics and dynamic camerawork.",
    url: "https://deepmind.google/technologies/veo"
  },
  {
    name: "Kling",
    description: "Realistic human/animal motion with high-resolution, precise control.",
    url: "https://klingai.com"
  },
  {
    name: "Vidu",
    description: "Cinematic storytelling with detailed prompt adherence.",
    url: "https://vidu.studio"
  },
  {
    name: "Luma (Dream Machine)",
    description: "Rapid, polished image-to-video with coherent animations.",
    url: "https://lumalabs.ai/dream-machine"
  },
  {
    name: "Open AI Sora",
    description: "Cinematic transitions for artistic, high-end videos.",
    url: "https://openai.com/sora"
  },
  {
    name: "Hedra",
    description: "Fast, character-driven videos with lip-sync and integrated AI tools.",
    url: "https://hedra.com"
  },
  {
    name: "Midjourney",
    description: "Outstanding photorealistic images with exceptional artistic quality and detail.",
    url: "https://www.midjourney.com"
  },
  {
    name: "Higgsfield",
    description: "Real-time interactive AI video generation with dynamic storytelling capabilities.",
    url: "https://higgsfield.ai"
  }
];

export default function AIGeneratorsModal({ isOpen, onClose }: AIGeneratorsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
            DeepTube's Favorite Content Generators
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-center pt-2">
            Explore these powerful AI tools to create amazing content for DeepTube
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {generators.map((generator) => (
            <div 
              key={generator.name} 
              className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg group"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-blue-400">{generator.name}</h3>
                <a 
                  href={generator.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
              <p className="text-gray-300 text-sm">{generator.description}</p>
              <div className="mt-3 flex justify-end">
                <a 
                  href={generator.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {generator.url.replace(/https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-6">
          <Button 
            onClick={onClose} 
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 hover:opacity-90"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

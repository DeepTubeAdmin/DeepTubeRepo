import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto bg-[#121212] text-white border border-gray-700">
        <DialogHeader className="pb-2 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold text-white">DeepTube Rules</DialogTitle>
            <Button 
              className="h-8 w-8 p-0 rounded-full" 
              variant="ghost" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4 text-sm text-gray-300">
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">1. Video Submission Requirements</h3>
            <p className="font-medium mb-2">Allowed:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>PG-13 rating</li>
              <li>1080p resolution</li>
              <li>Maximum 15 minutes</li>
              <li>Maximum 1GB file size</li>
              <li>Playable settings</li>
            </ul>
            
            <p className="font-medium mt-4 mb-2">Not Allowed:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tests</li>
              <li>Reposts</li>
              <li>Slideshows</li>
              <li>Deepfakes (see Rule #4 for exceptions)</li>
              <li>Clickbait</li>
              <li>Portfolios</li>
              <li>Stock footage</li>
              <li>API reselling</li>
              <li>Advertisements for apps, tools, videogames, events, or contests</li>
            </ul>
            
            <p className="font-medium mt-4 mb-2">Warning:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Reuploading rejected videos results in a permanent ban.</li>
              <li>All content is reviewed within 6 hours before being displayed.</li>
            </ul>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">2. Submission Guidelines</h3>
            <p className="font-medium mb-2">Requirements:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Video must be longer than 10 seconds</li>
              <li>No looping</li>
              <li>Title must include the video name and tools used</li>
              <li>Self-promotion and links are permitted only in the comments of your own video</li>
            </ul>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">3. No Copyrighted Music or Footage</h3>
            <p className="font-medium mb-2">Not Allowed:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Copyrighted music (use AI music, stock music, public domain, original, or no audio)</li>
              <li>Copyrighted footage (no film industry footage, logos, or video-to-video workflows from film industry content)</li>
            </ul>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">4. No Intellectual Property Abuse</h3>
            <p className="font-medium mb-2">Not Allowed:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Intellectual property (IP) you do not own, including film, TV, music, or gaming industry IP</li>
            </ul>
            
            <p className="font-medium mt-4 mb-2">Allowed Exception:</p>
            <p className="mb-2">IP can be used for comedy or parody if:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>It complies with parody laws</li>
              <li>Comedy resembles an SNL skit</li>
              <li>Parody looks completely different from the original</li>
            </ul>
            
            <p className="font-medium mt-4 mb-2">Likeness Rules:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Using anyone's likeness requires written permission or must follow parody laws (non-commercial, marked as AI/fake, not defamatory).</li>
            </ul>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">5. Content Guidelines</h3>
            <p className="font-medium mb-2">Requirements:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>PG-13 rating or under</li>
            </ul>
            
            <p className="font-medium mt-4 mb-2">Not Allowed:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Politics</li>
              <li>Religion</li>
              <li>Divisive content</li>
              <li>Hate content</li>
              <li>Rage baiting</li>
              <li>Self-harm videos</li>
              <li>Excessive gore</li>
              <li>Fetish videos</li>
              <li>Nudity</li>
              <li>Strong sexual content</li>
              <li>Abstract art</li>
              <li>Visualizers</li>
              <li>Anime waifu dancing videos</li>
              <li>TikTok dancing videos</li>
            </ul>
            
            <p className="font-medium mt-4 mb-2">Warning:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Posting political or hate content results in a permanent ban.</li>
            </ul>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">6. Comment Guidelines</h3>
            <p className="font-medium mb-2">Rules:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Conversations with arguments or potential arguments are removed to maintain a peaceful space.</li>
            </ul>
            
            <p className="font-medium mt-4 mb-2">Immediate Ban for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Political comments</li>
              <li>Religious comments</li>
              <li>Hate speech</li>
              <li>Anti-AI comments</li>
              <li>Disrespect towards artists or users</li>
              <li>Bullying</li>
              <li>Rage baiting</li>
              <li>Harassment</li>
              <li>Spam</li>
            </ul>
            
            <p className="font-medium mt-4 mb-2">Note:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>For hiring or collaboration inquiries, contact users directly—do not use the comments section.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="border-t border-gray-700 pt-4">
          <Button 
            onClick={onClose} 
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
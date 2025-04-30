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

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FAQModal({ isOpen, onClose }: FAQModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto bg-[#121212] text-white border border-gray-700">
        <DialogHeader className="pb-2 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold text-white">FAQ: Legal AI-Generated Content on DeepTube.co</DialogTitle>
            <Button 
              className="h-8 w-8 p-0 rounded-full" 
              variant="ghost" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-gray-300 mt-2">
            Welcome to DeepTube.co, your platform for sharing AI-generated videos in a safe, legal, and creative community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 text-sm text-gray-300">
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">1. What is AI-generated content?</h3>
            <p className="mb-2">
              AI-generated content refers to videos created or enhanced using artificial intelligence tools, such as text-to-video generators (e.g., Runway, Pika), AI avatars (e.g., Synthesia), or deepfake technology. On DeepTube.co, this includes videos in our entertainment categories.
            </p>
            <p>
              Examples include animated shorts, virtual music videos, or interactive stories created with AI. All content must comply with our strict guidelines, and <strong>nudity or explicit material is strictly forbidden</strong>.
            </p>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">2. What types of AI-generated content are legal to upload?</h3>
            <p className="mb-2">
              You may upload AI-generated videos that are original, consensual, and compliant with all applicable laws, including U.S. laws (e.g., DMCA, TAKE IT DOWN Act) and international regulations (e.g., EU AI Act, UK Online Safety Act). Legal content includes:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>AI Avatars</strong>: Videos featuring synthetic characters or avatars for storytelling, comedy, or music videos.</li>
              <li><strong>Text-to-Video Animations</strong>: Videos generated from text prompts, provided they don't depict real individuals without consent.</li>
              <li><strong>Voice-Over Videos</strong>: AI-generated voiceovers narrating stories using tools like Lyrebird AI.</li>
              <li><strong>Full-Body Synthetic Videos</strong>: Videos with entirely AI-generated characters, with proper consent if resembling real people.</li>
              <li><strong>Interactive Videos</strong>: Choose-your-own-adventure stories or gamified content created with tools like Elai.io.</li>
            </ul>
            <p className="mt-2">
              All content must be free of nudity, explicit material, or illegal elements (e.g., violence, hate speech). Creators must verify that their videos are original or use licensed/public domain assets.
            </p>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">3. Are deepfakes allowed on DeepTube.co?</h3>
            <p className="mb-2">
              Deepfakes—videos that use AI to manipulate or swap faces, voices, or likenesses—are only permitted if they are <strong>ethical, consensual, and clearly labeled as synthetic</strong>. Legal deepfakes include:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Consensual Parodies</strong>: Spoofs or humorous videos with explicit permission from depicted individuals.</li>
              <li><strong>Historical Reenactments</strong>: Videos recreating historical figures, provided they are fictionalized and labeled as AI-generated.</li>
              <li><strong>Fictional Characters</strong>: Deepfakes creating entirely fictional personas with no real-person likenesses involved.</li>
            </ul>
            <p className="mt-2">
              <strong>Prohibited Deepfakes</strong>: Non-consensual deepfakes, including those depicting real individuals without their explicit written consent, are strictly forbidden. Nudity or sexually explicit deepfakes are also banned.
            </p>
            <p>
              Creators must submit metadata or affidavits confirming consent for any deepfake depicting a real person's likeness, per our Content Guidelines.
            </p>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">4. Why is nudity forbidden on DeepTube.co?</h3>
            <p>
              Nudity, pornography, or sexually explicit content is strictly prohibited to maintain a safe, inclusive, and legal platform for all users. This aligns with our 18+ age restriction and compliance with laws like the U.S. TAKE IT DOWN Act and UK Online Safety Act, which prioritize preventing non-consensual or harmful material.
            </p>
            <p>
              Any video containing nudity or explicit material will be removed, and the uploader's account may be suspended or banned, as outlined in our Terms of Use.
            </p>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">5. What laws govern AI-generated content?</h3>
            <p className="mb-2">
              We comply with strict legal standards to ensure all content is lawful, including:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>U.S. DMCA</strong>: Protects against copyright infringement.</li>
              <li><strong>TAKE IT DOWN Act (2024)</strong>: Mandates removal of non-consensual deepfakes or intimate content.</li>
              <li><strong>EU AI Act</strong>: Requires labeling of AI-generated content to prevent deception.</li>
              <li><strong>UK Online Safety Act</strong>: Obliges us to prevent illegal content and implement age verification.</li>
              <li><strong>State Revenge Porn Laws</strong>: Most U.S. states criminalize non-consensual intimate content.</li>
            </ul>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">6. How do I ensure my AI-generated content is legal?</h3>
            <p className="mb-2">
              To upload legal content, follow these guidelines:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Obtain Consent</strong>: For deepfakes or likenesses of real people, secure explicit written consent.</li>
              <li><strong>Label AI Content</strong>: Clearly mark AI-generated videos as synthetic in the title or description.</li>
              <li><strong>Use Licensed Assets</strong>: Ensure music, images, or other elements are original, licensed, or public domain.</li>
              <li><strong>Avoid Nudity</strong>: Do not include nudity, explicit content, or material that could be deemed offensive.</li>
              <li><strong>Verify Fictional Content</strong>: Ensure AI-generated characters don't mimic real individuals without permission.</li>
            </ul>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">7. What happens if I upload illegal AI-generated content?</h3>
            <p className="mb-2">
              Uploading illegal content, such as non-consensual deepfakes, nudity, or copyrighted material, violates our Terms of Use. Consequences include:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Immediate removal of the content.</li>
              <li>Suspension or termination of your account.</li>
              <li>Reporting to authorities if the content involves serious violations.</li>
              <li>Potential legal action from affected parties or regulators.</li>
            </ul>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">8. Can I upload AI-generated content depicting real people?</h3>
            <p>
              Only if you have <strong>explicit written consent</strong> from the depicted individual. For example, a deepfake parody of a celebrity is allowed if the celebrity has provided permission and the video is labeled as AI-generated. Without consent, such content is prohibited, especially if it includes nudity or defamatory elements.
            </p>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">9. How does DeepTube.co prevent illegal content?</h3>
            <p className="mb-2">
              We take proactive steps to ensure a safe platform:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>AI Moderation</strong>: Tools to identify non-consensual or illegal content.</li>
              <li><strong>Human Moderation</strong>: Trained moderators review flagged videos for compliance.</li>
              <li><strong>User Reporting</strong>: A "Report" button allows users to flag illegal content.</li>
              <li><strong>Consent Verification</strong>: Creators must provide metadata for deepfakes depicting real people.</li>
            </ul>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">10. Where can I learn more about creating legal AI content?</h3>
            <p className="mb-2">
              We provide resources to help you create ethical AI-generated videos:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Creator Tutorials</strong>: Available on our Help Center, covering various AI tools.</li>
              <li><strong>Content Guidelines</strong>: Review our guidelines for detailed rules.</li>
              <li><strong>Support Team</strong>: Contact support@deeptube.co for guidance on specific content.</li>
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
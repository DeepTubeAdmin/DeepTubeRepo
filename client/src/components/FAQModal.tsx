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
            <DialogTitle className="text-xl font-bold text-white">FAQ: Legal AI-Generated Content on DeepTubeAI.com</DialogTitle>
            <Button 
              className="h-8 w-8 p-0 rounded-full" 
              variant="ghost" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-gray-300 mt-2">
            Welcome to DeepTubeAI.com, your platform for sharing AI-generated videos in a safe, legal, and creative community. Below, we answer common questions about what types of AI-generated content are allowed, how to ensure your videos comply with the law, and why certain restrictions (like the ban on nudity) are in place.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 text-sm text-gray-300">
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">1. What is AI-generated content?</h3>
            <p className="mb-2">
              AI-generated content refers to videos created or enhanced using artificial intelligence tools. On DeepTubeAI.com, this includes videos in our entertainment categories, such as:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Animated shorts</li>
              <li>Virtual music videos</li>
              <li>Interactive stories</li>
            </ul>
            <p className="mt-2 mb-2">
              Examples of AI tools include:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Text-to-video generators (e.g., Runway, Kling)</li>
              <li>AI avatars (e.g., Synthesia)</li>
              <li>Deepfake technology (with restrictions)</li>
            </ul>
            <p className="mt-2">
              All content must comply with our strict guidelines, and nudity or explicit material is strictly forbidden.
            </p>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">2. What types of AI-generated content are legal to upload?</h3>
            <p className="mb-2">
              You may upload AI-generated videos that are original, consensual, and compliant with all applicable laws, including:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>U.S. laws (e.g., DMCA, TAKE IT DOWN Act)</li>
              <li>International regulations (e.g., EU AI Act, UK Online Safety Act)</li>
            </ul>
            <p className="mt-2 mb-2">
              Legal content includes:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>AI Avatars</strong>: Videos featuring synthetic characters for storytelling, comedy, or music.</li>
              <li><strong>Text-to-Video Animations</strong>: Videos generated from text prompts, provided they don't depict real individuals without consent.</li>
              <li><strong>Voice-Over Videos</strong>: AI-generated voiceovers (e.g., Lyrebird AI) narrating stories.</li>
              <li><strong>Full-Body Synthetic Videos</strong>: Videos with entirely AI-generated characters, with consent if resembling real people.</li>
              <li><strong>Interactive Videos</strong>: Choose-your-own-adventure stories or gamified content (e.g., Elai.io).</li>
            </ul>
            <p className="mt-2">
              All content must be free of nudity, explicit material, or illegal elements (e.g., violence, hate speech). Creators must verify that their videos are original or use licensed/public domain assets.
            </p>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">3. Are deepfakes allowed on DeepTubeAI.com?</h3>
            <p className="mb-2">
              Deepfake videos are allowed under specific conditions. We permit deepfakes that are:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Used for parody, satire, or artistic expression, provided they do not defame or harm the subject's reputation.</li>
              <li>Created for educational or research purposes, such as demonstrating deepfake technology.</li>
              <li>Made with the explicit consent of the subject.</li>
            </ul>
            <p className="mt-2 mb-2">
              However, we do not allow deepfakes that:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Portray someone in a false and damaging light (e.g., defamatory or libelous content).</li>
              <li>Invade privacy or are used to harass, bully, or intimidate.</li>
              <li>Are used for commercial exploitation without the subject's permission.</li>
            </ul>
            <p className="mt-2 mb-2">
              <strong>What should I do if I want to upload a deepfake video?</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Obtain explicit consent from the subject (if applicable).</li>
              <li>Clearly label the video as a deepfake.</li>
              <li>Ensure it complies with our community guidelines and applicable laws.</li>
            </ul>
            <p className="mt-2">
              <strong>What happens if I upload a deepfake video that violates these guidelines?</strong><br/>
              DeepTubeAI.com reserves the right to remove any content that violates our policies or the law. Users who repeatedly upload prohibited content may face account suspension or termination.
            </p>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">4. Why is nudity forbidden on DeepTubeAI.com?</h3>
            <p className="mb-2">
              Nudity, pornography, or sexually explicit content is strictly prohibited to maintain a safe, inclusive, and legal platform for all users. This aligns with:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Our 18+ age restriction.</li>
              <li>Compliance with laws like the U.S. TAKE IT DOWN Act and UK Online Safety Act, which prioritize preventing non-consensual or harmful material.</li>
            </ul>
            <p className="mt-2">
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
              Uploading illegal content (e.g., non-consensual deepfakes, nudity, or copyrighted material) violates our Terms of Use. Consequences include:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Immediate removal of the content.</li>
              <li>Suspension or termination of your account.</li>
              <li>Reporting to authorities if the content involves serious violations.</li>
              <li>Potential legal action from affected parties or regulators.</li>
            </ul>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">8. How does DeepTubeAI.com prevent illegal content?</h3>
            <p className="mb-2">
              We take proactive steps to ensure a safe platform:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Human Moderation</strong>: Trained moderators review flagged videos for compliance.</li>
              <li><strong>User Reporting</strong>: A "Report" button allows users to flag illegal content.</li>
            </ul>
          </div>

          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">9. Where can I learn more about creating legal AI content?</h3>
            <p className="mb-2">
              We provide resources to help you create ethical AI-generated videos:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Content Guidelines</strong>: Review our guidelines for detailed rules.</li>
              <li><strong>Support Team</strong>: Contact support@deeptube.co for guidance on specific content.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <p className="text-sm italic">
              Disclaimer: This FAQ is for informational purposes only and does not constitute legal advice. Users are responsible for ensuring their content complies with all applicable laws. For specific legal questions, consult a qualified attorney.
            </p>
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
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

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsOfServiceModal({ isOpen, onClose }: TermsOfServiceModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto bg-[#121212] text-white border border-gray-700">
        <DialogHeader className="pb-2 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold text-white">Terms of Service for DeepTubeAI.com</DialogTitle>
            <Button 
              className="h-8 w-8 p-0 rounded-full" 
              variant="ghost" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-gray-300 mt-2">
            <span><strong>Last Updated</strong>: May 1, 2025</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 text-sm text-gray-300">
          <p>
            Welcome to DeepTubeAI.com, a platform operated by DeepTube LLC ("DeepTube," "we," "us," or "our") for hosting and sharing AI-generated video content. By accessing or using DeepTubeAI.com (the "Service"), including uploading, viewing, or sharing content, you ("User," "you," or "your") agree to be bound by these Terms of Service ("Terms"). If you do not agree, you must not use the Service.
          </p>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">1. Acceptance of Terms</h3>
            <p>
              By creating an account, uploading content, or accessing the Service, you confirm that you have read, understood, and agree to these Terms, our Privacy Policy, and any additional guidelines posted on DeepTubeAI.com. These Terms form a legally binding agreement between you and DeepTube LLC.
            </p>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">2. Eligibility</h3>
            <p>
              You must be at least 18 years old to use the Service. By accessing DeepTubeAI.com, you represent and warrant that you are 18 or older and have the legal capacity to enter into these Terms.
            </p>
            <p>
              DeepTubeAI.com is not intended for users under 18, and we comply with the Children's Online Privacy Protection Act (COPPA) by prohibiting access to minors. If we discover a user is under 18, their account and content will be terminated immediately.
            </p>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">3. User Accounts</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Registration</strong>: To upload content or access certain features, you must create an account with accurate information (e.g., email, username). You are responsible for maintaining the confidentiality of your account credentials and all activities under your account.</li>
              <li><strong>Account Security</strong>: Notify us immediately at support@deeptube.co if you suspect unauthorized access to your account.</li>
              <li><strong>Termination</strong>: We reserve the right to suspend or terminate your account at our sole discretion, including for violations of these Terms, illegal activity, or unethical behavior.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">4. Content Ownership and Licensing</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Transfer of Ownership</strong>: By uploading content to DeepTubeAI.com, including but not limited to videos, images, text, or metadata (collectively, "Content"), you irrevocably transfer all ownership rights, including intellectual property rights (e.g., copyright, trademark), to DeepTube LLC. Upon upload, DeepTube LLC becomes the sole owner of the Content, and you waive any claim to ownership or control over the Content.</li>
              <li><strong>Monetization Rights</strong>: You grant DeepTube LLC an exclusive, worldwide, perpetual, royalty-free license to use, reproduce, distribute, modify, display, perform, and monetize the Content in any manner, including through advertising, subscriptions, or licensing, without any obligation to share profits or revenue with you.</li>
              <li><strong>User Representations</strong>: You represent and warrant that:
                <ul className="list-disc pl-5 space-y-1">
                  <li>You own or have obtained all necessary rights, consents, and permissions to upload the Content and transfer ownership to DeepTube LLC.</li>
                  <li>The Content does not infringe on any third-party rights (e.g., copyright, privacy, publicity) or violate any laws.</li>
                  <li>For AI-generated Content (e.g., deepfakes), you have obtained explicit consent from any identifiable individuals depicted, in compliance with applicable laws (e.g., California's AB 602, New York's S1042A).</li>
                </ul>
              </li>
              <li><strong>Waiver of Moral Rights</strong>: You waive any moral rights in the Content, including the right to attribution or to object to modifications, to the fullest extent permitted by law.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">5. Content Guidelines</h3>
            <p>
              DeepTubeAI.com is committed to hosting ethical, legal, and nudity-free AI-generated content. You agree to comply with the following guidelines when uploading Content:
            </p>
            <h4 className="text-md font-semibold text-orange-400 mb-1 mt-2">Prohibited Content:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Illegal Content</strong>: Content that violates any federal, state, or local laws, including but not limited to non-consensual intimate imagery (per the Take It Down Act, 2025), election-related deepfakes (per California AB 2655), or defamatory material.</li>
              <li><strong>Explicit Content</strong>: Pornography, nudity, or sexually explicit material, including AI-generated deepfakes depicting such content.</li>
              <li><strong>Harmful Content</strong>: Content promoting violence, hate speech, discrimination, or harassment based on race, gender, religion, or other protected characteristics.</li>
              <li><strong>Misleading Content</strong>: Unlabeled deepfakes or AI-generated Content intended to deceive, unless clearly marked as parody or satire (per California AB 730).</li>
              <li><strong>Infringing Content</strong>: Content that violates third-party intellectual property, privacy, or publicity rights.</li>
            </ul>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>AI Labeling</strong>: All AI-generated Content must be clearly labeled as such (e.g., "AI-Generated Comedy Video") in the video, description, or metadata.</li>
              <li><strong>Consent</strong>: For deepfakes or Content depicting identifiable individuals, you must provide verifiable consent documentation upon request, ensuring compliance with privacy and publicity laws.</li>
              <li><strong>Moderation</strong>: DeepTube LLC employs automated and manual moderation, including AI-based deepfake detection, to enforce these guidelines. We reserve the right to remove, block, or report Content at our sole discretion.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">6. User Responsibilities</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Compliance</strong>: You are solely responsible for ensuring your Content complies with these Terms, applicable laws, and DeepTubeAI.com's Content Guidelines.</li>
              <li><strong>Reporting Violations</strong>: If you encounter Content that violates these Terms, report it immediately to support@deeptube.co using the "Report" feature. DeepTube LLC will investigate and remove non-compliant Content within 24–48 hours, per the Take It Down Act.</li>
              <li><strong>Accuracy</strong>: You must not misrepresent the nature, origin, or consent status of your Content (e.g., claiming a deepfake is real).</li>
              <li><strong>Liability</strong>: You agree to indemnify and hold DeepTube LLC harmless from any claims, damages, or liabilities arising from your Content or use of the Service.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">7. Intellectual Property and DMCA Compliance</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>DeepTube's Ownership</strong>: All Content uploaded to DeepTubeAI.com becomes the property of DeepTube LLC, as outlined in Section 4. The Service itself, including its design, code, and branding, is owned by DeepTube LLC and protected by copyright, trademark, and other laws.</li>
              <li><strong>DMCA Policy</strong>: DeepTube LLC complies with the Digital Millennium Copyright Act (DMCA). If you believe Content infringes your copyright, submit a takedown notice to support@deeptube.co with:
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your contact information and signature.</li>
                  <li>Identification of the infringed work and the infringing Content.</li>
                  <li>A statement of good faith belief and accuracy.</li>
                </ul>
                We will remove infringing Content and may terminate repeat infringers' accounts.
              </li>
              <li><strong>Counter-Notices</strong>: If your Content is removed under a DMCA notice, you may submit a counter-notice to support@deeptube.co, subject to legal review.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">8. Prohibited Activities</h3>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Upload or share illegal, harmful, or non-compliant Content.</li>
              <li>Use bots, scripts, or automated tools to manipulate the Service (e.g., fake views, uploads).</li>
              <li>Attempt to hack, reverse-engineer, or disrupt DeepTubeAI.com's systems.</li>
              <li>Impersonate others or misrepresent Content ownership or consent.</li>
              <li>Engage in spamming, phishing, or other malicious activities.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">9. Termination</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>By DeepTube</strong>: We may suspend or terminate your account or access to the Service at our sole discretion, with or without notice, for violations of these Terms, illegal activity, or unethical behavior (e.g., uploading non-consensual deepfakes).</li>
              <li><strong>By User</strong>: You may terminate your account by contacting support@deeptube.co. Upon termination, your Content remains owned by DeepTube LLC, as per Section 4.</li>
              <li><strong>Effect of Termination</strong>: Termination does not relieve you of obligations (e.g., indemnification) or DeepTube LLC's rights to your Content.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">10. Disclaimers and Limitation of Liability</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>As-Is Service</strong>: DeepTubeAI.com is provided "as is" without warranties of any kind, express or implied, including fitness for a particular purpose or non-infringement.</li>
              <li><strong>No Liability for Content</strong>: DeepTube LLC is not liable for any Content uploaded by Users, including its accuracy, legality, or impact. You use the Service at your own risk.</li>
              <li><strong>Limitation of Liability</strong>: To the fullest extent permitted by law, DeepTube LLC's total liability for any claims arising from the Service shall not exceed $100. We are not liable for indirect, consequential, or punitive damages.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">11. Indemnification</h3>
            <p>
              You agree to indemnify, defend, and hold harmless DeepTube LLC, its affiliates, officers, and employees from any claims, damages, or liabilities (including legal fees) arising from your Content, use of the Service, or violation of these Terms or applicable laws.
            </p>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">12. Governing Law and Dispute Resolution</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Governing Law</strong>: These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict of law principles.</li>
              <li><strong>Dispute Resolution</strong>: Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in Wilmington, Delaware, under the rules of the American Arbitration Association (AAA). You waive the right to a class action or jury trial.</li>
              <li><strong>Exceptions</strong>: Claims involving intellectual property or injunctive relief may be brought in Delaware state or federal courts.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">13. Changes to Terms</h3>
            <p>
              DeepTube LLC may update these Terms at any time by posting the revised version on DeepTubeAI.com. Continued use of the Service after changes constitutes acceptance. We will notify Users of material changes via email or site announcements.
            </p>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">14. Contact Information</h3>
            <p>
              For questions, reports, or concerns about these Terms or the Service, contact:<br />
              Email: support@deeptube.co<br />
              Address: DeepTube LLC, [Insert Registered Address], Wilmington, DE 19801, USA
            </p>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">15. Miscellaneous</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Entire Agreement</strong>: These Terms, the Privacy Policy, and any posted guidelines constitute the entire agreement between you and DeepTube LLC.</li>
              <li><strong>Severability</strong>: If any provision is found unenforceable, the remaining provisions remain in effect.</li>
              <li><strong>No Waiver</strong>: Our failure to enforce any right does not waive that right.</li>
              <li><strong>Assignment</strong>: DeepTube LLC may assign these Terms to affiliates or successors. You may not assign these Terms without our consent.</li>
            </ul>
          </div>
          
          <p className="mt-6">
            By using DeepTubeAI.com, you acknowledge that you are over 18, agree to transfer Content ownership to DeepTube LLC, and allow us to monetize Content without sharing profits. Thank you for helping us maintain an ethical, legal, and creative community.
          </p>
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
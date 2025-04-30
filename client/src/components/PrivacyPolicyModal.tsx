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

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto bg-[#121212] text-white border border-gray-700">
        <DialogHeader className="pb-2 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold text-white">Privacy Policy</DialogTitle>
            <Button 
              className="h-8 w-8 p-0 rounded-full" 
              variant="ghost" 
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-gray-300 mt-2">
            <span><strong>Effective Date</strong>: April 28, 2025</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 text-sm text-gray-300">
          <p>
            DeepTube.co (the "Platform"), operated by DeepTube LLC ("we," "us," or "our"), is a video hosting and marketplace service for AI-generated videos. We are committed to protecting your privacy and providing transparency about how we collect, use, share, and protect your personal information. This Privacy Policy explains our practices and your choices regarding your data when you use DeepTube.co, including browsing, uploading, viewing, or monetizing videos.
          </p>
          
          <p>
            By using the Platform, you agree to this Privacy Policy. If you do not agree, please do not use the Platform.
          </p>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">1. Information We Collect</h3>
            <p>
              We collect information to provide, improve, and personalize the Platform. The types of information we collect include:
            </p>
            
            <h4 className="font-medium text-white mt-4 mb-2">a. Information You Provide</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Information</strong>: When you create an account, we collect your name, email address, password, and optional details like phone number or profile picture. If you monetize content, we may collect payment information (e.g., bank account or PayPal details) and tax-related data (e.g., Taxpayer ID).</li>
              <li><strong>User Content</strong>: Videos, thumbnails, titles, descriptions, and comments you upload or post. For AI-generated videos, this may include metadata about the content (e.g., generation tool, settings).</li>
              <li><strong>Communications</strong>: Information you provide when contacting us (e.g., via support@deeptube.co), including feedback, inquiries, or DMCA notices.</li>
            </ul>
            
            <h4 className="font-medium text-white mt-4 mb-2">b. Information We Collect Automatically</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Usage Data</strong>: Details about how you interact with the Platform, such as pages visited, videos watched, search queries, clicks, and time spent. We collect device information (e.g., IP address, browser type, operating system) and cookies or similar technologies to track activity.</li>
              <li><strong>Analytics</strong>: Metrics like video performance (e.g., views, watch time, engagement) to help creators optimize content and improve the Platform.</li>
              <li><strong>Location Data</strong>: Approximate location based on IP address or device settings to tailor content or comply with regional laws. We do not collect precise geolocation without consent.</li>
            </ul>
            
            <h4 className="font-medium text-white mt-4 mb-2">c. Information from Third Parties</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Social Media</strong>: If you sign up or log in via third-party services (e.g., Google, Facebook), we collect information like your name, email, or profile picture, subject to their privacy policies.</li>
              <li><strong>Partners</strong>: Data from payment processors (e.g., Stripe) for monetization or analytics providers to improve Platform performance.</li>
              <li><strong>Publicly Available Data</strong>: Information from public sources (e.g., social media profiles) if you link them to your DeepTube.co account.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">2. How We Use Your Information</h3>
            <p>
              We use your information to operate, enhance, and personalize the Platform, including:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Providing Services</strong>: Enable account creation, video uploads, playback, commenting, and monetization.</li>
              <li><strong>Personalization</strong>: Recommend videos, tailor search results, or display relevant ads based on your activity and preferences.</li>
              <li><strong>Analytics and Improvement</strong>: Analyze usage trends, video performance, and feedback to optimize Platform features and content discoverability.</li>
              <li><strong>Security</strong>: Detect and prevent fraud, abuse, or unauthorized access (e.g., monitoring for prohibited content like non-consensual deepfakes).</li>
              <li><strong>Communication</strong>: Send service-related notices (e.g., account updates, policy changes) or respond to your inquiries.</li>
              <li><strong>Legal Compliance</strong>: Comply with laws, such as GDPR, CCPA, or DMCA, including processing data for tax reporting or content removal requests.</li>
              <li><strong>Advertising</strong>: Deliver targeted ads (if applicable) based on your interests, unless you opt out.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">3. How We Share Your Information</h3>
            <p>
              We do not sell your personal information. We may share information in the following cases:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>With Your Consent</strong>: When you explicitly agree, such as sharing your profile with other users or linking content to social media.</li>
              <li><strong>Service Providers</strong>: With trusted third parties (e.g., hosting providers like Vimeo, payment processors like Stripe) who assist with Platform operations, bound by confidentiality agreements.</li>
              <li><strong>Other Users</strong>: Publicly visible information, like your username, profile picture, videos, or comments, unless you set them to private.</li>
              <li><strong>Legal Obligations</strong>: To comply with laws, court orders, or government requests (e.g., DMCA takedowns, tax audits).</li>
              <li><strong>Safety and Rights</strong>: To protect the Platform, users, or the public from harm, fraud, or illegal activity, such as investigating prohibited content.</li>
              <li><strong>Business Transfers</strong>: In the event of a merger, acquisition, or sale, your information may be transferred, with notice to you.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">4. Your Choices and Rights</h3>
            <p>
              You have control over your information and can exercise the following rights, subject to applicable laws:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Access and Update</strong>: View or edit your account information via your profile settings.</li>
              <li><strong>Delete</strong>: Request deletion of your account or specific content by contacting support@deeptube.co. Note that some data may be retained for legal or archival purposes.</li>
              <li><strong>Opt-Out</strong>: Disable personalized ads or certain cookies via Platform settings or your browser. You can also opt out of marketing emails by clicking "unsubscribe."</li>
              <li><strong>Data Portability</strong>: Request a copy of your personal data in a structured format (e.g., for GDPR compliance).</li>
              <li><strong>Restrict Processing</strong>: Limit how we use your data, where permitted by law (e.g., under GDPR).</li>
              <li><strong>CCPA Rights</strong>: If you're a California resident, you can request disclosure of data collected, sold, or shared, and opt out of data sales (we do not sell data).</li>
              <li><strong>GDPR Rights</strong>: If in the EU/EEA, you have additional rights to object to processing or lodge a complaint with a supervisory authority.</li>
            </ul>
            
            <p className="mt-2">
              To exercise these rights, contact us at support@deeptube.co. We will respond within 30 days (or 45 for CCPA requests), subject to verification.
            </p>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">5. Cookies and Tracking Technologies</h3>
            <p>
              We use cookies, pixels, and similar technologies to enhance your experience, analyze usage, and deliver ads. Types include:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Essential Cookies</strong>: Required for Platform functionality (e.g., login, video playback).</li>
              <li><strong>Analytics Cookies</strong>: Track usage to improve features (e.g., Google Analytics).</li>
              <li><strong>Advertising Cookies</strong>: Enable personalized ads (optional, can be disabled).</li>
            </ul>
            
            <p className="mt-2">
              You can manage cookies via your browser settings or our cookie consent tool. Note that disabling cookies may affect Platform performance.
            </p>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">6. Data Security</h3>
            <p>
              We implement industry-standard measures to protect your data, including:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Encryption (e.g., HTTPS, TLS) for data in transit and at rest.</li>
              <li>Access controls and authentication to prevent unauthorized access.</li>
              <li>Regular security audits and monitoring for threats.</li>
            </ul>
            
            <p className="mt-2">
              Despite these efforts, no system is 100% secure. Notify us immediately at support@deeptube.co if you suspect a breach.
            </p>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">7. Data Retention</h3>
            <p>
              We retain your information as long as your account is active or as needed to provide services, comply with laws, or resolve disputes. For example:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account data is kept until you delete your account, then anonymized or deleted within 90 days, unless required by law (e.g., tax records).</li>
              <li>User Content (e.g., videos) is retained until removed by you or us, with backups deleted per our retention schedule.</li>
              <li>Usage data is anonymized after 12 months unless needed for analytics or legal purposes.</li>
            </ul>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">8. International Data Transfers</h3>
            <p>
              DeepTube.co operates globally, and your data may be processed in the United States or other countries. We comply with GDPR and other laws for cross-border transfers, using Standard Contractual Clauses or equivalent safeguards. By using the Platform, you consent to such transfers.
            </p>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">9. Children's Privacy</h3>
            <p>
              The Platform is not intended for users under 18. We do not knowingly collect data from children under 13 (or 16 in the EU). If you believe we have such data, contact us at support@deeptube.co, and we will delete it promptly.
            </p>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">10. Third-Party Links and Services</h3>
            <p>
              The Platform may include links to third-party sites (e.g., social media, payment processors) or integrate with services (e.g., Vimeo for hosting). These are governed by their own privacy policies, and we are not responsible for their practices. Review their terms before engaging.
            </p>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">11. Updates to This Policy</h3>
            <p>
              We may update this Privacy Policy to reflect changes in our practices or legal requirements. We will notify you via email or Platform notice at least 7 days before significant changes take effect. Your continued use of DeepTube.co constitutes acceptance of the updated policy.
            </p>
          </div>
          
          <div className="faq-section">
            <h3 className="text-lg font-semibold text-orange-500 mb-2">12. Contact Us</h3>
            <p>
              For questions, concerns, or to exercise your rights, contact our Data Protection Officer at:<br />
              DeepTube LLC<br />
              Email: support@deeptube.co
            </p>
            
            <p className="mt-2">
              If you're in the EU, you can also contact our EU Representative. For unresolved concerns, you may contact your local data protection authority (e.g., under GDPR).
            </p>
          </div>
          
          <p className="mt-2">
            Thank you for trusting DeepTube.co with your data. We are committed to keeping your information safe and respecting your privacy.
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
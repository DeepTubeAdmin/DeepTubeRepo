import Layout from "@/components/Layout";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";

export default function TermsOfService() {
  return (
    <Layout showHeader={true} showFooter={false}>
      <SEO 
        title="Terms of Service | DeepTube: Ethical AI Media Hub"
        description="DeepTubeAI.com: Where innovative creators share responsible AI-powered media. Review our terms regarding content ownership, acceptable use, and platform policies."
        canonicalUrl="https://deeptube.co/terms-of-service"
        ogType="article"
        keywords="AI media hosting, Responsible AI media, Video hosting platform, DeepTube, AI-powered video, Trusted video content, Creator media platform, AI content sharing"
      />
      <div className="min-h-screen bg-[#0f0f0f] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-center">Terms of Service for DeepTubeAI.com</h1>
            
            <p className="text-sm text-gray-400 mb-6 text-center">
              <strong>Last Updated</strong>: May 1, 2025
            </p>
            
            <div className="space-y-6 text-sm text-gray-300">
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
                  You must be at least 18 years old to use the Service. By accessing DeepTube.co, you represent and warrant that you are 18 or older and have the legal capacity to enter into these Terms.
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
                  <li><strong>License to DeepTube</strong>: You grant DeepTube LLC a perpetual, worldwide, royalty-free, non-exclusive, sublicensable license to use, reproduce, modify, distribute, display, and monetize your Content in any format or medium, for any purpose, including commercial purposes.</li>
                  <li><strong>No Revenue Sharing</strong>: DeepTube LLC retains 100% of revenue generated from your Content, including advertising, subscriptions, or direct sales. You are not entitled to any portion of revenue or profits derived from your Content.</li>
                  <li><strong>User Representations</strong>: You represent that you own or have the necessary rights to upload the Content and that it does not infringe on any third-party rights.</li>
                </ul>
              </div>

              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">5. Prohibited Content and Conduct</h3>
                <p className="font-medium mb-2">You may not upload, share, or engage in:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Content that violates local, state, or federal laws</li>
                  <li>Sexually explicit, pornographic, or adult content</li>
                  <li>Content depicting violence, hate speech, or harassment</li>
                  <li>Copyrighted material without proper authorization</li>
                  <li>Spam, clickbait, or misleading content</li>
                  <li>Malware, viruses, or harmful software</li>
                  <li>Content that promotes illegal activities or substances</li>
                  <li>Impersonation of others or false representation</li>
                </ul>
              </div>

              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">6. Content Moderation</h3>
                <p>
                  DeepTube LLC reserves the right to review, modify, or remove any Content at our sole discretion, without notice. We may use automated systems and human reviewers to enforce these Terms. Content that violates our guidelines will be removed, and repeat offenders may face account suspension or termination.
                </p>
              </div>

              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">7. Privacy Policy</h3>
                <p>
                  Your use of the Service is also governed by our Privacy Policy, which explains how we collect, use, and protect your personal information. By using the Service, you consent to the collection and use of your information as described in the Privacy Policy.
                </p>
              </div>

              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">8. Disclaimers and Limitation of Liability</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>No Warranties</strong>: The Service is provided "as is" without warranties of any kind, express or implied.</li>
                  <li><strong>Limitation of Liability</strong>: DeepTube LLC's liability is limited to the maximum extent permitted by law. We are not liable for any indirect, incidental, or consequential damages.</li>
                  <li><strong>User Responsibility</strong>: You use the Service at your own risk and are responsible for any consequences arising from your use.</li>
                </ul>
              </div>

              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">9. Indemnification</h3>
                <p>
                  You agree to indemnify and hold harmless DeepTube LLC, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service, your Content, or your violation of these Terms.
                </p>
              </div>

              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">10. Termination</h3>
                <p>
                  We may suspend or terminate your account and access to the Service at any time, with or without cause, and with or without notice. Upon termination, your right to use the Service ceases immediately, but these Terms remain in effect regarding Content you previously uploaded.
                </p>
              </div>

              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">11. Changes to Terms</h3>
                <p>
                  We reserve the right to modify these Terms at any time. Changes will be posted on this page with an updated "Last Updated" date. Your continued use of the Service after changes are posted constitutes acceptance of the revised Terms.
                </p>
              </div>

              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">12. Governing Law and Dispute Resolution</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Governing Law</strong>: These Terms are governed by the laws of [State/Country], without regard to conflict of law principles.</li>
                  <li><strong>Dispute Resolution</strong>: Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration in accordance with the rules of [Arbitration Organization].</li>
                  <li><strong>Class Action Waiver</strong>: You waive the right to participate in class action lawsuits against DeepTube LLC.</li>
                </ul>
              </div>

              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">13. Contact Information</h3>
                <p>
                  For questions about these Terms or the Service, contact us at:
                </p>
                <p>
                  DeepTube LLC<br />
                  Email: support@deeptube.co<br />
                  Website: DeepTubeAI.com
                </p>
              </div>

              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">14. Miscellaneous</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Entire Agreement</strong>: These Terms, the Privacy Policy, and any posted guidelines constitute the entire agreement between you and DeepTube LLC.</li>
                  <li><strong>Severability</strong>: If any provision is found unenforceable, the remaining provisions remain in effect.</li>
                  <li><strong>No Waiver</strong>: Our failure to enforce any right does not waive that right.</li>
                  <li><strong>Assignment</strong>: DeepTube LLC may assign these Terms to affiliates or successors. You may not assign these Terms without our consent.</li>
                </ul>
              </div>

              <p className="mt-8">
                By using DeepTubeAI.com, you acknowledge that you are over 18, agree to transfer Content ownership to DeepTube LLC, and allow us to monetize Content without sharing profits. Thank you for helping us maintain an ethical, legal, and creative community.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add MiniFooter */}
      <MiniFooter />
    </Layout>
  );
}
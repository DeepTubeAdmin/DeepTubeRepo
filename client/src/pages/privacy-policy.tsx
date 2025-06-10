
import Layout from "@/components/Layout";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <Layout showHeader={true} showFooter={false}>
      <SEO 
        title="Privacy Policy | DeepTube: Ethical AI Media Hub"
        description="DeepTubeAI.com privacy policy: Learn how we protect your data, respect your privacy, and ensure secure handling of personal information on our AI media platform."
        canonicalUrl="https://deeptube.co/privacy-policy"
        ogType="article"
        keywords="Privacy policy, Data protection, AI media platform, DeepTube privacy, User data security, GDPR compliance, Data handling"
      />
      <div className="min-h-screen bg-[#0f0f0f] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-center">Privacy Policy for DeepTubeAI</h1>
            
            <p className="text-sm text-gray-400 mb-6 text-center">
              <strong>Effective Date</strong>: June 9, 2025
            </p>
            
            <div className="space-y-6 text-sm text-gray-300">
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Introduction</h3>
                <p>
                  DeepTube LLC, operating as DeepTubeAI ("we," "us," or "our"), operates the website deeptubeai.com, a platform for hosting and sharing AI-generated video content. This Privacy Policy explains how we collect, use, disclose, store, and protect your personal information when you use our website or services (collectively, the "Service"), including when you sign in using social login options (Facebook, Google, or Apple). By using DeepTubeAI.com, you agree to the collection and use of information in accordance with this policy.
                </p>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Information We Collect</h3>
                <p className="font-medium mb-2">We collect the following types of information:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Personal Information</strong>:
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                      <li>Information you provide during registration, such as your name, email address, username, and profile information.</li>
                      <li>Information obtained via social login (Facebook, Google, or Apple), including your name, email address, and profile picture, as permitted by your account settings with those providers.</li>
                    </ul>
                  </li>
                  <li><strong>Content Data</strong>: Videos, images, text, and metadata you upload to the platform.</li>
                  <li><strong>Usage Data</strong>: Information about how you interact with our Service, including pages visited, features used, time spent, and IP address.</li>
                  <li><strong>Device Information</strong>: IP address, browser type, operating system, and device identifiers.</li>
                  <li><strong>Cookies and Tracking</strong>: Data collected through cookies, web beacons, and similar technologies to enhance your experience and analyze site performance.</li>
                </ul>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">How We Use Your Information</h3>
                <p className="font-medium mb-2">We use your information to:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Authenticate your identity and provide access to DeepTubeAI services.</li>
                  <li>Provide, maintain, and improve our Service, including processing and displaying your uploaded content.</li>
                  <li>Personalize your experience and provide content recommendations.</li>
                  <li>Communicate with you about your account and our Service.</li>
                  <li>Monitor and analyze usage patterns and trends to improve our Service.</li>
                  <li>Detect, prevent, and address technical issues and security threats.</li>
                  <li>Generate revenue through advertising and content monetization.</li>
                  <li>Comply with legal obligations, such as GDPR or CCPA, and enforce our Terms of Service.</li>
                </ul>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Information Sharing and Disclosure</h3>
                <p className="font-medium mb-2">We may share your information in the following circumstances:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Public Content</strong>: Content you upload to DeepTubeAI.com becomes publicly available and may be viewed, shared, or downloaded by other users.</li>
                  <li><strong>Service Providers</strong>: We share information with third-party companies (e.g., hosting, analytics, payment processing providers) under strict confidentiality agreements to help us operate our Service.</li>
                  <li><strong>Business Transfers</strong>: In connection with mergers, acquisitions, or sales of assets.</li>
                  <li><strong>Legal Requirements</strong>: When required by law, court order, or to protect our rights, safety, or property.</li>
                  <li><strong>Consent</strong>: With your explicit consent for specific purposes.</li>
                </ul>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Data Retention</h3>
                <p>
                  We retain your personal information only as long as necessary to provide our Service and fulfill the purposes outlined in this policy. Content you upload may be retained indefinitely, even after account termination, as ownership transfers to DeepTube LLC upon upload, per our Terms of Service. We may retain some information for longer periods as required by law (e.g., for fraud prevention, security, or regulatory compliance) or to protect our legitimate business interests. If you request data deletion, we will delete your personal information within 30 days, except where retention is required by law or due to content ownership terms.
                </p>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Data Security</h3>
                <p>
                  We implement industry-standard technical and organizational security measures, including encryption and secure authentication protocols, to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Your Rights and Choices</h3>
                <p className="font-medium mb-2">Depending on your location, you may have the following rights:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Access</strong>: Request access to your personal information we hold.</li>
                  <li><strong>Correction</strong>: Request correction of inaccurate or incomplete information.</li>
                  <li><strong>Deletion</strong>: Request deletion of your personal information, subject to limitations due to content ownership terms or legal requirements.</li>
                  <li><strong>Portability</strong>: Request a copy of your data in a portable format.</li>
                  <li><strong>Objection</strong>: Object to certain types of processing, such as targeted advertising.</li>
                  <li><strong>Restriction</strong>: Request restriction of processing in certain circumstances.</li>
                </ul>
                <p className="mt-2">
                  To exercise these rights, please contact us at support@deeptube.co or follow the instructions on our{" "}
                  <Link href="/data-deletion" className="text-orange-500 hover:text-orange-400 underline">
                    Data Deletion Instructions page
                  </Link>. Note that, per our Terms of Service, uploaded content ownership transfers to DeepTube LLC, which may limit certain deletion rights.
                </p>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Cookies and Tracking Technologies</h3>
                <p>
                  We use cookies, web beacons, and similar technologies to enhance your experience, analyze usage patterns, and deliver personalized content and advertisements. You can control cookie preferences through your browser settings, but disabling cookies may affect Service functionality.
                </p>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Third-Party Services and Social Login</h3>
                <p>
                  Our Service may contain links to third-party websites or integrate with third-party services, including social login providers (Facebook, Google, Apple). When you use social login, your data is subject to their respective privacy policies:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Facebook Privacy Policy</li>
                  <li>Google Privacy Policy</li>
                  <li>Apple Privacy Policy</li>
                </ul>
                <p className="mt-2">
                  This Privacy Policy does not apply to third-party practices, and we encourage you to review their policies before providing any information.
                </p>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Children's Privacy</h3>
                <p>
                  Our Service is not intended for users under 18 years of age. We do not knowingly collect personal information from children under 18. If we discover that we have collected information from a child under 18, we will delete it immediately. Parents or guardians who believe their child has provided information to us should contact us at support@deeptube.co.
                </p>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">International Data Transfers</h3>
                <p>
                  Your information may be transferred to and processed in countries other than your own, including the United States. We ensure appropriate safeguards are in place to protect your information during such transfers, in accordance with applicable data protection laws, such as GDPR or CCPA.
                </p>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Changes to This Policy</h3>
                <p>
                  We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. We will notify you of significant changes via email or a platform notice at least 7 days before they take effect. Your continued use of the Service after changes are posted constitutes acceptance of the updated policy.
                </p>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Contact Us</h3>
                <p>
                  For questions, concerns, or to exercise your privacy rights, contact our Data Protection Officer at:
                </p>
                <p>
                  DeepTube LLC<br />
                  Email: support@deeptube.co<br />
                  Website: DeepTubeAI.com
                </p>
                <p className="mt-2">
                  If you're in the EU, you can also contact our EU Representative. For unresolved concerns, you may contact your local data protection authority.
                </p>
              </div>

              <p className="mt-8">
                Thank you for trusting DeepTubeAI.com with your data. We are committed to protecting your privacy while providing an innovative platform for AI-generated content.
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

import Layout from "@/components/Layout";
import MiniFooter from "@/components/MiniFooter";
import SEO from "@/components/SEO";

export default function DataDeletion() {
  return (
    <Layout showHeader={true} showFooter={false}>
      <SEO 
        title="Data Deletion Instructions | DeepTubeAI: Ethical AI Media Hub"
        description="Learn how to delete your account and personal data from DeepTubeAI. Follow our step-by-step instructions for Facebook, Google, and Apple social login removal."
        canonicalUrl="https://deeptubeai.com/data-deletion"
        ogType="article"
        keywords="Data deletion, Account removal, DeepTubeAI privacy, Social login removal, GDPR rights, Personal data deletion"
      />
      <div className="min-h-screen bg-[#0f0f0f] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-center">Data Deletion Instructions for DeepTubeAI</h1>
            
            <p className="text-sm text-gray-400 mb-6 text-center">
              <strong>Effective Date</strong>: June 9, 2025
            </p>
            
            <div className="space-y-6 text-sm text-gray-300">
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Introduction</h3>
                <p>
                  DeepTube LLC, operating as DeepTubeAI, respects your right to control your personal data. If you have signed in to DeepTubeAI.com using Facebook, Google, or Apple, you can request the deletion of your account and associated data by following the instructions below.
                </p>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">How to Request Data Deletion</h3>
                <p className="font-medium mb-2">To delete your account and personal data from DeepTubeAI:</p>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-white mb-2">1. Unlink Social Login:</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>For Facebook</strong>: Go to your Facebook account's Settings {"&"} Privacy {">"} Settings {">"} Apps and Websites. Find "DeepTubeAI Login" and click "Remove."</li>
                    <li><strong>For Google</strong>: Go to your Google Account {">"} Security {">"} Third-party apps with account access. Find "DeepTubeAI" and click "Remove Access."</li>
                    <li><strong>For Apple</strong>: Go to your Apple ID account page {">"} Sign-in and Security {">"} Apps {"&"} Websites using Apple ID. Select "DeepTubeAI" and click "Stop Using Apple ID."</li>
                  </ul>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-white mb-2">2. Submit a Deletion Request:</h4>
                  <p className="mb-2">After unlinking your social login, send an email to support@deeptube.co with the subject "Data Deletion Request." Include:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Your full name.</li>
                    <li>The email address associated with your DeepTubeAI account.</li>
                    <li>The social login provider used (Facebook, Google, or Apple).</li>
                  </ul>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-white mb-2">3. Verification:</h4>
                  <p>We may contact you to verify your identity (e.g., via email confirmation) to ensure the request is legitimate.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-white mb-2">4. Processing:</h4>
                  <p>We will delete your account and associated data within 30 days of receiving your verified request, except where retention is required by law (e.g., for fraud prevention).</p>
                </div>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Data Retention</h3>
                <p>
                  In some cases, we may retain certain data as required by law (e.g., for security or regulatory compliance). Such data will be anonymized or stored securely and not used for other purposes.
                </p>
              </div>
              
              <div className="faq-section">
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Contact Us</h3>
                <p>
                  If you have questions about data deletion or need assistance, contact us at:
                </p>
                <p className="mt-2">
                  Email: support@deeptube.co
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add MiniFooter */}
      <MiniFooter />
    </Layout>
  );
}
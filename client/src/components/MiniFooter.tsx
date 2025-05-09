import { useState, useEffect } from "react";
import { Link } from "wouter";
import ContactModal from "./ContactModal";
import FAQModal from "./FAQModal";
import PrivacyPolicyModal from "./PrivacyPolicyModal";
import TermsOfServiceModal from "./TermsOfServiceModal";
import RulesModal from "./RulesModal";

export default function MiniFooter() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isFAQModalOpen, setIsFAQModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  
  useEffect(() => {
    const handleOpenRulesModal = () => {
      setIsRulesModalOpen(true);
    };
    
    window.addEventListener('open-rules-modal', handleOpenRulesModal);
    
    return () => {
      window.removeEventListener('open-rules-modal', handleOpenRulesModal);
    };
  }, []);

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 py-2 px-4 z-40">
      <div className="container mx-auto">
        <div className="flex flex-wrap items-center justify-between">
          {/* Logo and tagline - hidden on very small screens */}
          <div className="hidden xxs:flex items-center">
            <Link href="/" className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
              DeepTube<span className="text-gray-400 text-xs align-top">Beta</span>
            </Link>
            <span className="text-[10px] text-gray-500 ml-1">Ethical AI Media</span>
          </div>
          
          {/* Navigation links - centered on very small screens */}
          <div className="flex space-x-3 md:space-x-4 items-center mx-auto xxs:mx-0">
            <span className="text-xs text-orange-500 hidden md:inline-block">Are Deepfakes Legal?:</span>
            <button
              onClick={() => setIsFAQModalOpen(true)} 
              className="text-xs text-gray-400 hover:text-white bg-transparent border-none cursor-pointer"
            >
              FAQ
            </button>
            <span className="text-gray-600 text-xs">•</span>
            <button
              onClick={() => setIsTermsModalOpen(true)}
              className="text-xs text-gray-400 hover:text-white bg-transparent border-none cursor-pointer"
            >
              Terms
            </button>
            <span className="text-gray-600 text-xs">•</span>
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="text-xs text-gray-400 hover:text-white bg-transparent border-none cursor-pointer"
            >
              Privacy
            </button>
            <span className="text-gray-600 text-xs">•</span>
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="text-xs text-gray-400 hover:text-white bg-transparent border-none cursor-pointer"
            >
              Rules
            </button>
            <span className="text-gray-600 text-xs">•</span>
            <button 
              onClick={() => setIsContactModalOpen(true)}
              className="text-xs text-gray-400 hover:text-white bg-transparent border-none cursor-pointer"
            >
              Contact
            </button>
          </div>
        </div>
      </div>
      
      {/* Contact Modal */}
      <ContactModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />

      {/* FAQ Modal */}
      <FAQModal
        isOpen={isFAQModalOpen}
        onClose={() => setIsFAQModalOpen(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* Terms of Service Modal */}
      <TermsOfServiceModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />

      {/* Rules Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </footer>
  );
}
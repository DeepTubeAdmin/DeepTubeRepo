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
    <>
      <footer className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 py-2 px-4 z-40">
        <div className="container mx-auto">
          <div className="flex flex-wrap justify-center items-center gap-4 text-sm">
            {/* All content grouped together - navigation prioritized on mobile */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-nowrap overflow-hidden">
              {/* Navigation links - highest priority on mobile */}
              <Link 
                href="/terms-of-service" 
                className="text-xs text-gray-400 hover:text-white flex-shrink-0"
              >
                Terms
              </Link>
              <div className="h-3 w-px bg-gray-600"></div>
              <Link 
                href="/privacy-policy" 
                className="text-xs text-gray-400 hover:text-white flex-shrink-0"
              >
                Privacy
              </Link>
              <div className="h-3 w-px bg-gray-600"></div>
              <button
                onClick={() => setIsFAQModalOpen(true)}
                className="text-xs text-gray-400 hover:text-white bg-transparent border-none cursor-pointer flex-shrink-0"
              >
                FAQ
              </button>
              <div className="h-3 w-px bg-gray-600"></div>
              <button
                onClick={() => setIsRulesModalOpen(true)}
                className="text-xs text-gray-400 hover:text-white bg-transparent border-none cursor-pointer flex-shrink-0"
              >
                Rules
              </button>
              <div className="h-3 w-px bg-gray-600"></div>
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="text-xs text-gray-400 hover:text-white bg-transparent border-none cursor-pointer flex-shrink-0"
              >
                Contact
              </button>
              
              
              
              {/* Disclaimer and copyright - lowest priority */}
              <div className="h-3 w-px bg-gray-600 hidden lg:block"></div>
              <span className="text-xs text-gray-400 hidden lg:inline flex-shrink-0">
                Disclaimer: All content on this site is purely fictional
              </span>
              <div className="h-3 w-px bg-gray-600 hidden xl:block"></div>
              <span className="text-xs text-gray-400 hidden xl:inline flex-shrink-0">
                © 2025 DeepTubeAI.com
              </span>
            </div>
          </div>
        </div>
      </footer>
      
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
    </>
  );
}
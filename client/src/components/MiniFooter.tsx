import { Link } from "wouter";

export default function MiniFooter() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-gray-800 py-2 px-4 z-40">
      <div className="container mx-auto">
        <div className="flex flex-wrap items-center justify-between">
          {/* Logo and tagline - hidden on very small screens */}
          <div className="hidden xxs:flex items-center">
            <Link href="/" className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
              DeepTube<span className="text-gray-400">.co</span>
            </Link>
            <span className="text-[10px] text-gray-500 ml-1">Ethical AI Media</span>
          </div>
          
          {/* Navigation links - centered on very small screens */}
          <div className="flex space-x-3 md:space-x-4 items-center mx-auto xxs:mx-0">
            <Link href="/faq" className="text-xs text-gray-400 hover:text-white">
              FAQ
            </Link>
            <span className="text-gray-600 text-xs">•</span>
            <Link href="/terms-of-service" className="text-xs text-gray-400 hover:text-white">
              Terms
            </Link>
            <span className="text-gray-600 text-xs">•</span>
            <Link href="/privacy-policy" className="text-xs text-gray-400 hover:text-white">
              Privacy
            </Link>
            <span className="text-gray-600 text-xs">•</span>
            <Link href="/contact" className="text-xs text-gray-400 hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
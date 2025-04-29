import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-black py-6 border-t border-gray-800 mt-8">
      <div className="container mx-auto px-6">
        {/* Top section with main links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div>
            <h4 className="text-white text-lg font-bold uppercase mb-4">DeepTube</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-primary text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-primary text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <a href="https://www.synthesia.io/?via=seth-glass" className="text-gray-400 hover:text-primary text-sm">
                  Create Videos
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white text-lg font-bold uppercase mb-4">Information</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy-policy" className="text-gray-400 hover:text-primary text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="text-gray-400 hover:text-primary text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/forum" className="text-gray-400 hover:text-primary text-sm">
                  Community Forum
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white text-lg font-bold uppercase mb-4">Categories</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/?category=sci-fi" className="text-gray-400 hover:text-primary text-sm">
                  Sci-Fi
                </Link>
              </li>
              <li>
                <Link href="/?category=animation" className="text-gray-400 hover:text-primary text-sm">
                  Animation
                </Link>
              </li>
              <li>
                <Link href="/?category=avatar" className="text-gray-400 hover:text-primary text-sm">
                  Avatar
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white text-lg font-bold uppercase mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-primary text-sm">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-primary text-sm">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/dmca" className="text-gray-400 hover:text-primary text-sm">
                  DMCA
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom section with copyright */}
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center text-sm">
          <p className="text-gray-400 mb-4 md:mb-0">
            &copy; 2025 <span className="text-white font-bold">Deep</span><span className="text-primary font-bold">Tube</span>
            <span className="text-white">.co - All Rights Reserved</span>
          </p>
          <div className="space-x-6">
            <Link href="/terms-of-service" className="text-gray-400 hover:text-primary uppercase text-xs font-bold">
              Terms
            </Link>
            <Link href="/privacy-policy" className="text-gray-400 hover:text-primary uppercase text-xs font-bold">
              Privacy
            </Link>
            <a href="https://www.synthesia.io/?via=seth-glass" className="text-gray-400 hover:text-primary uppercase text-xs font-bold">
              Synthesia
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

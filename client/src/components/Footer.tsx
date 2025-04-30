import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] py-8 border-t border-gray-800 mt-8">
      <div className="container mx-auto px-4">
        {/* Top section with main links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <h4 className="text-white text-lg font-semibold mb-4">DeepTube.co</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/forum" className="text-gray-400 hover:text-white text-sm">
                  Community Forum
                </Link>
              </li>
              <li>
                <a href="https://www.synthesia.io/?via=seth-glass" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Create AI Videos
                </a>
              </li>
              <li>
                <Link href="/my-videos" className="text-gray-400 hover:text-white text-sm">
                  My Videos
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white text-lg font-semibold mb-4">Content</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/?category=deepfakes" className="text-gray-400 hover:text-white text-sm">
                  DeepFakes
                </Link>
              </li>
              <li>
                <Link href="/?category=ai-art" className="text-gray-400 hover:text-white text-sm">
                  AI Art
                </Link>
              </li>
              <li>
                <Link href="/?category=avatars" className="text-gray-400 hover:text-white text-sm">
                  Digital Avatars
                </Link>
              </li>
              <li>
                <Link href="/?category=animation" className="text-gray-400 hover:text-white text-sm">
                  AI Animation
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white text-lg font-semibold mb-4">Information</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white text-sm">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="text-gray-400 hover:text-white text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-gray-400 hover:text-white text-sm">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white text-lg font-semibold mb-4">Tools & Resources</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="https://www.synthesia.io/?via=seth-glass" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Synthesia AI
                </a>
              </li>
              <li>
                <a 
                  href="https://runwayml.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-400 hover:text-white text-sm"
                >
                  RunwayML
                </a>
              </li>
              <li>
                <a 
                  href="https://openai.com/dall-e-3" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-400 hover:text-white text-sm"
                >
                  DALL-E 3
                </a>
              </li>
              <li>
                <a 
                  href="https://midjourney.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Midjourney
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom section with copyright */}
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            &copy; 2025 DeepTube.co - All content on this website is AI-generated. No real people appear in any images or videos.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-white">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-white">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-white">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-white">
              <i className="fab fa-youtube"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

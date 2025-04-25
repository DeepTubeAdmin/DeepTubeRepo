import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Footer() {
  return (
    <footer className="bg-secondary py-8 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-primary font-bold text-xl mb-4">AIVideoHub</h3>
            <p className="text-muted-foreground mb-4">
              The premier marketplace for AI-generated videos. Create, buy, and sell
              stunning AI-generated content.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary" aria-label="YouTube">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary" aria-label="Discord">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.062.062 0 0 0-.068.032 13.8 13.8 0 0 0-.618 1.273.06.06 0 0 1-.042.047 22.173 22.173 0 0 0-5.408 0 .06.06 0 0 1-.042-.047 13.8 13.8 0 0 0-.617-1.273.064.064 0 0 0-.07-.032 19.142 19.142 0 0 0-4.883 1.49.059.059 0 0 0-.028.023C.533 8.267-.32 11.936.099 15.554c.004.01.012.019.022.025a19.366 19.366 0 0 0 5.832 2.95.062.062 0 0 0 .068-.023 14.003 14.003 0 0 0 1.205-1.968.06.06 0 0 0-.032-.084 16.48 16.48 0 0 1-1.9-.913.06.06 0 0 1-.006-.1c.129-.096.255-.194.376-.292a.057.057 0 0 1 .062-.008c3.144 1.442 6.556 1.442 9.658 0a.058.058 0 0 1 .062.008c.121.098.247.196.377.292a.06.06 0 0 1-.006.1 15.308 15.308 0 0 1-1.9.913.06.06 0 0 0-.033.083 13.792 13.792 0 0 0 1.205 1.969.06.06 0 0 0 .068.023 19.32 19.32 0 0 0 5.833-2.95.064.064 0 0 0 .022-.025c.507-4.108-.838-7.743-3.548-10.962a.05.05 0 0 0-.026-.023zm-8.318 9.467c-1.149 0-2.094-1.066-2.094-2.376 0-1.31.917-2.376 2.094-2.376 1.187 0 2.122 1.077 2.094 2.376 0 1.31-.918 2.376-2.094 2.376zm7.74 0c-1.149 0-2.094-1.066-2.094-2.376 0-1.31.917-2.376 2.094-2.376 1.187 0 2.122 1.077 2.094 2.376 0 1.31-.907 2.376-2.094 2.376z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  Explore
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  Create
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Newsletter</h4>
            <p className="text-muted-foreground mb-2">
              Stay updated with the latest AI video generation technology
            </p>
            <div className="flex">
              <Input
                type="email"
                placeholder="Your email"
                className="w-full p-2 bg-muted text-white rounded-l-md focus:outline-none"
              />
              <Button className="bg-primary text-primary-foreground px-4 rounded-r-md font-bold">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-muted-foreground">
          <p>&copy; 2023 AIVideoHub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

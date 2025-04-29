import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-secondary py-3 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center text-sm">
          <p className="text-muted-foreground">
            &copy; 2025 <a href="https://deeptube.co" className="text-primary hover:underline">DeepTube.co</a>
          </p>
          <div className="space-x-4">
            <Link href="/terms-of-service" className="text-muted-foreground hover:text-primary">
              Terms of Service
            </Link>
            <Link href="/privacy-policy" className="text-muted-foreground hover:text-primary">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

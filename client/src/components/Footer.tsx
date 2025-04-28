// No imports needed

export default function Footer() {
  return (
    <footer className="bg-secondary py-3 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center text-sm">
          <p className="text-muted-foreground">
            &copy; 2025 <a href="https://deeptube.co" className="text-primary hover:underline">DeepTube.co</a>
          </p>
          <a href="#" className="text-muted-foreground hover:text-primary">
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}

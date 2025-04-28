import { Button } from "@/components/ui/button";

export default function CtaBanner() {
  return (
    <section className="mb-8">
      <div className="bg-card rounded-xl p-6 md:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-6 md:mb-0 md:mr-6 z-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Create Your Own DeepTube Video
            </h2>
            <p className="text-muted-foreground mb-4 max-w-lg">
              Upload your prompt or image and let our AI generate stunning videos. 
              Customize style, duration, and resolution.
            </p>
            <Button className="bg-primary text-primary-foreground font-bold py-3 px-6 rounded-full hover:bg-primary/90">
              Start Creating
            </Button>
          </div>
          <div className="w-full md:w-2/5 z-10">
            <div className="aspect-video bg-background rounded-lg overflow-hidden shadow-lg">
              <img
                src="https://images.pexels.com/photos/2882638/pexels-photo-2882638.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                alt="AI Video Creation"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary opacity-10 rounded-full"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary opacity-10 rounded-full"></div>
        </div>
      </div>
    </section>
  );
}

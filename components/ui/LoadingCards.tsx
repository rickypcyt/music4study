import { Card, CardContent } from "@/components/ui/card";

function Bone({ className = "" }: { className?: string }) {
  return <div className={`m4s-shimmer rounded-md ${className}`} />;
}

export default function LoadingCards() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading tracks" className="w-full">
      <div className="flex items-center justify-center gap-3 py-6 text-foreground/70">
        <div className="flex items-end gap-1 h-6" aria-hidden="true">
          {[0, 0.2, 0.4, 0.1, 0.3].map((delay, i) => (
            <span key={i} className="m4s-eq-bar" style={{ animationDelay: `${delay}s` }} />
          ))}
        </div>
        <span className="font-sans tracking-wider text-base">Loading music...</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card
            key={i}
            className="overflow-hidden min-h-[400px] flex flex-col m4s-fade-up"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <CardContent className="p-2 flex flex-col flex-1">
              <Bone className="w-full aspect-video rounded-lg" />
              <div className="p-4 space-y-3">
                <Bone className="h-6 w-3/4" />
                <Bone className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Bone className="h-6 w-16 rounded-full" />
                  <Bone className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

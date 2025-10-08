import { Loader2 } from "lucide-react";

const PageLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <span className="text-sm">Memuat…</span>
    </div>
  );
};

export default PageLoader;

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-6xl font-mono font-bold text-primary/80 mb-2">404</p>
        <h1 className="text-2xl font-semibold mb-3">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          The route you requested doesn&apos;t exist on the ModernDataSciEng Platform. If you arrived here from an
          old bookmark like <code className="font-mono">/#/databricks</code>, the routing has been upgraded to
          clean URLs — please update your bookmark to <code className="font-mono">/databricks</code>.
        </p>
        <Button asChild>
          <Link href="/">Back to overview</Link>
        </Button>
      </div>
    </div>
  );
}

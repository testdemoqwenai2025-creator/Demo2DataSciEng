import { HomePage } from "./_pages/home";

/**
 * ModernDataSciEng Platform — home route (/).
 *
 * Each non-home page has its own route file (e.g. /databricks/page.tsx).
 * The AppShell wrapping (sidebar + header + footer) is provided by
 * src/app/layout.tsx, so all routes get the shell automatically.
 *
 * In-page section anchors on the home page use plain hash links
 * (e.g. #knowledge-loop) for smooth-scroll behaviour.
 */
export default function Page() {
  return <HomePage />;
}

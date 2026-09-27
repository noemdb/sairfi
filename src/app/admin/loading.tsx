import { AppHeader } from "@/components/layout/app-shell";
import { PageLoader } from "@/components/layout/page-loader";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <PageLoader rows={2} />
      </main>
    </div>
  );
}

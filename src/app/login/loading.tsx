import { AppHeaderSkeleton } from "@/components/layout/app-shell";
import { PageLoader } from "@/components/layout/page-loader";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AppHeaderSkeleton />
      <main className="mx-auto max-w-md px-4 sm:px-6 py-12">
        <PageLoader rows={1} />
      </main>
    </div>
  );
}

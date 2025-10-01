import { Toaster } from "sonner";

import { ReportForm } from "@/components/report/report-form";

export default function ReportPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <Toaster position="top-right" richColors />
      <ReportForm />
    </main>
  );
}

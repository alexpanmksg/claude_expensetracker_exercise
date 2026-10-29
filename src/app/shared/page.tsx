import type { Metadata } from "next";
import { SharedReportView } from "@/components/cloud/SharedReportView";

export const metadata: Metadata = { title: "Shared report", robots: { index: false } };

export default function SharedPage() {
  return <SharedReportView />;
}

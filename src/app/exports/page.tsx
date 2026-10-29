import type { Metadata } from "next";
import { ExportsView } from "@/components/cloud/ExportsView";

export const metadata: Metadata = { title: "Export & share" };

export default function ExportsPage() {
  return <ExportsView />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailView } from "@/components/marketplace/project-detail";
export const metadata: Metadata = { title: "جزئیات پروژه" };
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  return <ProjectDetailView projectId={Number(id)} />;
}

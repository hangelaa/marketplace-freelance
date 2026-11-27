import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/marketplace/project-form";
export const metadata: Metadata = { title: "ویرایش پروژه" };
export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) notFound();
  return <ProjectForm key={id} projectId={Number(id)} />;
}

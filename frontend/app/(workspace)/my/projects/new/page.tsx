import type { Metadata } from "next";
import { ProjectForm } from "@/components/marketplace/project-form";
export const metadata: Metadata = { title: "تعریف پروژه جدید" };
export default function CreateProjectPage() { return <ProjectForm />; }

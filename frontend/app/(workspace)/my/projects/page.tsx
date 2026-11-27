import type { Metadata } from "next";
import { MyProjects } from "@/components/marketplace/my-projects";
export const metadata: Metadata = { title: "پروژه‌های من" };
export default function MyProjectsPage() { return <MyProjects />; }

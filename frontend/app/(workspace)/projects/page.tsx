import type { Metadata } from "next";
import { BrowseProjects } from "@/components/marketplace/browse-projects";
export const metadata: Metadata = { title: "کشف پروژه‌ها" };
export default function BrowseProjectsPage() { return <BrowseProjects />; }

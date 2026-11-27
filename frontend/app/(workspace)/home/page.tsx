import type { Metadata } from "next";
import { HomeOverview } from "@/components/marketplace/home-overview";

export const metadata: Metadata = { title: "خانه" };
export default function HomePage() { return <HomeOverview />; }

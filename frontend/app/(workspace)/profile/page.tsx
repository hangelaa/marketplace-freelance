import type { Metadata } from "next";
import { ProfileView } from "@/components/marketplace/profile";
export const metadata: Metadata = { title: "پروفایل من" };
export default function ProfilePage() { return <ProfileView />; }

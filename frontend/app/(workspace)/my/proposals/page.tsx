import type { Metadata } from "next";
import { MyProposals } from "@/components/marketplace/my-proposals";
export const metadata: Metadata = { title: "پیشنهادهای من" };
export default function MyProposalsPage() { return <MyProposals />; }

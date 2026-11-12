import Link from 'next/link';
import { Navbar } from '@/components/navbar/Navbar';
import { Footer } from '@/components/Footer';
import { GUTTERS } from '@/lib/layout';
export const metadata = { title: 'About NewFind | NewFind' };
export default function Page() { return <div className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)]"><Navbar/><main className={`py-12 min-h-[60dvh] ${GUTTERS}`}><h1 className="text-[28px] font-extrabold mb-6">About NewFind</h1><p className="max-w-3xl text-[18px] leading-relaxed">NewFind helps you discover online and in-person events and gives organisers a place to publish and manage their events. Developed and powered by MetaInsights BV.</p><div className="flex flex-wrap gap-6 mt-8"><Link className="underline" href="/explore">Explore events</Link><Link className="underline" href="/dashboard">My dashboard</Link><Link className="underline" href="/forgot-password">Reset your password</Link></div></main><Footer/></div>; }

import Link from 'next/link';
import { Navbar } from '@/components/navbar/Navbar';
import { Footer } from '@/components/Footer';
import { GUTTERS } from '@/lib/layout';
export const metadata = { title: 'Help with NewFind | NewFind' };
export default function Page() { return <div className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-text)]"><Navbar/><main className={`py-12 min-h-[60dvh] ${GUTTERS}`}><h1 className="text-[28px] font-extrabold mb-6">Help with NewFind</h1><p className="max-w-3xl text-[18px] leading-relaxed">Browse events by city, date and category. Sign in to reserve a place at a free event, then find your ticket in My Dashboard. For an external listing, use the original provider to book. Organisers can create events and manage attendees from the organiser console.</p><div className="flex flex-wrap gap-6 mt-8"><Link className="underline" href="/explore">Explore events</Link><Link className="underline" href="/dashboard">My dashboard</Link><Link className="underline" href="/forgot-password">Reset your password</Link></div></main><Footer/></div>; }

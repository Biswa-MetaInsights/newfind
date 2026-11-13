import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/navbar/Navbar";

export const metadata: Metadata = {
  title: "Terms & Conditions | NewFind",
  description: "Terms for using the NewFind event-discovery platform.",
};

const sections = [
  {
    title: "1. About these terms",
    body: (
      <p>These terms apply when you access or use NewFind at newfind.events. NewFind is operated by MetaInsights BV, a Belgian company (enterprise number 1011.288.544), registered at Spekstraat 11, 3020 Herent, Belgium. Contact: <a href="mailto:metainsights.bv@gmail.com">metainsights.bv@gmail.com</a>.</p>
    ),
  },
  {
    title: "2. The service",
    body: (
      <p>NewFind helps people discover events and experiences by location, date, and category. Depending on availability, the service may include event search, event pages, organiser tools, accounts, saved events, registration, reviews, or event-related chat. Features may change as the product develops.</p>
    ),
  },
  {
    title: "3. Accounts and acceptable use",
    body: (
      <>
        <p>You are responsible for providing accurate account information, keeping your sign-in credentials secure, and activity carried out through your account. Contact us promptly if you believe your account has been accessed without permission.</p>
        <p>Do not use NewFind unlawfully, disrupt its operation, misrepresent an event, infringe another person’s rights, upload malicious content, or use the service to harass, defraud, or harm others. We may restrict or suspend access where reasonably necessary to protect users, the service, or legal rights.</p>
      </>
    ),
  },
  {
    title: "4. Events and organiser content",
    body: (
      <>
        <p>Event information may be submitted by organisers or obtained from event-data providers. Organisers are responsible for the accuracy, permissions, and lawful publication of content they submit. NewFind may correct, refuse, or remove content that appears inaccurate, unlawful, outdated, or inconsistent with these terms.</p>
        <p>Event dates, locations, availability, prices, and programme details can change. NewFind does not guarantee that a listing is complete or current. Please confirm important details with the event organiser before travelling or making plans.</p>
        <p>If you submit content, you retain your rights in it and give MetaInsights BV a non-exclusive, worldwide, royalty-free licence to host, display, format, and distribute it as needed to operate and promote NewFind. This licence ends when the content is removed, except for copies retained where legally or technically necessary.</p>
      </>
    ),
  },
  {
    title: "5. Bookings, payments, and external links",
    body: (
      <>
        <p>NewFind may link to an organiser or ticket seller. Any booking or purchase made on a third-party site is governed by that provider’s terms, payment rules, and refund policy. NewFind is not the seller for a third-party transaction.</p>
        <p>The paid checkout shown in the current NewFind MVP is still under development and does not complete a card payment. Do not enter real payment-card details in that screen. For paid tickets, use the event organiser’s official booking link. If NewFind later enables checkout, we will show the seller, total price, applicable fees, payment provider, and relevant cancellation or refund terms before you confirm a purchase.</p>
      </>
    ),
  },
  {
    title: "6. NewFind’s intellectual property",
    body: (
      <p>NewFind’s software, design, branding, and original materials belong to MetaInsights BV or its licensors. You may use the service for personal event discovery and for the organiser functions made available to you. You may not copy, commercially exploit, reverse engineer, or redistribute NewFind materials except where the law permits or we give written permission. Event content remains subject to the rights and licences of its source.</p>
    ),
  },
  {
    title: "7. Availability and responsibility",
    body: (
      <p>We work to keep NewFind available and useful, but the service may be changed, interrupted, or unavailable during maintenance or because of technical issues. To the extent permitted by law, MetaInsights BV is not responsible for losses arising from inaccurate third-party event information, an organiser’s cancellation or conduct, external websites, or temporary service interruption. Nothing in these terms limits liability or consumer rights that cannot legally be limited or excluded.</p>
    ),
  },
  {
    title: "8. Privacy, changes, and applicable law",
    body: (
      <>
        <p>Our <a href="/privacy-policy">Privacy Policy</a> explains how personal data are handled. We may update these terms when the service or law changes. We will publish the current version here and update the revision date.</p>
        <p>Belgian law applies to these terms. If you are a consumer, any mandatory protections and the courts having jurisdiction under applicable consumer law remain available to you. For questions about these terms, email <a href="mailto:metainsights.bv@gmail.com">metainsights.bv@gmail.com</a>.</p>
      </>
    ),
  },
];

export default function TermsAndConditionsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-green)]">NewFind · Legal</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--brand-text)] sm:text-5xl">Terms &amp; Conditions</h1>
        <p className="mt-4 text-sm text-[var(--brand-hint)]">Last updated: 13 November 2026</p>
        <p className="mt-8 text-lg leading-8 text-[var(--brand-text)]">Please read these terms before using NewFind. By using the service, you agree to them.</p>
        <div className="mt-10 space-y-9 text-[15px] leading-7 text-[var(--brand-text)]">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-xl font-bold">{section.title}</h2>
              <div className="space-y-3 [&_a]:underline">{section.body}</div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

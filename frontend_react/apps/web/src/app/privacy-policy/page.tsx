import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/navbar/Navbar";

export const metadata: Metadata = {
  title: "Privacy Policy | NewFind",
  description: "How NewFind and MetaInsights BV handle personal data.",
};

const sections = [
  {
    title: "1. Who is responsible for your data?",
    body: (
      <>
        <p>MetaInsights BV (registered in Belgium under enterprise number 1011.288.544) is the data controller for personal data processed through NewFind.</p>
        <p>Registered office: Spekstraat 11, 3020 Herent, Belgium.</p>
        <p>Privacy questions or requests: <a href="mailto:metainsights.bv@gmail.com">metainsights.bv@gmail.com</a>.</p>
      </>
    ),
  },
  {
    title: "2. What information do we handle?",
    body: (
      <>
        <p><strong>Account and profile information.</strong> If you register, we handle your name, email address, password credentials (stored as a password hash), and account role.</p>
        <p><strong>Events and contributions.</strong> We handle event information you submit, such as event titles, descriptions, dates, locations, images, organiser details, and public profile or community content. Published information may be visible to other visitors.</p>
        <p><strong>Use of NewFind.</strong> We handle the searches, filters, saved events, event registrations, reviews, messages, and other actions needed to provide the features you use.</p>
        <p><strong>Location and preferences.</strong> You choose a city or location in the app. NewFind stores this choice in your browser. The current app does not request your device’s precise GPS location.</p>
        <p><strong>Browser storage and technical data.</strong> NewFind uses browser storage for necessary app state and preferences, such as sign-in state, saved items, selected city, and display settings. Hosting and security logs may include technical details such as IP address, browser information, and request time.</p>
        <p><strong>AI features.</strong> If you use an event chat or AI feature, the text you submit and relevant event details may be sent to the AI provider configured for that feature (such as OpenAI or Google) to produce a response. Please do not submit sensitive personal information in a prompt.</p>
        <p><strong>Payments.</strong> The current paid checkout is still under development and does not complete a card payment. Do not enter real payment-card details. If you attempt a paid checkout, NewFind may send your account identifier, event identifier, amount, and currency to its payment backend and Stripe to create a payment intent; NewFind does not send the card-number fields in the current implementation.</p>
      </>
    ),
  },
  {
    title: "3. Why do we use this information?",
    body: (
      <ul>
        <li>To provide event discovery, accounts, event publishing, registration, saved items, and support that you request.</li>
        <li>To operate, secure, troubleshoot, and improve NewFind, prevent misuse, and keep records of service activity.</li>
        <li>To display public events and organiser content and link visitors to the original organiser or ticketing page.</li>
        <li>To meet legal obligations and handle disputes or claims.</li>
      </ul>
    ),
  },
  {
    title: "4. Legal grounds for processing",
    body: (
      <p>Depending on the feature, we process data because it is needed to provide the service or take steps you request before using it; because we have a legitimate interest in operating and securing NewFind; because the law requires us to keep certain information; or, where required, because you have given consent. You can withdraw consent at any time for processing based on consent.</p>
    ),
  },
  {
    title: "5. Who may receive information?",
    body: (
      <>
        <p>We use service providers to host and operate NewFind, including Vercel for the website and Hetzner for backend infrastructure. AI providers may receive prompts and relevant event details when you use AI features. Stripe may receive payment-intent information if a paid checkout is attempted. These providers process information to provide their services to us.</p>
        <p>Information you publish as an event, organiser profile, review, or public message may be shown to other NewFind visitors. When you follow a link to an organiser or ticket seller, that third party handles your activity under its own privacy policy. We do not sell personal information.</p>
      </>
    ),
  },
  {
    title: "6. Where is information stored and for how long?",
    body: (
      <p>NewFind and its service providers may process data in the European Economic Area or elsewhere. Where personal data are transferred outside the EEA, we will use a transfer mechanism required by data-protection law. We keep account and user-contributed data while needed to provide the service or until you request deletion, subject to records we must retain for legal, security, or dispute-resolution purposes. Browser-stored preferences and saved items remain on your device until you clear them or remove them in the app. Payment and accounting records, if any, are kept for the periods required by law.</p>
    ),
  },
  {
    title: "7. Your data-protection rights",
    body: (
      <>
        <p>Subject to applicable law, you may ask us to access, correct, delete, restrict, or transfer your personal data, or object to certain processing. You may also complain to the Belgian Data Protection Authority. To exercise a right, email <a href="mailto:metainsights.bv@gmail.com">metainsights.bv@gmail.com</a>; we may ask you to verify your identity.</p>
        <p>Belgian Data Protection Authority: <a href="https://www.dataprotectionauthority.be/citizen/actions/lodge-a-complaint" target="_blank" rel="noreferrer">dataprotectionauthority.be</a>.</p>
      </>
    ),
  },
  {
    title: "8. Cookies and changes to this policy",
    body: (
      <p>The current app uses browser storage needed for sign-in and preferences. We do not currently use advertising or third-party analytics cookies. If we introduce non-essential cookies or similar tracking technologies, we will provide the notices and choices required by law. We may update this policy as NewFind changes; the date at the top shows when it was last revised.</p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--brand-green)]">NewFind · Legal</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--brand-text)] sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-[var(--brand-hint)]">Last updated: 13 November 2026</p>
        <p className="mt-8 text-lg leading-8 text-[var(--brand-text)]">This policy explains how MetaInsights BV handles personal data when you use NewFind at <a href="https://www.newfind.events" className="underline">newfind.events</a>.</p>
        <div className="mt-10 space-y-9 text-[15px] leading-7 text-[var(--brand-text)]">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-xl font-bold">{section.title}</h2>
              <div className="space-y-3 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">{section.body}</div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

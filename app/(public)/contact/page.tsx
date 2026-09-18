// app/(public)/contact/page.tsx
// /contact — unified inquiry form. See docs/PAGE-SPECIFICATIONS.md ("/contact").

import { InquiryForm } from "./_components/InquiryForm";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section className="py-16">
      <h1 className="font-sans font-semibold text-2xl text-ink mb-6">Contact</h1>
      <InquiryForm />
    </section>
  );
}

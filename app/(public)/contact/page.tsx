// app/(public)/contact/page.tsx
// /contact — unified inquiry form. See docs/PAGE-SPECIFICATIONS.md ("/contact").

import { InquiryForm } from "./_components/InquiryForm";

export default function ContactPage() {
  return (
    <section className="px-6 py-16 max-w-5xl mx-auto">
      <h1 className="font-sans font-semibold text-2xl text-ink mb-6">Contact</h1>
      <InquiryForm />
    </section>
  );
}

// app/(public)/contact/page.tsx
// /contact — unified inquiry form. See docs/PAGE-SPECIFICATIONS.md ("/contact").

import { InquiryForm } from "./_components/InquiryForm";
import { Container } from "@/components/shared/Container";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <Container>
      <section className="py-16">
        <h1 className="text-ink mb-6 font-sans text-2xl font-semibold">Contact</h1>
        <InquiryForm />
      </section>
    </Container>
  );
}

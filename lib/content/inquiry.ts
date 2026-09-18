// lib/content/inquiry.ts
// The six InquiryType values the contact form offers (PAGE-SPECIFICATIONS.md
// "/contact"). Plain data in a plain module so both the client InquiryForm and
// server components (the home contact band) can read it.

export const INQUIRY_TYPES = [
  { value: "hire", label: "Hire" },
  { value: "partnership", label: "Partnership" },
  { value: "service", label: "Service request" },
  { value: "contribution", label: "Contribution" },
  { value: "recruitment", label: "Recruitment" },
  { value: "collaboration", label: "Collaboration" },
];

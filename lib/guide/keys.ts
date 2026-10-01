// lib/guide/keys.ts
// Browser session keys the AI guide shares with the rest of the site — kept
// here so the contact form can read a draft without loading the chat.

/** Where a draft inquiry waits for the contact form (BR-4.1/4.2: the visitor sends it). */
export const INQUIRY_DRAFT_KEY = "mks.inquiryDraft";

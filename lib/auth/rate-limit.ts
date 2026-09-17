// lib/auth/rate-limit.ts
// Shared rate limiter, backed by RateLimitEntry (prisma/schema.prisma) — not
// duplicated per route. Covers: BR-2.4 (5 inquiries/IP/24h), BR-3.2 (5 failed
// logins), BR-3.6 (5 failed 2FA attempts per challengeToken).
// TODO: implement — see docs/BUSINESS-RULES-v1.md §2, §3.

export {};

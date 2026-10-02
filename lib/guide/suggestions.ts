// lib/guide/suggestions.ts
// Which opening questions the guide's chat shows on a page: the "ai-guide"
// content block's pageSuggestions (owner-edited), matched by path. A page
// ending in "/" matches everything under it ("/systems/" → every system
// page, not the catalog itself); otherwise the path must match exactly. The
// longest match wins.

export interface PageSuggestions {
  page: string;
  questions: string[];
}

export function questionsFor(pathname: string, pages: PageSuggestions[]): string[] {
  const matches = pages.filter((p) => (p.page.endsWith("/") ? pathname.startsWith(p.page) && pathname.length > p.page.length : pathname === p.page));
  return matches.sort((a, b) => b.page.length - a.page.length)[0]?.questions ?? [];
}

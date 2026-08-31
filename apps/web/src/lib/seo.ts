// apps/web/src/lib/seo.ts
// Per-page SEO helper — sets document <title> and meta description dynamically.
// All routes call this on mount (REQUIREMENT.md §9).

const SITE_NAME = "WA Marketing BD";

export interface SeoMeta {
  title: string;
  description: string;
  noIndex?: boolean;
}

/**
 * Apply SEO meta to the current document.
 * Call this from a useEffect in each page component.
 */
export function applySeo({ title, description, noIndex = false }: SeoMeta): void {
  document.title = `${title} — ${SITE_NAME}`;

  setMeta("description", description);
  setMeta("og:title", `${title} — ${SITE_NAME}`);
  setMeta("og:description", description);
  setMeta("og:site_name", SITE_NAME);

  const ogImage = `${import.meta.env.VITE_SITE_URL}/og-image.png`;
  setMeta("og:image", ogImage);

  if (noIndex) {
    setMeta("robots", "noindex,nofollow");
  }
}

function setMeta(name: string, content: string): void {
  const isOg = name.startsWith("og:");
  const attr = isOg ? "property" : "name";

  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

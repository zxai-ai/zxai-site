import { FirecrawlResult, PlacesResult } from "../../shared/types";

export function buildPrompt(
  url: string,
  crawl: FirecrawlResult,
  places: PlacesResult | null
): string {
  let prompt = `Analyze this medical practice website and produce a JSON visibility audit report.

Website URL: ${url}
Page title: ${crawl.metadata.title ?? "Unknown"}
Meta description: ${crawl.metadata.description ?? "None"}

--- WEBSITE CONTENT ---
${crawl.markdown.slice(0, 12000)}
--- END WEBSITE CONTENT ---
`;

  if (places) {
    prompt += `
--- GOOGLE PLACES DATA ---
Business name: ${places.name}
Rating: ${places.rating ?? "Not found"} (${places.reviewCount ?? 0} reviews)
Address: ${places.address ?? "Not found"}
Phone: ${places.phone ?? "Not found"}
Categories: ${places.categories?.join(", ") ?? "None"}
Hours: ${places.hours?.join("; ") ?? "Not found"}
--- END GOOGLE PLACES DATA ---
`;
  }

  prompt += `
Score this practice on 5 dimensions from 0 to 100:
1. SEO Health: titles, metas, headings, internal links, mobile friendliness
2. GEO/AI Visibility: structured data, FAQ content, entity clarity for AI systems
3. Local Presence: Google rating, review count, NAP consistency, hours, categories
4. Content Quality: service page depth, blog presence, E-E-A-T signals, freshness
5. Competitor Gap: compared to a typical top-performing practice in their specialty

Compute an overall score as the weighted average (SEO 25%, GEO/AI 25%, Local 20%, Content 20%, Competitor Gap 10%).

For each dimension provide:
- score (0-100)
- summary (1 sentence, plain language, no jargon)
- findings (array of 2-4 specific observations)

Then provide 3-5 recommendations ranked by priority. Each recommendation needs:
- action: what to do (plain language)
- impact: expected result
- difficulty: "easy", "medium", or "hard"
- dimension: which score it improves

Use the practice name from the website or Google Places data.

Respond with ONLY valid JSON matching this structure:
{
  "practice_name": "string",
  "scores": {
    "overall": number,
    "seo": { "score": number, "summary": "string", "findings": ["string"] },
    "geo_ai": { "score": number, "summary": "string", "findings": ["string"] },
    "local": { "score": number, "summary": "string", "findings": ["string"] },
    "content": { "score": number, "summary": "string", "findings": ["string"] },
    "competitor_gap": { "score": number, "summary": "string", "findings": ["string"] }
  },
  "recommendations": [
    { "action": "string", "impact": "string", "difficulty": "easy|medium|hard", "dimension": "string" }
  ]
}`;

  return prompt;
}

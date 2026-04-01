import { PlacesResult } from "../../shared/types";

const PLACES_API = "https://places.googleapis.com/v1/places:searchText";

export async function lookup(
  query: string,
  apiKey: string
): Promise<PlacesResult | null> {
  try {
    const res = await fetch(PLACES_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.nationalPhoneNumber,places.currentOpeningHours,places.types,places.websiteUri",
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    });

    if (!res.ok) return null;

    const body = await res.json<{ places?: Array<Record<string, unknown>> }>();
    const place = body.places?.[0];
    if (!place) return null;

    return {
      name: (place.displayName as { text: string })?.text ?? query,
      rating: (place.rating as number) ?? null,
      reviewCount: (place.userRatingCount as number) ?? null,
      address: (place.formattedAddress as string) ?? null,
      phone: (place.nationalPhoneNumber as string) ?? null,
      hours: (place.currentOpeningHours as { weekdayDescriptions?: string[] })
        ?.weekdayDescriptions ?? null,
      categories: (place.types as string[]) ?? null,
      website: (place.websiteUri as string) ?? null,
    };
  } catch {
    return null;
  }
}

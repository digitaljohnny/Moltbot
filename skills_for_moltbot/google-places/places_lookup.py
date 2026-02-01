#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
import sys
import urllib.parse
import urllib.request

DEFAULT_API_KEY = "AIzaSyBFOKTnjZBCpZrPr8oZiM00SDKLW2vENTQ"
TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
PHOTO_URL = "https://maps.googleapis.com/maps/api/place/photo"


def iso_now():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def build_url(base, params):
    cleaned = {k: v for k, v in params.items() if v is not None}
    return base + "?" + urllib.parse.urlencode(cleaned)


def http_get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Moltbot/GooglePlacesSkill"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        return json.loads(data.decode("utf-8"))
    except Exception as exc:
        return {"status": "ERROR", "error_message": str(exc)}


def text_search(query, api_key, location=None, radius=None, language=None, region=None):
    params = {
        "query": query,
        "key": api_key,
        "location": location,
        "radius": radius,
        "language": language,
        "region": region,
    }
    return http_get_json(build_url(TEXT_SEARCH_URL, params))


def place_details(place_id, api_key, language=None, region=None):
    fields = (
        "place_id,name,formatted_address,geometry,types,website,"
        "formatted_phone_number,international_phone_number,opening_hours,"
        "business_status,rating,user_ratings_total,price_level,"
        "utc_offset_minutes,photos"
    )
    params = {
        "place_id": place_id,
        "fields": fields,
        "key": api_key,
        "language": language,
        "region": region,
    }
    return http_get_json(build_url(DETAILS_URL, params))


def photo_url(photo_reference, api_key, maxwidth=1600):
    params = {"maxwidth": maxwidth, "photo_reference": photo_reference, "key": api_key}
    return build_url(PHOTO_URL, params)


def normalize_candidate(item):
    location = item.get("geometry", {}).get("location", {})
    return {
        "name": item.get("name"),
        "placeId": item.get("place_id"),
        "formattedAddress": item.get("formatted_address"),
        "location": {"lat": location.get("lat"), "lng": location.get("lng")},
        "types": item.get("types", []),
        "rating": item.get("rating"),
        "userRatingsTotal": item.get("user_ratings_total"),
    }


def normalize_place(item, api_key):
    location = item.get("geometry", {}).get("location", {})
    photos = []
    for photo in item.get("photos", []) or []:
        ref = photo.get("photo_reference")
        photos.append(
            {
                "photoReference": ref,
                "width": photo.get("width"),
                "height": photo.get("height"),
                "photoUrl": photo_url(ref, api_key) if ref else None,
            }
        )
    opening = item.get("opening_hours") or {}
    return {
        "placeId": item.get("place_id"),
        "name": item.get("name"),
        "formattedAddress": item.get("formatted_address"),
        "location": {"lat": location.get("lat"), "lng": location.get("lng")},
        "types": item.get("types", []),
        "businessStatus": item.get("business_status"),
        "rating": item.get("rating"),
        "userRatingsTotal": item.get("user_ratings_total"),
        "priceLevel": item.get("price_level"),
        "website": item.get("website"),
        "phone": {
            "formatted": item.get("formatted_phone_number"),
            "international": item.get("international_phone_number"),
        },
        "openingHours": {
            "openNow": opening.get("open_now"),
            "weekdayText": opening.get("weekday_text"),
        },
        "utcOffsetMinutes": item.get("utc_offset_minutes"),
        "photos": photos,
    }


def main():
    parser = argparse.ArgumentParser(description="Google Places lookup helper")
    parser.add_argument("query", nargs="?", help="Search query or place name")
    parser.add_argument("--place-id", dest="place_id", help="Place ID to lookup directly")
    parser.add_argument("--location", help='Bias location as "lat,lng"')
    parser.add_argument("--radius", type=int, help="Radius in meters")
    parser.add_argument("--language", help="Response language, e.g. en")
    parser.add_argument("--region", help="Region bias, e.g. us")
    parser.add_argument(
        "--index",
        type=int,
        default=None,
        help="Candidate index to fetch details for (0-based)",
    )
    args = parser.parse_args()

    api_key = os.getenv("GOOGLE_PLACES_API_KEY", DEFAULT_API_KEY)
    output = {
        "query": args.query,
        "resultCount": 0,
        "candidates": [],
        "place": None,
        "provenance": {"source": "google_places", "fetchedAt": iso_now()},
    }
    warnings = []

    if not api_key:
        output["error"] = {"status": "ERROR", "message": "Missing Google Places API key"}
        print(json.dumps(output, indent=2))
        return 1

    if args.radius and not args.location:
        warnings.append("radius_ignored_without_location")
        args.radius = None

    if args.place_id:
        details = place_details(args.place_id, api_key, args.language, args.region)
        status = details.get("status")
        if status != "OK":
            output["error"] = {
                "status": status,
                "message": details.get("error_message"),
            }
            if warnings:
                output["warnings"] = warnings
            print(json.dumps(output, indent=2))
            return 1
        output["place"] = normalize_place(details.get("result", {}), api_key)
        if warnings:
            output["warnings"] = warnings
        print(json.dumps(output, indent=2))
        return 0

    if not args.query:
        parser.error("query is required unless --place-id is provided")

    search = text_search(
        args.query, api_key, args.location, args.radius, args.language, args.region
    )
    status = search.get("status")
    if status != "OK":
        output["error"] = {
            "status": status,
            "message": search.get("error_message"),
        }
        if warnings:
            output["warnings"] = warnings
        print(json.dumps(output, indent=2))
        return 1

    candidates = [normalize_candidate(item) for item in search.get("results", [])]
    output["candidates"] = candidates
    output["resultCount"] = len(candidates)

    selected_index = None
    if args.index is not None:
        if 0 <= args.index < len(candidates):
            selected_index = args.index
        else:
            warnings.append("index_out_of_range")
    elif len(candidates) == 1:
        selected_index = 0

    if selected_index is not None:
        place_id = candidates[selected_index].get("placeId")
        details = place_details(place_id, api_key, args.language, args.region)
        status = details.get("status")
        if status != "OK":
            output["error"] = {
                "status": status,
                "message": details.get("error_message"),
            }
        else:
            output["place"] = normalize_place(details.get("result", {}), api_key)

    if warnings:
        output["warnings"] = warnings
    print(json.dumps(output, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

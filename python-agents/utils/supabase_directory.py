"""Small Supabase read helpers for orchestrator-level probing/search.

These functions intentionally mirror only high-value parts of the TypeScript
search/routing path and keep scope read-only.
"""
from __future__ import annotations

import asyncio
import os
import re
import time
from typing import Any

import httpx

from models.search_models import SearchFilters


_CACHE_LOCK = asyncio.Lock()
_CACHE_TTL_SECONDS = int(os.getenv("PY_DIMENSIONAL_CACHE_TTL_SECONDS", "900"))
_CACHE_LOADED_AT = 0.0
_DIVE_TYPE_ALIAS_TO_CANONICAL: dict[str, str] = {}
_COUNTRY_ALIAS_TO_CANONICAL: dict[str, str] = {}


def _normalize_lookup_key(raw: str) -> str:
    return re.sub(r"[\s_\-]+", " ", str(raw or "").strip().casefold())


def _normalize_country_lookup_phrase(raw: str) -> str:
    s = str(raw or "").strip()
    return re.sub(r"^the\s+", "", s, flags=re.IGNORECASE).strip()


def _canonical_trip_product_type(name: str) -> str | None:
    key = _normalize_lookup_key(name)
    if key == "liveaboard":
        return "liveaboard"
    if key == "dive resort":
        return "dive_resort"
    if key == "dive shop":
        return "dive_shop"
    return None


def normalize_trip_product_type(raw: str | None) -> str | None:
    if raw is None:
        return None
    key = _normalize_lookup_key(raw)
    if key in ("", "null", "none", "unknown", "n/a"):
        return None
    if key in ("liveaboard", "live aboard", "liveboard"):
        return "liveaboard"
    if key in ("dive resort", "dive resorts", "resort"):
        return "dive_resort"
    if key in ("dive shop", "dive shops", "day trip", "day trips", "day boat", "day boats"):
        return "dive_shop"
    return _canonical_trip_product_type(key)


def _aliases_for_canonical_dive_type(name: str) -> set[str]:
    aliases = {_normalize_lookup_key(name)}
    key = _normalize_lookup_key(name)
    if key == "liveaboard":
        aliases.update({"live aboard", "liveboard"})
    elif key == "dive resort":
        aliases.update({"resort", "dive resorts"})
    elif key == "dive shop":
        aliases.update({"dive shops", "day trip", "day trips", "day boat", "day boats"})
    return aliases


async def _refresh_alias_cache_if_needed(force: bool = False) -> None:
    global _CACHE_LOADED_AT
    now = time.monotonic()
    if not force and _CACHE_LOADED_AT > 0 and (now - _CACHE_LOADED_AT) < _CACHE_TTL_SECONDS:
        return

    if not is_supabase_configured():
        return

    async with _CACHE_LOCK:
        now = time.monotonic()
        if not force and _CACHE_LOADED_AT > 0 and (now - _CACHE_LOADED_AT) < _CACHE_TTL_SECONDS:
            return
        try:
            dive_type_rows = await _select("dive_business_types", {"select": "name", "limit": "100"})
            country_rows = await _select("countries", {"select": "id,name", "limit": "1000"})
            country_alias_rows = await _select("country_aliases", {"select": "alias,country_id", "limit": "3000"})
        except Exception:
            return

        dive_aliases: dict[str, str] = {}
        for row in dive_type_rows:
            name = str(row.get("name") or "").strip()
            if not name:
                continue
            for alias in _aliases_for_canonical_dive_type(name):
                dive_aliases[alias] = name

        countries_by_id: dict[str, str] = {}
        country_aliases: dict[str, str] = {}
        for row in country_rows:
            cid = str(row.get("id") or "").strip()
            cname = str(row.get("name") or "").strip()
            if not cid or not cname:
                continue
            countries_by_id[cid] = cname
            country_aliases[_normalize_lookup_key(cname)] = cname

        for row in country_alias_rows:
            alias = str(row.get("alias") or "").strip()
            cid = str(row.get("country_id") or "").strip()
            cname = countries_by_id.get(cid)
            if alias and cname:
                country_aliases[_normalize_lookup_key(alias)] = cname

        _DIVE_TYPE_ALIAS_TO_CANONICAL.clear()
        _DIVE_TYPE_ALIAS_TO_CANONICAL.update(dive_aliases)
        _COUNTRY_ALIAS_TO_CANONICAL.clear()
        _COUNTRY_ALIAS_TO_CANONICAL.update(country_aliases)
        _CACHE_LOADED_AT = time.monotonic()


async def resolve_country_alias(country_text: str | None) -> str | None:
    phrase = _normalize_country_lookup_phrase(country_text or "")
    if not phrase:
        return None
    key = _normalize_lookup_key(phrase)

    await _refresh_alias_cache_if_needed()
    cached = _COUNTRY_ALIAS_TO_CANONICAL.get(key)
    if cached:
        return cached

    if not is_supabase_configured():
        return None

    rows = await _select("countries", {"select": "id,name", "name": f"ilike.{phrase}", "limit": "10"})
    exact = next(
        (
            str(r.get("name") or "").strip()
            for r in rows
            if _normalize_lookup_key(str(r.get("name") or "")) == key
        ),
        None,
    )
    if exact:
        return exact

    alias_rows = await _select("country_aliases", {"select": "alias,country_id", "alias": f"ilike.{phrase}", "limit": "10"})
    alias_hit = next(
        (
            str(r.get("country_id") or "").strip()
            for r in alias_rows
            if _normalize_lookup_key(str(r.get("alias") or "")) == key
        ),
        None,
    )
    if not alias_hit:
        return None

    from_alias = await _select("countries", {"select": "name", "id": f"eq.{alias_hit}", "limit": "1"})
    if not from_alias:
        return None
    name = str(from_alias[0].get("name") or "").strip()
    return name or None


async def normalize_dive_type_values(values: list[str] | None) -> list[str] | None:
    if not values:
        return None
    await _refresh_alias_cache_if_needed()

    out: list[str] = []
    seen: set[str] = set()
    for value in values:
        key = _normalize_lookup_key(value)
        if not key:
            continue
        canonical = _DIVE_TYPE_ALIAS_TO_CANONICAL.get(key)
        if canonical is None:
            tpt = normalize_trip_product_type(value)
            if tpt == "liveaboard":
                canonical = "Liveaboard"
            elif tpt == "dive_resort":
                canonical = "Dive Resort"
            elif tpt == "dive_shop":
                canonical = "Dive Shop"
        if not canonical:
            continue
        dedupe_key = _normalize_lookup_key(canonical)
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        out.append(canonical)

    return out or None


async def normalize_search_filters_aliases(filters: SearchFilters) -> SearchFilters:
    updates: dict[str, Any] = {}

    resolved_country = await resolve_country_alias(filters.country)
    if resolved_country and resolved_country != filters.country:
        updates["country"] = resolved_country

    if not (filters.country and filters.country.strip()) and filters.place and filters.place.strip():
        place_country = await resolve_country_alias(filters.place)
        if place_country:
            updates["country"] = place_country
            updates["place"] = None

    normalised_dive_types = await normalize_dive_type_values(filters.dive_types)
    if normalised_dive_types is not None:
        updates["dive_types"] = normalised_dive_types

    if not updates:
        return filters
    return filters.model_copy(update=updates)


def _supabase_env() -> tuple[str | None, str | None]:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    return url, key


def is_supabase_configured() -> bool:
    url, key = _supabase_env()
    return bool(url and key)


async def _select(table: str, params: dict[str, str]) -> list[dict[str, Any]]:
    url, key = _supabase_env()
    if not url or not key:
        raise RuntimeError("Supabase not configured - set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY")

    endpoint = f"{url.rstrip('/')}/rest/v1/{table}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(endpoint, headers=headers, params=params)
        res.raise_for_status()
        data = res.json()
        return data if isinstance(data, list) else []


async def get_shop_by_id(shop_id: str) -> dict[str, Any] | None:
    rows = await _select(
        "diveshops",
        {
            "select": "id,business_name,city,state,country_id,region_id,google_rating,type,languages",
            "id": f"eq.{shop_id}",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


async def get_dive_sites_for_shop(shop_id: str, limit: int = 100) -> list[dict[str, Any]]:
    return await _select(
        "diveshop_dive_sites",
        {
            "select": "dive_sites(id,name)",
            "diveshop_id": f"eq.{shop_id}",
            "limit": str(limit),
        },
    )


async def get_courses_for_shop(shop_id: str, limit: int = 100) -> list[dict[str, Any]]:
    return await _select(
        "diveshop_courses",
        {
            "select": "courses(id,certification_name)",
            "diveshop_id": f"eq.{shop_id}",
            "limit": str(limit),
        },
    )


async def get_rental_equipment_for_shop(shop_id: str, limit: int = 100) -> list[dict[str, Any]]:
    return await _select(
        "diveshop_rental_equipment",
        {
            "select": "rental_equipment(id,name)",
            "diveshop_id": f"eq.{shop_id}",
            "limit": str(limit),
        },
    )


async def probe_referent_phrase(phrase: str, limit: int = 5) -> dict[str, Any]:
    like = f"%{phrase.strip()}%"
    if not phrase.strip():
        return {"shopHits": [], "placeShopHits": [], "countryHits": [], "regionHits": [], "diveSiteHits": []}

    shop_hits = await _select(
        "diveshops",
        {
            "select": "id,business_name,city,state,google_rating",
            "business_name": f"ilike.{like}",
            "limit": str(limit),
            "order": "google_rating.desc.nullslast,business_name.asc",
        },
    )

    place_hits = await _select(
        "diveshops",
        {
            "select": "id,business_name,city,state,google_rating",
            "or": f"(city.ilike.{like},state.ilike.{like})",
            "limit": str(limit),
            "order": "google_rating.desc.nullslast,business_name.asc",
        },
    )

    country_hits = await _select(
        "countries",
        {
            "select": "id,name",
            "name": f"ilike.{like}",
            "limit": str(limit),
            "order": "name.asc",
        },
    )

    country_alias_hits = await _select(
        "country_aliases",
        {
            "select": "alias,country_id",
            "alias": f"ilike.{like}",
            "limit": str(limit * 3),
        },
    )
    alias_country_ids = sorted(
        {
            str(row.get("country_id") or "").strip()
            for row in country_alias_hits
            if str(row.get("country_id") or "").strip()
        }
    )
    if alias_country_ids:
        alias_countries = await _select(
            "countries",
            {
                "select": "id,name",
                "id": f"in.({','.join(alias_country_ids)})",
                "limit": str(limit),
                "order": "name.asc",
            },
        )
        seen_country_ids = {str(row.get("id") or "").strip() for row in country_hits}
        for row in alias_countries:
            cid = str(row.get("id") or "").strip()
            if cid and cid not in seen_country_ids:
                country_hits.append(row)
                seen_country_ids.add(cid)
                if len(country_hits) >= limit:
                    break

    region_hits = await _select(
        "regions",
        {
            "select": "id,name",
            "name": f"ilike.{like}",
            "limit": str(limit),
            "order": "name.asc",
        },
    )

    site_hits = await _select(
        "dive_sites",
        {
            "select": "id,name",
            "name": f"ilike.{like}",
            "limit": str(limit),
            "order": "name.asc",
        },
    )

    return {
        "shopHits": shop_hits,
        "placeShopHits": place_hits,
        "countryHits": country_hits,
        "regionHits": region_hits,
        "diveSiteHits": site_hits,
    }


async def _lookup_country_id(country_name: str) -> str | None:
    canonical = await resolve_country_alias(country_name)
    effective = canonical or country_name
    rows = await _select(
        "countries",
        {
            "select": "id,name",
            "name": f"ilike.{effective}",
            "limit": "1",
        },
    )
    if rows:
        return str(rows[0].get("id"))
    return None


async def _lookup_region_id(region_name: str) -> str | None:
    rows = await _select(
        "regions",
        {
            "select": "id,name",
            "name": f"ilike.{region_name}",
            "limit": "1",
        },
    )
    if rows:
        return str(rows[0].get("id"))
    return None


async def search_shops(filters: SearchFilters, limit: int = 25) -> dict[str, Any]:
    params: dict[str, str] = {
        "select": "id,business_name,city,state,country_id,region_id,google_rating,type,languages",
        "limit": str(limit),
        "order": "google_rating.desc.nullslast,business_name.asc",
    }

    if filters.min_rating is not None:
        params["google_rating"] = f"gte.{float(filters.min_rating)}"

    if filters.place and filters.place.strip():
        like = f"%{filters.place.strip()}%"
        params["or"] = f"(city.ilike.{like},state.ilike.{like},street_address.ilike.{like})"

    if filters.country and filters.country.strip():
        cid = await _lookup_country_id(filters.country.strip())
        if cid:
            params["country_id"] = f"eq.{cid}"

    if filters.region and filters.region.strip():
        rid = await _lookup_region_id(filters.region.strip())
        if rid:
            params["region_id"] = f"eq.{rid}"

    rows = await _select("diveshops", params)
    return {
        "filtersUsed": filters.model_dump(by_alias=True),
        "count": len(rows),
        "shops": rows,
    }


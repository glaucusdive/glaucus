"""Small Supabase read helpers for orchestrator-level probing/search.

These functions intentionally mirror only high-value parts of the TypeScript
search/routing path and keep scope read-only.
"""
from __future__ import annotations

import os
from typing import Any

import httpx

from models.search_models import SearchFilters


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
    rows = await _select(
        "countries",
        {
            "select": "id,name",
            "name": f"ilike.{country_name}",
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


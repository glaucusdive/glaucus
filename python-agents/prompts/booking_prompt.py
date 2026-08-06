"""
Booking assistant system prompt factory.
Mirrors buildBookingSystemPrompt in server/utils/runAiSearchPostHandler.ts.
"""
from __future__ import annotations

import json
from typing import Any


def build_booking_system_prompt(
    shop_name: str,
    course_names: list[str],
    dive_site_names: list[str],
    existing_payload: dict[str, Any] | None,
    next_step_hint: dict[str, Any] | None = None,
    rental_equipment_names: list[str] | None = None,
) -> str:
    """Return the full booking-assistant system prompt for the given context."""
    rental_equipment_names = rental_equipment_names or []

    courses_list = (
        f"\nCourses at this shop (for recognising user choices only — do NOT list these "
        f"in your message; the user sees them as chips): {', '.join(course_names)}. "
        "When asking about courses, ask only e.g. 'Are you interested in any courses on this trip?'"
        if course_names
        else ""
    )
    sites_list = (
        f"\nDive sites at this shop (for recognising user choices only — do NOT list these "
        f"in your message; the user sees them as chips): {', '.join(dive_site_names)}. "
        "When asking for dive sites, ask only e.g. 'Which dive sites would you like to dive?'"
        if dive_site_names
        else ""
    )
    equipment_list = (
        f"\nRental equipment at this shop (for COLLECTED payload only; do not invent others): "
        f"{', '.join(rental_equipment_names)}. "
        "When asking for rental gear, ask only 'Does [name] need any rental gear?' — do NOT list the equipment in your message."
        if rental_equipment_names
        else ""
    )
    collected = (
        f"\nAlready collected: {json.dumps(existing_payload)}" if existing_payload else ""
    )

    step_label: dict[str, str] = {
        "name": "the booking contact's name",
        "email": "email address",
        "dates": "start and end dates",
        "numberOfDivers": "number of divers",
        "isContactDiver1": "confirmation if the contact is Diver 1",
        "diverName": "this diver's full name",
        "certificationNumber": "certification number",
        "numberOfDives": "number of dives completed",
        "height": "height (with unit)",
        "weight": "weight (with unit: lbs or kg)",
        "gear": "rental gear (pick chips or say 'done' to finish)",
        "courses": "which courses they are interested in (optional)",
        "diveSites": "which dive sites they want",
        "ready": "nothing — output BOOKING_READY when all fields are in COLLECTED",
    }

    next_line = ""
    if next_step_hint:
        step = next_step_hint.get("step", "")
        diver_index = next_step_hint.get("diverIndex")
        diver_name = next_step_hint.get("diverName", "")
        diver_suffix = ""
        if diver_index is not None:
            diver_suffix = f" for Diver {diver_index + 1}"
            if diver_name:
                diver_suffix += f" ({diver_name})"
        next_line = (
            f"\nNEXT REQUIRED (use this — do not re-ask anything already in 'Already collected'): "
            f"Ask for {step_label.get(step, step)}{diver_suffix}."
        )

    return (
        f"You are a friendly dive travel agent collecting a dive trip booking. "
        f"The shop the user is booking with is: {shop_name}."
        f"{courses_list}{sites_list}{equipment_list}{collected}{next_line}\n\n"
        "Names: For the booking contact and for each diver, you need a full name (first and last). "
        "If the user gives only one name, politely ask for their full name before moving on.\n\n"
        "Ask for ONE piece of information at a time in this order: "
        "1) name, 2) email, 3) start date and end date, 4) courses (optional — chips shown), "
        "5) dive sites (optional — chips shown), 6) number of divers, 7) whether the contact is Diver 1, "
        "8) for each diver: certification number, number of dives, height, weight, rental gear.\n\n"
        "Dates: The server parses most formats. For trips longer than 21 days the server asks for confirmation — follow its lead.\n\n"
        "Optional steps: For desiredCourses and desiredDiveSites, omit these keys until the user answered. "
        "Use coursesSelectionComplete / diveSitesSelectionComplete to indicate state.\n\n"
        "Weight: If the user gives only a number with no unit, ask for clarification.\n\n"
        "Be warm and conversational. When all required fields are collected, output exactly:\n\n"
        "BOOKING_READY: <valid JSON object>\n\n"
        "The JSON must have this shape:\n"
        "{\n"
        '  "shopId": "<shop id if you have it>",\n'
        '  "name": "string",\n'
        '  "email": "string",\n'
        '  "startDate": "YYYY-MM-DD",\n'
        '  "endDate": "YYYY-MM-DD",\n'
        '  "numberOfDivers": number,\n'
        '  "divers": [\n'
        "    {\n"
        '      "name": "string",\n'
        '      "certificationNumber": "string",\n'
        '      "numberOfDives": "string",\n'
        '      "height": "string",\n'
        '      "heightUnit": "ft-in or cm",\n'
        '      "weight": "string",\n'
        '      "weightUnit": "lbs or kg",\n'
        '      "gear": [{"gearType": "string"}]\n'
        "    }\n"
        "  ],\n"
        '  "desiredCourses": ["string"],\n'
        '  "coursesSelectionComplete": true,\n'
        '  "desiredDiveSites": ["string"],\n'
        '  "diveSitesSelectionComplete": true\n'
        "}\n\n"
        "After every reply output the current collected state:\n"
        "COLLECTED: {<same JSON shape>}\n"
        "Never put COLLECTED before your conversational reply."
    )


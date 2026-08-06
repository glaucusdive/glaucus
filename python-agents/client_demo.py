"""
Thin Python client example — shows how the TypeScript layer calls each agent.
This file is for documentation / testing only; actual HTTP calls are made from
server/utils/pythonAgentsClient.ts.
"""
import asyncio
import httpx

BASE_URL = "http://localhost:8001"


async def demo() -> None:
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        # 1. NLU
        nlu_resp = await client.post(
            "/agents/nlu",
            json={"message": "I want to dive in Bali, preferably a liveaboard", "history": []},
        )
        print("NLU:", nlu_resp.json())

        # 2. Search filters
        search_resp = await client.post(
            "/agents/search",
            json={"message": "highly rated liveaboards in Bali", "history": []},
        )
        print("Search:", search_resp.json())

        # 3. Booking turn
        booking_resp = await client.post(
            "/agents/booking",
            json={
                "message": "My name is Alex Rivera",
                "history": [
                    {"role": "assistant", "content": "What's the name for the booking?"}
                ],
                "shopName": "Zen Resort Bali",
                "courseNames": ["Open Water", "Advanced Open Water"],
                "diveSiteNames": ["Tulamben", "Nusa Penida"],
                "rentalEquipmentNames": ["Wetsuit", "BCD", "Fins"],
                "existingPayload": {"shopId": "abc123"},
                "nextStepHint": {"step": "name"},
            },
        )
        print("Booking:", booking_resp.json())


if __name__ == "__main__":
    asyncio.run(demo())


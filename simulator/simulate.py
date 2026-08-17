"""
simulate.py

Fires a choreographed sequence of transactions at the gateway, then
optionally continues with random transactions in --loop mode.

Usage:
    python simulate.py
    python simulate.py --loop
    python simulate.py --gateway-url http://localhost:4000
"""

import argparse
import random
import time
from datetime import datetime, timezone

import requests

MERCHANT_CATEGORIES = [
    "grocery", "electronics", "travel", "dining", "fuel",
    "entertainment", "apparel", "health", "utilities", "online_retail",
]

# Raw device IDs matching graph/seed/seedGraph.js's printed reference —
# these only produce interesting graph features if that seed has been run.
DEVICE_001_BLOCKLISTED = "device_001"   # shared by user_001/002/003, also user_014
DEVICE_006_HOP1 = "device_006"          # clean, but hop_distance_to_flagged resolves to 1

HYDERABAD = {"lat": 17.385, "lng": 78.4867}
FOREIGN = {"lat": 40.7128, "lng": -74.0060}  # New York — for the impossible-travel case


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def send(gateway_url, payload, label):
    print(f"\n--- {label} ---")
    print(payload)
    try:
        resp = requests.post(f"{gateway_url}/api/v1/evaluate-risk", json=payload, timeout=10)
        print(f"-> {resp.status_code}: {resp.json()}")
    except requests.RequestException as e:
        print(f"-> FAILED: {e}")


def choreographed_sequence(gateway_url, delay):
    user = "user_015"  # unshared device per seedGraph.js's remaining-users range
    device = "device_007"

    # 1-3: normal genuine transactions
    for i in range(3):
        send(gateway_url, {
            "user_id": user,
            "device_id": device,
            "amount": round(random.uniform(200, 1500), 2),
            "merchant_category": random.choice(MERCHANT_CATEGORIES),
            "timestamp": now_iso(),
            "location": {"lat": HYDERABAD["lat"] + random.uniform(-0.05, 0.05),
                         "lng": HYDERABAD["lng"] + random.uniform(-0.05, 0.05)},
        }, f"Genuine baseline #{i+1}")
        time.sleep(delay)

    # 4: obvious impossible-travel fraud
    send(gateway_url, {
        "user_id": user,
        "device_id": device,
        "amount": 50000,
        "merchant_category": "electronics",
        "timestamp": now_iso(),
        "location": FOREIGN,
    }, "Impossible-travel fraud (should auto_block or manual_review)")
    time.sleep(delay)

    # 5: moderate/ambiguous case -> should land in manual_review
    send(gateway_url, {
        "user_id": user,
        "device_id": device,
        "amount": 4000,
        "merchant_category": "travel",
        "timestamp": now_iso(),
        "location": {"lat": HYDERABAD["lat"] + 0.2, "lng": HYDERABAD["lng"] + 0.2},
    }, "Ambiguous case (should land in manual_review)")
    time.sleep(delay)

    # 6: device-linked fraud-ring case, using the seeded blocklisted device
    send(gateway_url, {
        "user_id": "user_001",
        "device_id": DEVICE_001_BLOCKLISTED,
        "amount": 8000,
        "merchant_category": "shopping_net",
        "timestamp": now_iso(),
        "location": HYDERABAD,
    }, "Device-linked fraud-ring case (blocklisted device)")
    time.sleep(delay)

    # 7: hop-1 case, using the seeded bridging device
    send(gateway_url, {
        "user_id": "user_013",
        "device_id": DEVICE_006_HOP1,
        "amount": 3000,
        "merchant_category": "shopping_pos",
        "timestamp": now_iso(),
        "location": HYDERABAD,
    }, "Hop-1 fraud-ring case (bridging device)")


def random_loop(gateway_url, delay):
    print("\n--- Entering random loop mode (Ctrl+C to stop) ---")
    i = 0
    while True:
        i += 1
        send(gateway_url, {
            "user_id": f"user_{random.randint(1, 30):03d}",
            "device_id": f"device_{random.randint(1, 25):03d}",
            "amount": round(random.uniform(50, 20000), 2),
            "merchant_category": random.choice(MERCHANT_CATEGORIES),
            "timestamp": now_iso(),
            "location": {"lat": HYDERABAD["lat"] + random.uniform(-2, 2),
                         "lng": HYDERABAD["lng"] + random.uniform(-2, 2)},
        }, f"Random transaction #{i}")
        time.sleep(delay)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--gateway-url", default="http://localhost:4000")
    parser.add_argument("--delay", type=float, default=2.0, help="Seconds between transactions")
    parser.add_argument("--loop", action="store_true", help="Continue with random transactions after the choreographed sequence")
    args = parser.parse_args()

    choreographed_sequence(args.gateway_url, args.delay)

    if args.loop:
        random_loop(args.gateway_url, args.delay)
    else:
        print("\nChoreographed sequence complete. Pass --loop to continue with random transactions.")


if __name__ == "__main__":
    main()
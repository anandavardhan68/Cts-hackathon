import time
import requests
import random
from datetime import datetime, timezone

GATEWAY_URL = "http://localhost:4000/api/v1/evaluate-risk"

# A trusted user who stays in one place
TRUSTED_USER = "user_099"
TRUSTED_DEVICE = "device_099"
HOME_LAT, HOME_LNG = 17.3850, 78.4867 # Hyderabad

# A known fraudster from your graph database
FRAUD_USER = "user_001"
FRAUD_DEVICE = "device_001" 

def send_transaction(payload, name):
    print(f"Streaming: {name} -> ${payload['amount']}")
    try:
        requests.post(GATEWAY_URL, json=payload)
    except Exception as e:
        print("Failed to send:", e)

def run_pitch_stream():
    print("🚀 Starting Sentinel Pitch Demo Stream...")
    
    while True:
        now = datetime.now(timezone.utc).isoformat()
        
        # 1. GENERATE 4 CLEAN TRANSACTIONS (Auto Approve)
        for _ in range(4):
            send_transaction({
                "user_id": TRUSTED_USER,
                "device_id": TRUSTED_DEVICE,
                "amount": round(random.uniform(15.0, 150.0), 2),
                "merchant_category": "dining",
                "timestamp": now,
                "location": {"lat": HOME_LAT, "lng": HOME_LNG} # No velocity jump!
            }, "🟢 Routine Purchase")
            time.sleep(2)

        # 2. GENERATE A SUSPICIOUS SPIKE (Manual Review)
        # High amount, different category, but same location
        send_transaction({
            "user_id": TRUSTED_USER,
            "device_id": TRUSTED_DEVICE,
            "amount": round(random.uniform(4000.0, 6000.0), 2),
            "merchant_category": "electronics",
            "timestamp": now,
            "location": {"lat": HOME_LAT, "lng": HOME_LNG}
        }, "🟡 Unusual Amount Spike")
        time.sleep(2.5)

        # 3. GENERATE IMPOSSIBLE TRAVEL (Manual Review / Block)
        # Same user, but suddenly in New York
        send_transaction({
            "user_id": TRUSTED_USER,
            "device_id": TRUSTED_DEVICE,
            "amount": 250.00,
            "merchant_category": "travel",
            "timestamp": now,
            "location": {"lat": 40.7128, "lng": -74.0060} # Velocity triggers!
        }, "🟡 Impossible Travel Alert")
        time.sleep(2.5)

        # 4. GENERATE A GRAPH SYNDICATE ATTACK (Auto Block)
        # Hits the Neo4j Hop-0 direct blocklist
        send_transaction({
            "user_id": FRAUD_USER,
            "device_id": FRAUD_DEVICE,
            "amount": 9500.00,
            "merchant_category": "shopping_net",
            "timestamp": now,
            "location": {"lat": HOME_LAT, "lng": HOME_LNG}
        }, "🔴 Blocklisted Graph Node")
        time.sleep(3)

if __name__ == "__main__":
    run_pitch_stream()
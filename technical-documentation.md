┌──────────────────────────────────────────────────────────────┐
│ Browser (localhost:5173) │
│ │
│ ┌────────────────────────────────────────────────────┐ │
│ │ React Frontend (App.jsx) │ │
│ │ │ │
│ │ Rate Panel │ Recipients Panel │ Quote Table │ │
│ └──────────────────────┬─────────────────────────────┘ │
│ │ │
└──────────────────────────┼────────────────────────────────────┘
│ HTTP / REST (axios)
│ CORS-enabled
▼
┌──────────────────────────────────────────────────────────────┐
│ Backend (localhost:8000) │
│ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ FastAPI Application (main.py) │ │
│ │ │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │ │
│ │ │ /api/ │ │ /api/ │ │ /api/ │ │ │
│ │ │ quotes │ │ alerts │ │ rates │ │ │
│ │ └──────┬───────┘ └──────┬───────┘ └─────┬─────┘ │ │
│ │ │ │ │ │ │
│ │ ▼ ▼ ▼ │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │ │
│ │ │ quotes.py │ │ alerts_ │ │ rate │ │ │
│ │ │ │ │ storage │ │ locking │ │ │
│ │ └──────┬───────┘ └──────────────┘ └───────────┘ │ │
│ │ │ │ │
│ │ ▼ │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │ │
│ │ │ providers.py │ │ sanctions.py │ │ banks.py │ │ │
│ │ │ │ │ (4-layer) │ │ (14 banks)│ │ │
│ │ └──────────────┘ └──────────────┘ └───────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│ │
└──────────────────────────────────────────────────────────────┘
│
▼
┌─────────────┐
│ data/ │
│ (JSON) │
└─────────────┘

text

### 2.2 Component Descriptions

**Frontend (React + Vite)**

- Single-page application
- Communicates with backend via `axios`
- State managed with React hooks (`useState`, `useEffect`)
- Auto-refreshes alerts every 10 seconds
- Live validation of account numbers via regex

**Backend (FastAPI)**

- REST API with 11 endpoints
- Pydantic models for request validation
- In-memory storage for alerts, recipients, locked rates
- JSON persistence layer for durability

**Storage**

- `data/alerts.json` — rate alerts
- `data/recipients.json` — saved recipients
- `data/locked_rate.json` — current rate lock

### 2.3 Technology Stack Justification

| Technology | Why Chosen |
|-----------|-----------|
| **FastAPI** | Async, automatic OpenAPI docs, Pydantic integration |
| **React** | Component-based UI, large ecosystem, modern tooling |
| **Vite** | Fast dev server, minimal config, native ES modules |
| **Pydantic** | Type-safe request validation, prevents malformed data |
| **Axios** | Promise-based HTTP client, better than `fetch` for this use case |

---

## 3. Data Flow

### 3.1 Flow 1: Getting Quotes
User enters amount in RUB
│
▼
Frontend: POST /api/quotes { amount_rub: 10000 }
│
▼
Backend: main.py → get_quotes()
│
▼
Calls quotes.py → calculate_quotes(10000)
│
▼
Iterates through PROVIDERS dict:

Calculates fee for each provider

Applies mid-market rate (3.2552)

Computes total PKR received
│
▼
Sorts by PKR received (best first)
│
▼
Returns JSON list to frontend
│
▼
Frontend renders comparison table

text

### 3.2 Flow 2: Saving a Recipient
User fills form: name, bank, account
│
▼
Frontend: POST /api/recipients
│
▼
Backend: main.py → create_recipient()
│
▼
Step 1: Validate required fields (name, bank, account)
│
▼
Step 2: Call validate_account_format(bank, account)
│
▼
Step 3: If invalid, return 400 error with format hint
│
▼
Step 4: Call screen_recipient(bank, country)
│
▼
Step 5: Four layers of screening:
Layer 1: Sanctions blacklist
Layer 2: Country corridor
Layer 3: Suspicious name detection
Layer 4: Bank whitelist
│
▼
Step 6: Save to recipients_storage + data/recipients.json
│
▼
Return recipient with screening result

text

### 3.3 Flow 3: Executing a Transfer
User checks consent box, clicks "Execute Transfer"
│
▼
Frontend: POST /api/transfer { quote_id, user_confirmed, recipient_bank }
│
▼
Backend: main.py → execute_transfer()
│
▼
Step 1: CONSENT GATE
if user_confirmed == False:
return 403 Forbidden
│
▼
Step 2: Sanctions screening on recipient
if not cleared:
return 403 Forbidden
│
▼
Step 3: Simulate transfer execution
(In production: call provider API)
│
▼
Step 4: Generate transaction ID
│
▼
Return success response

text

### 3.4 Flow 4: Alert Triggering
Frontend: setInterval(fetchAlerts, 10000)
│
▼
Every 10 seconds: GET /api/alerts
│
▼
Backend: list_alerts()
│
▼
For each alert:
current_rate = get_current_rate()
if alert.direction == "above" and current_rate >= target:
mark triggered
if alert.direction == "below" and current_rate <= target:
mark triggered
│
▼
Return alerts with triggered status
│
▼
Frontend shows:
⏳ (waiting) or 🔔 (triggered)

text

---

## 4. Core Algorithms

### 4.1 Quote Calculation

**Purpose:** Calculate how much PKR the recipient receives for each provider.

**Algorithm:**

```python
def calculate_quotes(amount_rub):
    quotes = []
    for provider_id, provider in PROVIDERS.items():
        # Step 1: Calculate fee in RUB
        fee_rub = (amount_rub * provider["fee_percent"] / 100) + provider["fee_fixed_rub"]
        
        # Step 2: Subtract fee from amount
        amount_after_fee = amount_rub - fee_rub
        
        # Step 3: Convert to PKR at mid-market rate
        pkr_received = amount_after_fee * MID_MARKET_RATE
        
        quotes.append({
            "provider_id": provider_id,
            "provider_name": provider["name"],
            "fee_rub": round(fee_rub, 2),
            "pkr_received": round(pkr_received, 2),
            "note": provider["note"]
        })
    
    # Sort by best PKR received
    quotes.sort(key=lambda q: q["pkr_received"], reverse=True)
    return quotes
Complexity: O(n) where n = number of providers (4 in current implementation).

Example:

Input: 10,000 RUB

Provider	Fee %	Fee (RUB)	After Fee	PKR Received
Crypto P2P	0.12%	12	9,988	32,512.94
Paysend	0% + 49 flat	49	9,951	32,392.50
Novacrust	0.8%	80	9,920	32,291.58
Bank Transfer	4.5%	450	9,550	31,087.16
4.2 4-Layer Recipient Screening
Purpose: Reject fraudulent, sanctioned, or invalid recipients before any transfer.

Algorithm:

python
def screen_recipient(bank_name, country="PK"):
    # Layer 1: Sanctions blacklist (HIGH severity)
    if bank_name in RESTRICTED_BANKS:
        return {"cleared": False, "reason": "...", "risk_level": "HIGH"}
    
    # Layer 2: Country corridor validation (MEDIUM)
    if country not in VALID_COUNTRIES:
        return {"cleared": False, "reason": "...", "risk_level": "MEDIUM"}
    
    # Layer 3: Suspicious name detection (MEDIUM)
    if _is_suspicious_name(bank_name):
        return {"cleared": False, "reason": "...", "risk_level": "MEDIUM"}
    
    # Layer 4: Whitelist verification (MEDIUM)
    if not _is_recognized_bank(bank_name):
        return {"cleared": False, "reason": "...", "risk_level": "MEDIUM"}
    
    return {"cleared": True, "reason": "Verified", "risk_level": "LOW"}
Suspicious Name Heuristics:

A bank name is flagged as suspicious if:

Length < 3 characters

Contains no letters

Only repeated characters (e.g., "aaaa")

Contains digits AND is < 6 characters

Complexity: O(k) where k = number of known banks (14 + 4 restricted = 18).

4.3 Account Format Validation
Purpose: Prevent typos and validate account numbers against bank-specific formats.

Algorithm:

python
def validate_account_format(bank_name, account_number):
    # Find matching bank
    matched_bank = find_bank_by_name(bank_name)
    if not matched_bank:
        return {"valid": False, "reason": "Bank not recognized"}
    
    # Check against regex pattern
    if not re.match(matched_bank["pattern"], account_number.strip()):
        return {
            "valid": False,
            "reason": f"Expected: {matched_bank['format_hint']}"
        }
    
    return {"valid": True}
Pattern Examples:

Bank	Pattern	Example
HBL	^PK\d{2}HABB\d{16}$	PK36HABB0000001123456702
Meezan	^PK\d{2}MEZN\d{16}$	PK36MEZN0001234567890
Easypaisa	^03\d{9}$	03001234567
Complexity: O(1) per validation (regex matching is constant time for fixed-length patterns).

4.4 Rate Simulation (Random Walk)
Purpose: Simulate realistic rate movement for demo purposes.

Algorithm:

python
import random

_last_rate = {"value": 3.2552}

def get_current_rate():
    # Random walk: ±0.8% per call
    change = random.uniform(-0.008, 0.008)
    new_value = _last_rate["value"] + change
    
    # Clamp to realistic band (90-day historical range)
    new_value = max(3.10, min(new_value, 3.40))
    
    _last_rate["value"] = round(new_value, 4)
    return _last_rate["value"]
Rationale: Real RUB/PKR rate has moved between 3.18 and 3.63 over 90 days. Clamping ensures the simulated rate stays within a realistic band.

In production: Replace with a call to a live FX API (Wise, exchangerate-api.com).

4.5 Consent Gate Enforcement
Purpose: Ensure no transfer occurs without explicit user approval.

Algorithm:

python
def execute_transfer(request):
    # CONSENT GATE — always first check
    if not request.user_confirmed:
        raise HTTPException(403, "User confirmation required")
    
    # Then proceed with other checks
    screening = screen_recipient(request.recipient_bank)
    if not screening["cleared"]:
        raise HTTPException(403, "Transfer blocked")
    
    # Execute
    return {"success": True, "transaction_id": ...}
Why the ordering matters: The consent gate runs before other checks. This prevents:

Information leakage (attacker can't determine if a recipient would be screened)

Resource exhaustion (no screening happens on unauthorized requests)

Race conditions (no partial execution)

5. API Reference
5.1 Base URL
text
http://127.0.0.1:8000
5.2 Endpoints Summary
Method	Endpoint	Purpose
GET	/	Health check
POST	/api/quotes	Get comparison quotes
POST	/api/transfer	Execute a transfer (requires consent)
POST	/api/alerts	Create rate alert
GET	/api/alerts	List alerts with trigger status
DELETE	/api/alerts/{id}	Delete an alert
POST	/api/rates/lock	Lock current rate for 24h
GET	/api/rates/locked	Check locked rate
POST	/api/recipients	Save recipient (with screening)
GET	/api/recipients	List saved recipients
DELETE	/api/recipients/{id}	Delete recipient
GET	/api/banks	List verified banks
5.3 Detailed Endpoint Reference
POST /api/quotes
Request:

json
{ "amount_rub": 10000 }
Response:

json
{
  "quotes": [
    {
      "provider_id": "crypto_p2p",
      "provider_name": "USDT → PKR (Binance P2P)",
      "fee_rub": 12.0,
      "pkr_received": 32512.94,
      "note": "Stablecoin route. Requires crypto wallet."
    }
  ]
}
POST /api/transfer
Request:

json
{
  "quote_id": "novacrust",
  "user_confirmed": true,
  "recipient_bank": "Habib Bank Limited (HBL)"
}
Response (success):

json
{
  "success": true,
  "transaction_id": "TXN-NOVACRUST-12345",
  "message": "Transfer executed successfully in sandbox mode."
}
Response (consent missing):

json
{
  "detail": "Transfer rejected: User confirmation required."
}
POST /api/recipients
Request:

json
{
  "name": "Ayesha Ahmed",
  "bank_name": "Meezan Bank",
  "account_number": "PK36MEZN0001234567890",
  "country": "PK"
}
Response (success):

json
{
  "success": true,
  "recipient": {
    "id": "fc9769da",
    "name": "Ayesha Ahmed",
    "screening": {"cleared": true, "reason": "Verified", "risk_level": "LOW"}
  }
}
Response (screening failed):

json
{
  "success": true,
  "recipient": {
    "screening": {"cleared": false, "reason": "Bank on sanctions list", "risk_level": "HIGH"}
  }
}
(Full API documentation available at http://127.0.0.1:8000/docs when running — FastAPI auto-generates Swagger UI.)

6. Deployment Guide
6.1 Prerequisites
Python 3.11 or higher

Node.js 18 or higher

Git

6.2 Local Development Setup
Step 1: Clone the repository

bash
git clone https://github.com/shehryar2git/fin.git
cd fin
Step 2: Install backend dependencies

bash
pip install fastapi uvicorn pydantic
Step 3: Start the backend

bash
python -m uvicorn src.main:app --reload
Backend runs on http://127.0.0.1:8000

Step 4: Install frontend dependencies (new terminal)

bash
cd frontend
npm install
npm install axios
Step 5: Start the frontend (same terminal)

bash
npm run dev
Frontend runs on http://localhost:5173

Step 6: Open the application

Navigate to http://localhost:5173 in your browser.

6.3 Environment Variables
Currently none required. For production, add:

text
# .env (frontend)
VITE_API_URL=https://api.example.com

# .env (backend)
DATABASE_URL=postgresql://...
WISE_API_KEY=...
JWT_SECRET=...
6.4 Production Deployment
Recommended stack:

Backend: Dockerized FastAPI deployed to AWS ECS / Google Cloud Run

Frontend: React built with Vite, deployed to Vercel / Netlify

Database: PostgreSQL (RDS or Cloud SQL)

Cache: Redis for session and rate caching

Secrets: AWS Secrets Manager / Google Secret Manager

Monitoring: Datadog / CloudWatch

7. Testing
7.1 Manual Test Cases
Test	Steps	Expected Result
Get quotes	Enter 10000, click Get Quotes	Table appears with 4 providers
Consent gate blocks	Check nothing, click Execute	Error: "You must check confirmation box"
Consent gate server	curl POST /api/transfer with user_confirmed=false	HTTP 403 Forbidden
Sanctions block	Add recipient "Bank Restricted Example 1"	Recipient flagged, red border
Format validation	Add recipient with invalid IBAN	Rejected with format hint
Rate alert trigger	Set alert target 3.20 (above)	Triggers immediately if rate > 3.20
Lock rate	Click Lock Current Rate	Green badge appears with 24h expiry
7.2 Automated Tests
Unit tests are in tests/ (to be expanded). Run with:

bash
pytest tests/ -v
7.3 Integration Testing
Use the curl commands in docs/curl-examples.sh to test each endpoint.

8. Known Issues
Issue	Severity	Status	Workaround
Data resets on server restart	Medium	Partial fix (JSON persistence)	Avoid restarting during demo
Rate is simulated	Low	By design	Documented as production roadmap
No authentication	High	Demo scope	Planned for production
CORS allows all origins	Medium	Demo scope	Restrict in production
No rate limiting	Medium	Not implemented	Planned for production
Frontend on hardcoded port	Low	Vite config	Auto-fallback to free port
9. Glossary
Term	Definition
Agent	Autonomous software that completes tasks on behalf of the user
API	Application Programming Interface — how software talks to software
Consent gate	A server-side check that requires explicit user confirmation
CORS	Cross-Origin Resource Sharing — browser security mechanism
Defense in depth	Multiple independent layers of security controls
FastAPI	Modern Python web framework for building APIs
IBAN	International Bank Account Number
Pydantic	Python library for data validation using type hints
REST	Representational State Transfer — architectural style for APIs
Sanctions	Legal restrictions on financial dealings with certain entities
Screening	The process of checking recipients against watchlists
Vite	Fast build tool and dev server for modern web projects
Document prepared by: Shehryar Ahmed & Azhar Shah
Date: October 15, 2026
Version: 1.0
Contact: ahmedfromhse@gmail.com

text

### Step 6: Paste Into the Editor

Click inside the empty `technical-documentation.md` editor. Press **Ctrl + V**.

**What you should see:** The full technical documentation appears in the editor.

### Step 7: Save

Press **Ctrl + S**.

The dot (●) next to the filename should disappear.

### Step 8: Verify the File Is Complete

Press **Ctrl + End** to jump to the bottom.

You should see:
Contact: ahmedfromhse@gmail.com


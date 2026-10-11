import datetime
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.quotes import calculate_quotes
from src.sanctions import screen_recipient
from src.banks import KNOWN_BANKS, validate_account_format

app = FastAPI(title="RUB -> PKR Remittance Optimizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- In-memory storage (resets when server restarts — fine for demo) ----------
alerts_storage = []
locked_rate_storage = None
recipients_storage = []


def get_current_rate():
    """Returns the current RUB->PKR rate. In production, this would call a live FX API."""
    return 3.2552


# ---------- Data models (what the frontend sends us) ----------
class QuoteRequest(BaseModel):
    amount_rub: float

class TransferRequest(BaseModel):
    quote_id: str
    user_confirmed: bool
    recipient_bank: str = "Standard Bank"

class AlertRequest(BaseModel):
    target_rate: float
    direction: str = "above"  # "above" or "below"

class LockRateRequest(BaseModel):
    rate: float

class RecipientRequest(BaseModel):
    name: str
    bank_name: str
    account_number: str
    country: str = "PK" 


# ---------- Existing routes ----------
@app.get("/")
def read_root():
    return {"message": "Welcome to the Fintechathon RUB -> PKR API"}

@app.post("/api/quotes")
def get_quotes(request: QuoteRequest):
    if request.amount_rub <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")
    return {"quotes": calculate_quotes(request.amount_rub)}

@app.post("/api/transfer")
def execute_transfer(request: TransferRequest):
    if not request.user_confirmed:
        raise HTTPException(status_code=403, detail="Transfer rejected: User confirmation required.")
    screening = screen_recipient(request.recipient_bank)
    if not screening["cleared"]:
        raise HTTPException(status_code=403, detail=f"Transfer blocked: {screening['reason']}")
    return {
        "success": True,
        "transaction_id": "TXN-" + request.quote_id.upper() + "-12345",
        "message": "Transfer executed successfully in sandbox mode.",
        "screening": screening,
    }


# ---------- NEW: Rate alert routes ----------
@app.post("/api/alerts")
def create_alert(request: AlertRequest):
    if request.direction not in ["above", "below"]:
        raise HTTPException(status_code=400, detail="Direction must be 'above' or 'below'.")
    if request.target_rate <= 0:
        raise HTTPException(status_code=400, detail="Target rate must be positive.")

    alert = {
        "id": str(uuid.uuid4())[:8],
        "target_rate": request.target_rate,
        "direction": request.direction,
        "created_at": datetime.datetime.now().isoformat(),
        "triggered": False,
        "triggered_at": None,
    }
    alerts_storage.append(alert)
    return {"success": True, "alert": alert}


@app.get("/api/alerts")
def list_alerts():
    current = get_current_rate()
    for alert in alerts_storage:
        if alert["direction"] == "above" and current >= alert["target_rate"]:
            if not alert["triggered"]:
                alert["triggered"] = True
                alert["triggered_at"] = datetime.datetime.now().isoformat()
        elif alert["direction"] == "below" and current <= alert["target_rate"]:
            if not alert["triggered"]:
                alert["triggered"] = True
                alert["triggered_at"] = datetime.datetime.now().isoformat()
    return {"current_rate": current, "alerts": alerts_storage}


@app.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: str):
    global alerts_storage
    for i, a in enumerate(alerts_storage):
        if a["id"] == alert_id:
            alerts_storage.pop(i)
            return {"success": True, "message": f"Alert {alert_id} deleted."}
    raise HTTPException(status_code=404, detail="Alert not found.")


# ---------- NEW: Rate lock routes ----------
@app.post("/api/rates/lock")
def lock_rate(request: LockRateRequest):
    global locked_rate_storage
    if request.rate <= 0:
        raise HTTPException(status_code=400, detail="Rate must be positive.")

    expires_at = (datetime.datetime.now() + datetime.timedelta(hours=24)).isoformat()
    locked_rate_storage = {
        "rate": request.rate,
        "locked_at": datetime.datetime.now().isoformat(),
        "expires_at": expires_at,
    }
    return {"success": True, "locked_rate": locked_rate_storage}


@app.get("/api/rates/locked")
def get_locked_rate():
    global locked_rate_storage
    if locked_rate_storage is None:
        return {"locked": False}
    expires = datetime.datetime.fromisoformat(locked_rate_storage["expires_at"])
    if datetime.datetime.now() > expires:
        locked_rate_storage = None
        return {"locked": False, "message": "Previous locked rate expired."}
    return {"locked": True, **locked_rate_storage}

@app.get("/api/rates/locked")
def get_locked_rate():
    global locked_rate_storage
    if locked_rate_storage is None:
        return {"locked": False}
    expires = datetime.datetime.fromisoformat(locked_rate_storage["expires_at"])
    if datetime.datetime.now() > expires:
        locked_rate_storage = None
        return {"locked": False, "message": "Previous locked rate expired."}
    return {"locked": True, **locked_rate_storage}


# ---------- NEW: Recipient management routes ----------

@app.post("/api/recipients")
def create_recipient(request: RecipientRequest):
    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Recipient name is required.")
    if not request.bank_name.strip():
        raise HTTPException(status_code=400, detail="Bank name is required.")
    if not request.account_number.strip():
        raise HTTPException(status_code=400, detail="Account number is required.")

    # Validate account format against bank's expected pattern
    format_check = validate_account_format(request.bank_name, request.account_number)
    if not format_check["valid"]:
        raise HTTPException(status_code=400, detail=format_check["reason"])

    # Screen the recipient immediately against sanctions list
    screening = screen_recipient(request.bank_name, request.country)
    recipient = {
        "id": str(uuid.uuid4())[:8],
        "name": request.name,
        "bank_name": request.bank_name,
        "account_number": request.account_number,
        "country": request.country,
        "screening": screening,
        "created_at": datetime.datetime.now().isoformat(),
    }
    recipients_storage.append(recipient)
    return {"success": True, "recipient": recipient}


@app.get("/api/recipients")
def list_recipients():
    return {"recipients": recipients_storage, "count": len(recipients_storage)}


@app.delete("/api/recipients/{recipient_id}")
def delete_recipient(recipient_id: str):
    for i, r in enumerate(recipients_storage):
        if r["id"] == recipient_id:
            recipients_storage.pop(i)
            return {"success": True, "message": f"Recipient {recipient_id} deleted."}
    raise HTTPException(status_code=404, detail="Recipient not found.")

# ---------- NEW: Bank list endpoint ----------
@app.get("/api/banks")
def list_banks():
    return {"banks": KNOWN_BANKS}
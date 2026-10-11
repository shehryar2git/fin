from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.quotes import calculate_quotes
from src.sanctions import screen_recipient

app = FastAPI(title="RUB -> PKR Remittance Optimizer")

# Allow the React frontend to talk to this backend later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Data models ----
class QuoteRequest(BaseModel):
    amount_rub: float

class TransferRequest(BaseModel):
    quote_id: str
    user_confirmed: bool
    recipient_bank: str = "Standard Bank"

# ---- Routes ----
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
    # 1. Consent gate — no confirmation, no transfer
    if not request.user_confirmed:
        raise HTTPException(status_code=403, detail="Transfer rejected: User confirmation required.")

    # 2. Sanctions screening
    screening = screen_recipient(request.recipient_bank)
    if not screening["cleared"]:
        raise HTTPException(status_code=403, detail=f"Transfer blocked: {screening['reason']}")

    # 3. Simulate transfer
    return {
        "success": True,
        "transaction_id": "TXN-" + request.quote_id.upper() + "-12345",
        "message": "Transfer executed successfully in sandbox mode.",
        "screening": screening,
    }
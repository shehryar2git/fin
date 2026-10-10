# A simulated list of banned banks for our demo
RESTRICTED_BANKS = ["Bank Restricted Example 1", "Sanctioned Entity Bank"]

def screen_recipient(bank_name: str, country: str = "PK") -> dict:
    # Check if the bank is in our banned list
    if bank_name in RESTRICTED_BANKS:
        return {"cleared": False, "reason": f"Recipient bank '{bank_name}' is on the restricted list."}
    
    # Check if we support the country
    if country not in ["PK", "RU", "AE", "TR"]:
        return {"cleared": False, "reason": f"Corridor to {country} is not currently supported."}
    
    # If they pass both checks, clear them
    return {"cleared": True, "reason": "Recipient bank passed screening."}
from providers import PROVIDERS, MID_MARKET_RATE

def calculate_quotes(amount_rub: float) -> list:
    quotes = []
    for provider_id, provider in PROVIDERS.items():
        # 1. Calculate the fee in Rubles
        fee_rub = (amount_rub * provider["fee_percent"] / 100) + provider["fee_fixed_rub"]
        
        # 2. Subtract the fee from the total amount
        amount_after_fee = amount_rub - fee_rub
        
        # 3. Calculate how many PKR they get based on the rate
        pkr_received = amount_after_fee * MID_MARKET_RATE
        
        # 4. Save this provider's result
        quotes.append({
            "provider_id": provider_id,
            "provider_name": provider["name"],
            "fee_rub": round(fee_rub, 2),
            "pkr_received": round(pkr_received, 2),
            "note": provider["note"]
        })
    
    # Sort the results so the best option is at the top
    quotes.sort(key=lambda q: q["pkr_received"], reverse=True)
    return quotes
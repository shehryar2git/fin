# Simulated sanctions and bank validation for the RUB -> PKR corridor

RESTRICTED_BANKS = [
    "Bank Restricted Example 1",
    "Sanctioned Entity Bank",
    "Blocked Bank",
]

# Known legitimate Pakistani banks (whitelist)
KNOWN_PAKISTANI_BANKS = [
    "HBL", "Habib Bank",
    "Meezan Bank", "Meezan",
    "UBL", "United Bank",
    "MCB", "Muslim Commercial Bank",
    "Allied Bank", "ABL",
    "Bank Alfalah", "Alfalah",
    "Standard Chartered Pakistan",
    "Askari Bank", "Askari",
    "Faysal Bank", "Faysal",
    "Bank Al Habib",
    "JS Bank",
    "Soneri Bank",
    "Easypaisa", "JazzCash",
    "SadaPay", "NayaPay",
]

# Known legitimate Russian banks
KNOWN_RUSSIAN_BANKS = [
    "Sberbank", "VTB", "Alfa Bank", "Tinkoff", "T-Bank",
    "Gazprombank", "Rosselkhozbank", "Raiffeisen",
]

VALID_COUNTRIES = ["PK", "RU", "AE", "TR"]


def _is_recognized_bank(bank_name: str) -> bool:
    """Check if the bank name matches any known bank (case-insensitive, fuzzy)."""
    normalized = bank_name.strip().lower()
    all_known = KNOWN_PAKISTANI_BANKS + KNOWN_RUSSIAN_BANKS
    for known in all_known:
        if known.lower() in normalized or normalized in known.lower():
            return True
    return False


def _is_suspicious_name(bank_name: str) -> bool:
    """Detect gibberish or obviously fake bank names."""
    name = bank_name.strip()
    # Too short to be a real bank
    if len(name) < 3:
        return True
    # No letters at all
    if not any(c.isalpha() for c in name):
        return True
    # Only repeated characters (like "aaaa")
    if len(set(name.lower())) < 3:
        return True
    # Contains digits mixed into a short name (unusual for banks)
    if any(c.isdigit() for c in name) and len(name) < 6:
        return True
    return False


def screen_recipient(bank_name: str, country: str = "PK") -> dict:
    """
    Screen a recipient bank through a multi-layer check.
    Returns: { "cleared": bool, "reason": str, "risk_level": str }
    """

    # Layer 1: Sanctions blacklist (highest priority)
    if bank_name in RESTRICTED_BANKS:
        return {
            "cleared": False,
            "reason": f"Bank '{bank_name}' is on the sanctions list.",
            "risk_level": "HIGH",
        }

    # Layer 2: Country support
    if country not in VALID_COUNTRIES:
        return {
            "cleared": False,
            "reason": f"Corridor to '{country}' is not supported.",
            "risk_level": "MEDIUM",
        }

    # Layer 3: Suspicious name detection
    if _is_suspicious_name(bank_name):
        return {
            "cleared": False,
            "reason": f"Bank name '{bank_name}' appears invalid or unverified.",
            "risk_level": "MEDIUM",
        }

    # Layer 4: Whitelist verification
    if not _is_recognized_bank(bank_name):
        return {
            "cleared": False,
            "reason": f"Bank '{bank_name}' is not in our verified bank list. Manual review required.",
            "risk_level": "MEDIUM",
        }

    # All layers passed
    return {
        "cleared": True,
        "reason": f"Bank '{bank_name}' verified and cleared.",
        "risk_level": "LOW",
    }
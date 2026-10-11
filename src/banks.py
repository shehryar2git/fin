# Known Pakistani banks and mobile wallets with their exact account formats

KNOWN_BANKS = {
    "HBL": {
        "name": "Habib Bank Limited (HBL)",
        "type": "IBAN",
        "format_hint": "PK + 2 digits + HABB + 16 digits (24 chars)",
        "example": "PK36HABB0000001123456702",
        "pattern": r"^PK\d{2}HABB\d{16}$"
    },
    "MEZN": {
        "name": "Meezan Bank",
        "type": "IBAN",
        "format_hint": "PK + 2 digits + MEZN + 16 digits (24 chars)",
        "example": "PK36MEZN0001234567890",
        "pattern": r"^PK\d{2}MEZN\d{16}$"
    },
    "UNIL": {
        "name": "United Bank Limited (UBL)",
        "type": "IBAN",
        "format_hint": "PK + 2 digits + UNIL + 16 digits (24 chars)",
        "example": "PK36UNIL0000001123456702",
        "pattern": r"^PK\d{2}UNIL\d{16}$"
    },
    "MUCB": {
        "name": "MCB Bank",
        "type": "IBAN",
        "format_hint": "PK + 2 digits + MUCB + 16 digits (24 chars)",
        "example": "PK36MUCB0000001123456702",
        "pattern": r"^PK\d{2}MUCB\d{16}$"
    },
    "ABPA": {
        "name": "Allied Bank Limited (ABL)",
        "type": "IBAN",
        "format_hint": "PK + 2 digits + ABPA + 16 digits (24 chars)",
        "example": "PK36ABPA0000001123456702",
        "pattern": r"^PK\d{2}ABPA\d{16}$"
    },
    "ALFH": {
        "name": "Bank Alfalah",
        "type": "IBAN",
        "format_hint": "PK + 2 digits + ALFH + 16 digits (24 chars)",
        "example": "PK36ALFH0000001123456702",
        "pattern": r"^PK\d{2}ALFH\d{16}$"
    },
    "BAHL": {
        "name": "Bank Al Habib",
        "type": "IBAN",
        "format_hint": "PK + 2 digits + BAHL + 16 digits (24 chars)",
        "example": "PK36BAHL0000001123456702",
        "pattern": r"^PK\d{2}BAHL\d{16}$"
    },
    "ASCM": {
        "name": "Askari Bank",
        "type": "IBAN",
        "format_hint": "PK + 2 digits + ASCM + 16 digits (24 chars)",
        "example": "PK36ASCM0000001123456702",
        "pattern": r"^PK\d{2}ASCM\d{16}$"
    },
    "FAYS": {
        "name": "Faysal Bank",
        "type": "IBAN",
        "format_hint": "PK + 2 digits + FAYS + 16 digits (24 chars)",
        "example": "PK36FAYS0000001123456702",
        "pattern": r"^PK\d{2}FAYS\d{16}$"
    },
    "JSBL": {
        "name": "JS Bank",
        "type": "IBAN",
        "format_hint": "PK + 2 digits + JSBL + 16 digits (24 chars)",
        "example": "PK36JSBL0000001123456702",
        "pattern": r"^PK\d{2}JSBL\d{16}$"
    },
    "EASYPAISA": {
        "name": "Easypaisa Mobile Wallet",
        "type": "MOBILE",
        "format_hint": "11-digit mobile number starting with 03",
        "example": "03001234567",
        "pattern": r"^03\d{9}$"
    },
    "JAZZCASH": {
        "name": "JazzCash Mobile Wallet",
        "type": "MOBILE",
        "format_hint": "11-digit mobile number starting with 03",
        "example": "03001234567",
        "pattern": r"^03\d{9}$"
    },
    "SADAPAY": {
        "name": "SadaPay",
        "type": "MOBILE",
        "format_hint": "11-digit mobile number starting with 03",
        "example": "03001234567",
        "pattern": r"^03\d{9}$"
    },
    "NAYAPAY": {
        "name": "NayaPay",
        "type": "MOBILE",
        "format_hint": "11-digit mobile number starting with 03",
        "example": "03001234567",
        "pattern": r"^03\d{9}$"
    }
}


def validate_account_format(bank_name: str, account_number: str) -> dict:
    """Validate an account number against its bank's expected format."""
    import re

    # Find the bank by matching display name
    matched_bank = None
    for code, info in KNOWN_BANKS.items():
        if info["name"] == bank_name or code.lower() in bank_name.lower() or info["name"].split("(")[0].strip().lower() in bank_name.lower():
            matched_bank = info
            break

    if matched_bank is None:
        return {"valid": False, "reason": f"Bank '{bank_name}' is not in our verified bank list."}

    if not re.match(matched_bank["pattern"], account_number.strip()):
        return {
            "valid": False,
            "reason": f"Account format invalid for {matched_bank['name']}. Expected: {matched_bank['format_hint']}. Example: {matched_bank['example']}"
        }

    return {"valid": True, "reason": "Account format validated."}
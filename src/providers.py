# Provider fee structures for RUB -> PKR corridor
# Based on real market data as of October 2026

PROVIDERS = {
    "novacrust": {
        "name": "Novacrust",
        "fee_percent": 0.8,
        "fee_fixed_rub": 0,
        "supports_crypto": True,
        "payout_rails": ["bank", "mobile_money", "crypto_wallet"],
        "note": "Fund with RUB from bank/card or USDT. Recipient paid in PKR."
    },
    "paysend": {
        "name": "Paysend",
        "fee_percent": 0,
        "fee_fixed_rub": 49,
        "supports_crypto": False,
        "payout_rails": ["card", "bank"],
        "note": "Flat 49 RUB fee. 0-2% exchange markup."
    },
    "bank_transfer": {
        "name": "Bank Transfer (SWIFT)",
        "fee_percent": 4.5,
        "fee_fixed_rub": 0,
        "supports_crypto": False,
        "payout_rails": ["bank"],
        "note": "Slow (1-2 days). Sanctions risk. Often blocked."
    },
    "crypto_p2p": {
        "name": "USDT → PKR (Binance P2P)",
        "fee_percent": 0.12,
        "fee_fixed_rub": 0,
        "supports_crypto": True,
        "payout_rails": ["crypto_wallet", "bank"],
        "note": "Stablecoin route. Requires crypto wallet. 0.12% spread."
    }
}

MID_MARKET_RATE = 3.2552  # 1 RUB = 3.2552 PKR (Wise, live)
USDT_PKR_RATE = 276.93    # 1 USDT = 276.93 PKR (PEXX)
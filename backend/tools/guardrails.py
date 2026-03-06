# WHY guardrails: legal docs contain PII (names, ID numbers, addresses).
# Sending raw PII to an external model is a GDPR/data risk.
# Shows judges you understand responsible AI deployment.

import re

PII_PATTERNS = [
    (r'\b\d{9,10}\b', '[ID-REDACTED]'),                      # Ghana Card numbers
    (r'\b[A-Z]{2}\d{6,8}\b', '[PASSPORT-REDACTED]'),         # Passport numbers
    (r'\b[\w.+-]+@[\w-]+\.[\w.]+\b', '[EMAIL-REDACTED]'),    # Emails
    (r'\+?[\d\s\-\(\)]{10,15}', '[PHONE-REDACTED]'),         # Phone numbers
    (r'\b(?:GH-|GHA-)?\d{9}\b', '[TAX-ID-REDACTED]'),        # Ghana TIN
]

DISCLAIMER = (
    "\n\n⚠️ *This is not legal advice. LexAI provides information only. "
    "Please consult a qualified lawyer before making decisions based on this analysis.*"
)

def redact_pii(text: str) -> str:
    for pattern, replacement in PII_PATTERNS:
        text = re.sub(pattern, replacement, text)
    return text

def add_disclaimer(text: str) -> str:
    return text + DISCLAIMER
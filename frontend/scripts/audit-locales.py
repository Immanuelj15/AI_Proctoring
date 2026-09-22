#!/usr/bin/env python3
"""
Locale Dictionary Parity Auditor

Validates that all localized JSON dictionaries (hi, te, ta, ml, kn)
match the canonical English (en.json) key structure exactly with zero drift.
"""

import os
import sys
import json
from typing import Dict, Any

# Ensure UTF-8 output on Windows terminal
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "..", "locales")
REFERENCE_LOCALE = "en.json"
TARGET_LOCALES = ["hi.json", "te.json", "ta.json", "ml.json", "kn.json"]

def get_key_paths(data: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
    """Recursively extracts all dot-notation key paths from a dictionary."""
    paths = {}
    for key, value in data.items():
        current_path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            paths.update(get_key_paths(value, current_path))
        else:
            paths[current_path] = value
    return paths

def audit_locales() -> bool:
    ref_path = os.path.join(LOCALES_DIR, REFERENCE_LOCALE)
    if not os.path.exists(ref_path):
        print(f"ERROR: Canonical reference file not found at {ref_path}")
        return False

    with open(ref_path, "r", encoding="utf-8") as f:
        ref_data = json.load(f)

    ref_keys = get_key_paths(ref_data)
    ref_key_set = set(ref_keys.keys())

    print("=" * 60)
    print(f"AUDITING LOCALES AGAINST CANONICAL: {REFERENCE_LOCALE}")
    print(f"Total Canonical Keys: {len(ref_key_set)}")
    print("=" * 60)

    all_passed = True

    for target in TARGET_LOCALES:
        target_path = os.path.join(LOCALES_DIR, target)
        if not os.path.exists(target_path):
            print(f"[FAIL] Target locale file missing: {target}")
            all_passed = False
            continue

        with open(target_path, "r", encoding="utf-8") as f:
            try:
                target_data = json.load(f)
            except Exception as e:
                print(f"[FAIL] Could not parse JSON for {target}: {e}")
                all_passed = False
                continue

        target_keys = get_key_paths(target_data)
        target_key_set = set(target_keys.keys())

        missing_keys = ref_key_set - target_key_set
        extra_keys = target_key_set - ref_key_set

        # Check for empty values
        empty_keys = [k for k, v in target_keys.items() if not str(v).strip()]

        print(f"\nLocale: {target} ({len(target_key_set)} keys)")
        if missing_keys:
            all_passed = False
            print(f"  [FAIL] MISSING ({len(missing_keys)}):")
            for k in sorted(missing_keys):
                print(f"     - {k}")
        else:
            print("  [PASS] Zero missing keys")

        if extra_keys:
            all_passed = False
            print(f"  [FAIL] EXTRA ({len(extra_keys)}):")
            for k in sorted(extra_keys):
                print(f"     + {k}")
        else:
            print("  [PASS] Zero extraneous keys")

        if empty_keys:
            all_passed = False
            print(f"  [FAIL] EMPTY STRINGS ({len(empty_keys)}):")
            for k in empty_keys:
                print(f"     ! {k}")
        else:
            print("  [PASS] Zero empty translations")

    print("\n" + "=" * 60)
    if all_passed:
        print("[SUCCESS] 100% LOCALE PARITY CONFIRMED across all 6 languages.")
        print("=" * 60)
        return True
    else:
        print("[FAIL] LOCALE DRIFT DETECTED! Resolve missing or extra keys.")
        print("=" * 60)
        return False

if __name__ == "__main__":
    success = audit_locales()
    sys.exit(0 if success else 1)

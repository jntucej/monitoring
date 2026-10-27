"""Post-generation hook: verify the pulse kit was stamped correctly,
   prune files the chosen render_strategy doesn't need."""

import os
import sys
from pathlib import Path

PULSE_NAME = "{{ cookiecutter.pulse_name }}"
STRATEGY   = "{{ cookiecutter.render_strategy }}"
REDUCED    = "{{ cookiecutter.respect_reduced_motion }}" == "yes"
TESTS      = "{{ cookiecutter.include_tests }}" == "yes"
STORY      = "{{ cookiecutter.include_storybook }}" == "yes"

# Files that should always exist
required = [
    f"{PULSE_NAME}.tsx",
    f"use{PULSE_NAME}Variants.ts",
]

# Prune optional artifacts the user opted out of
prune = []
if STRATEGY == "framer-motion":
    prune.append(f"{PULSE_NAME}.css")
if not TESTS:
    prune.append(f"{PULSE_NAME}.test.tsx")
if not STORY:
    prune.append(f"{PULSE_NAME}.stories.tsx")

for f in prune:
    p = Path(f)
    if p.exists():
        p.unlink()

missing = [f for f in required if not Path(f).exists()]
if missing:
    sys.stderr.write("✗ human-pulse-kit post-gen validation failed:\n")
    for m in missing:
        sys.stderr.write(f"    - missing required file: {m}\n")
    sys.exit(1)

print(f"✓ human-pulse-kit generated → {PULSE_NAME}")
print(f"    render_strategy : {STRATEGY}")
print(f"    reduced_motion  : {'yes' if REDUCED else 'no'}")
print(f"    tests           : {'yes' if TESTS   else 'no'}")
print(f"    storybook       : {'yes' if STORY   else 'no'}")
print()
print("Next steps:")
print("    import { " + PULSE_NAME + " } from \"@/components/shared/" + PULSE_NAME + "\";")
print("    <" + PULSE_NAME + " color=\"mint\" variant=\"dot\" label=\"live\" />")
print()
print("Tune the beat by editing the constants in the generated .tsx:")
print("    BEAT_DURATION_S  lub  dub  rest  repeat-delay")

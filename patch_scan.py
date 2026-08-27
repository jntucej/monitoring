import re

with open("src/components/operator/ScanConfirmation.tsx", "r") as f:
    text = f.read()

# Remove EXIT_REASON_CONFIGS from import
text = re.sub(r"EXIT_REASON_CONFIGS,\s*", "", text)

# Add useCampusConfig hook import
text = text.replace("import { useAuthStore } from \"@/stores/authStore\";", "import { useAuthStore } from \"@/stores/authStore\";\nimport { useCampusConfig } from \"@/hooks/useCampusConfig\";")

# Inject hook into component
text = re.sub(r"export function ScanConfirmation\(\{([^\}]+)\}: ScanConfirmationProps\) \{", "export function ScanConfirmation({\\1}: ScanConfirmationProps) {\n  const { exitReasons } = useCampusConfig();\n  const validExitReasons = exitReasons.length > 0 ? exitReasons : [];\n", text)

# Replace applicableReasons logic
old_logic = """const applicableReasons = (student.personType && student.personType !== "student")
    ? [EXIT_REASON_CONFIGS.find((cfg) => cfg.code === "Regular") || EXIT_REASON_CONFIGS[0]]
    : EXIT_REASON_CONFIGS.filt    : EXIT_REASON_CONFIGS.fident.studentT    : EXIT_REASON_CONFIGS.filt    : EXIT_REASON_CONFIGS.fident.st"""
    : EXIT_REASON_nst applicableReasons = (student.personType     : EXIT_REASON_nst applicableReasons = (studentxit    : EXIT_REASON_nst applicable==    : EXIT_REASON_nst applicableReasons = (student.personType     : EXIT_REASON_nst applicableReasons = (studentxit    : EXIT_REASON_nst applicable==    : EXIT_REASON_nst applicableReasons = (xt     : EXIT_REASON_nst appliew_logic)

with open("src/components/operator/ScanConfirmation.tsx", "w") as f:
    f.write(text)

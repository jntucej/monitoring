import re

with open("src/components/operator/ExitReasonSelector.tsx", "r") as f:
    text = f.read()

text = text.replace('import { ExitReason, EXIT_REASON_CONFIGS } from "@/lib/types";', 'import { ExitReason } from "@/lib/types";\nimport { useCampusConfig } from "@/hooks/useCampusConfig";')
text = text.replace('export function ExitReasonSelector({ isOpen, selected, onSelect, onCancel, approvedPasses = [], personType = "student" }: ExitReasonSelectorProps) {', 'export function ExitReasonSelector({ isOpen, selected, onSelect, onCancel, approvedPasses = [], personType = "student" }: ExitReasonSelectorProps) {\n  const { exitReasons } = useCampusConfig();\n  const validExitReasons = exitReasons.length > 0 ? exitReasons : [];')
text = text.replace('const config = EXIT_REASON_CONFIGS.find((c) => c.code === r.val);', 'const config = validExitReasons.find((c) => c.code === r.val);')

with open("src/components/operator/ExitReasonSelector.tsx", "w") as f:
    f.write(text)

print("ExitReasonprint("ExitReasonprint("hopr")

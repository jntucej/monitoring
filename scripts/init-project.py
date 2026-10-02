#!/usr/bin/env python3
"""Initialize the gate-monitor Jira automation project structure."""
import json
import os

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

files = {
    "package.json": {
        "name": "gate-monitor-jira-automation",
        "version": "0.1.0",
        "description": "Jira Cloud automation via REST API adapter with desired-state reconciliation",
        "type": "module",
        "scripts": {
            "inspect": "tsx scripts/inspect.ts",
            "plan": "tsx scripts/plan.ts",
            "apply": "tsx scripts/apply.ts",
            "verify": "tsx scripts/verify.ts",
        },
        "dependencies": {"dotenv": "^16.4.7"},
        "devDependencies": {
            "@types/node": "^22.10.2",
            "tsx": "^4.19.2",
            "typescript": "^5.7.2",
        },
        "engines": {"node": ">=20.0.0"},
    },
    "tsconfig.json": {
        "compilerOptions": {
            "target": "ES2022",
            "module": "NodeNext",
            "moduleResolution": "NodeNext",
            "esModuleInterop": True,
            "strict": True,
            "skipLibCheck": True,
            "forceConsistentCasingInFileNames": True,
            "outDir": "dist",
            "rootDir": ".",
            "declaration": True,
            "resolveJsonModule": True,
            "types": ["node"],
        },
        "include": ["src/**/*.ts", "scripts/**/*.ts"],
        "exclude": ["node_modules", "dist"],
    },
    ".gitignore": "node_modules/\ndist/\n.env\n*.log\n.DS_Store\n",
}

for name, content in files.items():
    path = os.path.join(base, name)
    if isinstance(content, dict):
        with open(path, "w") as f:
            json.dump(content, f, indent=2)
    else:
        with open(path, "w") as f:
            f.write(content)
    print(f"Created: {name}")

print("Project files initialized.")

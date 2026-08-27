import re

with open("src/app/(admin)/admin/page.tsx", "r") as f:
    text = f.read()

# Add Flame icon 
text = text.replace('import { StatCard } from "@/components/admin/StatCard";', 'import { StatCard } from "@/components/admin/StatCard";\nimport { Flame, Radio } from "lucide-react";')

# Find Header
header_start = text.find('{/* Header */}')
header_end = text.find('</div>', header_start)
# We want to replace the header div to include the button
text = text.replace(
'''      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {isRefreshing ? "Syncing data..." : "Live campus telemetry"}
          </p>
        </div>
      </div>''',
'''      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-      <div className="flex flex-tive z-10">
                                                    ent-           hite to-wh         -clip-tex                                                    ent-           hite to-wh         -clip-tex                                                    ent-           hite to-wh         -e C            tr                                                                                        BR                                                    ent- c          relative z-                     den                                                    ent-           hite to-wh         -clhover:bg-rose-50                                                    ent-           hite to-wh         -clip10                                                    ent-     font-bold text-rose-400 uppercase tracking-widest">Emergency Lockdown</span>
        </button>
      </div>'''
)

with open("src/app/(admin)/admin/page.tsx", "w") as f:
    f.write(text)

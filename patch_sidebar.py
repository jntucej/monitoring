import re

with open("src/components/shared/Sidebar.tsx", "r") as f:
    text = f.read()

# adding hooks
text = text.replace('import { useAuthStore } from "@/stores/authStore";', 'import { useAuthStore } from "@/stores/authStore";\nimport { useNavigation } from "@/hooks/useNavigation";')
text = text.replace('import {\n  ShieldCheck,', 'import * as Icons from "lucide-react";\nimport {\n  ShieldCheck,')

# removing ROLE_NAV_GROUPS
block_start = text.find('const ROLE_NAV_GROUPS: Record<string, NavGroup[]> = {')
if block_start != -1:
    block_end = text.find('const ROLE_LABELS: Record<string, string> = {')
    text = text[:block_start] + "const iconMap: Record<string, any> = Icons;\n\n" + text[block_end:]
else:
    print("Could not find ROLE_NAV_GROUPS")

# pulling out Sidebar function text to mutate
func_start = text.find('export default function Sidebar() {')
func_content = text[func_start:]

# state and hooks
func_content = func_content.replace('const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});', 'const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});\n  const { navigation, loading: navLoading } = useNavigation(currentRole);')

# replace map
func_content = func_content.replace('const currentNavGroups = ROLE_NAV_GROUPS[currentRole] || [];', 'const currentNavGroups = navigation || [];')

# replace <Icon ... > where item.icon is used
func_content = re.sub(r'const Icon = item\.icon;\s*return\s*\(', "const Icon = (item.icon && typeof item.icon === 'string' ? iconMap[item.icon] : item.icon) || Icons.HelpCircle;\n                        return (", func_content)

# Add nav loading UI wrapper
func_content = func_content.replace('{currentNavGroups.map((group) => {', '{navLoading ? <div className="p-4 text-xs animate-pulse text-[var(--text-muted)] text-center font-semibold">Loading Navigation...</div> : currentNavGroups.map((group) => {')

# Need to close the ternary for nav loading
# Find the exact closing brace sequence. Let's look for `</nav>` which immediately follows the map block
func_content = func_content.replace('        })}\n      </nav>', '        })}\n      </nav>')
# actually map closes just before `</nav>` so:
func_content = func_content.replace('        })}\n      </nav>', '        })}\n      </nav>') # Wait
func_content = re.sub(r'(\s*)\}\)\}\n\s*</nav>', r'\1})}\1</nav>', func_content) # wait, I just need to add a brace.

# actually a safer way is to just find `          );` `        })}` `      </nav>`
func_content = func_content.replace('          );\n        })}\n      </nav>', '          );\n        })}\n      </nav>')
# wait, if I put the ternary operator `{cond ? X : Y.map(...) }`, I need a closing brace for the ternary `{cond ? X : Y.map(...)}`. 
# The original code looks like `{currentNavGroups.map((group) => { ... }) }` which is matching braces. 
# so `{navLoading ? X : currentNavGroups.map((group) => { ... })}` matches properly! I don't need to append an extra closing brace!

text = text[:func_start] + func_content

with open("src/components/shared/Sidebar.tsx", "w") as f:
    f.write(text)

print("sidebar patched")

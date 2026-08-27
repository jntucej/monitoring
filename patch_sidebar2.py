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

# hooking up replacing inside Sidebar function
func_start = text.find('export default function Sidebar() {')
func_content = text[func_start:]
func_content = func_content.replace('const [collapsedGroups, setCollapsedGroups] = usefunc_content = func_content.r>({});', 'const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});\n  const { navfunc_content = func_content.replace('const [collapsedGroups, setCollapsedGroups] = usefunc_content = func_content.r>({});', 'const [collapsedGroups, setCollapsedGroups] = usentRole] ||func_content = func_content.replace('const [collapsedGroups, setCollapsedGroups] = usefunc_content = func_contet = re.sub(r'const Icon = item\.ifunc_content = func_content.replace('const [collapsedGroups, setCollapsetring' ? iconMap[item.icon] : item.icon) || Icons.HelpCircle;\n                        return (", func_confunc_content = func_content.replace('const [collapsedGroups, setCollapsedGroups] = usefunc_cotring.
text = text[:func_start] + func_content

with open("src/components/shared/Sidebar.tsx", "w") as f:
    f.write(text)

print("sidebar patched")

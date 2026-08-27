import re

with open("src/components/shared/Sidebar.tsx", "r") as f:
    text = f.read()

text = text.replace(
    'import { useState, useEffect } from "react";',
    'import { useState, useEffect } from "react";\nimport { motion, AnimatePresence } from "framer-motion";'
)

# Insert framer wrappers inside the component mapping
# But it's easier to just overwrite Sidebar.tsx completely with our shiny new version.

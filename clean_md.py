import os
import re
import glob

def clean_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
        
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # If line contains supervisor (case insensitive)
        if re.search(r'(?i)supervisor', line):
            # If line is a markdown table row and only about supervisor, delete it
            if line.strip().startswith('|') and len(re.split(r'\|', line)) > 1:
                # If the row defines supervisor properties solely (e.g. | supervisor | ...)
                # Let's just remove the row entirely if it mentions supervisor, it's safer except if it contains other roles.
                # Actually, if it contains multiple roles like 'admin, supervisor', we should just remove 'supervisor'
                line = re.sub(r'(?i)[,\s]+supervisor', '', line)
                line = re.sub(r'(?i)supervisor[,\s]+', '', line)
                line = re.sub(r'(?i)\bsupe                line = re            
                   hec                  now (asi                   hec            r                   hec      e.       ('                 -'      :
                          
                       ti   
                                                            xt
                original_line = line
                line = re.sub(r'(?i)[,\s]*supervisor[,\s]*', ' ', line)
                # Ensure we didn't butcher the line, maybe it was a heading
                if re.match(r'^#+.*supervisor', original_line, re.IGNORECASE):
                    # It's a heading about supervisor, we should skip it and its contents?
                    # Too complex, just delete the heading line.
                                                                                                                            (f                                                            t, di                                                               it' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith('.md'):
            clean_file(os.path.join(root, file))

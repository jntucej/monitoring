#!/usr/bin/env python3
"""
Post-generation hook for AI Scheduler Dashboard Cookie Cutter.

This script is called after cookiecutter finishes generating a new project.
It sets up the generated project with dependencies and initial configuration.
"""

import subprocess
import sys
import os
from pathlib import Path

def main():
    try:
        print("✅ AI Scheduler dashboard scaffolded.")
        print("   → npm run dev")
        
        # Check if node_modules exists, if not, install dependencies
        if not os.path.exists("node_modules"):
            print("Installing dependencies...")
            subprocess.run(["npm", "install"], check=True)
        
        print("\n🎉 Your AI Scheduler Dashboard is ready!")
        print("\nNext steps:")
        print("  1. Start development: npm run dev")
        print("  2. Check the generated dashboard in the app directory")
        print("  3. Customize the configuration in package.json")
        print("  4. Add your own charts and panels using the generator")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error during setup: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

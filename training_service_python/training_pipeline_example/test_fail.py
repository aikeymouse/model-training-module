#!/usr/bin/env python3
"""
Test script that intentionally fails to demonstrate error handling.
"""
import sys
import time

print("Starting test script...")
print("This script will intentionally fail after a few seconds...")

# Simulate some work
for i in range(3):
    print(f"Working... step {i+1}/3")
    time.sleep(1)

print("About to fail...")
print("ERROR: This is an intentional failure for testing error handling!", file=sys.stderr)
sys.exit(1)  # Exit with error code

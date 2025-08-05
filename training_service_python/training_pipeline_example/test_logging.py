#!/usr/bin/env python3
"""
Quick test script to verify pipeline logging functionality
"""
import time
import sys

print("Starting test script...")
print("This is a test message that should appear in both UI and pipeline.log")
time.sleep(1)

print("Testing multi-line output:")
for i in range(3):
    print(f"  Line {i+1}: Progress indicator")
    time.sleep(0.5)

print("Script completed successfully!")
print("Check logs/pipeline.log to verify logging worked")

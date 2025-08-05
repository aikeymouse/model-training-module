#!/usr/bin/env python3
"""
Test script to verify the example training pipeline scripts work correctly.
"""

import subprocess
import sys
import time
from pathlib import Path

def run_script_test(script_path, args=[], timeout=30):
    """Run a script and capture its output"""
    try:
        cmd = [sys.executable, script_path] + args
        print(f"🧪 Testing: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=Path(script_path).parent
        )
        
        if result.returncode == 0:
            print(f"✅ Script passed")
            if args and "--verbose" not in args:
                # Show last few lines of output for non-verbose runs
                lines = result.stdout.strip().split('\n')
                print(f"   Output: ...{lines[-1] if lines else 'No output'}")
            return True
        else:
            print(f"❌ Script failed with code {result.returncode}")
            print(f"   Error: {result.stderr.strip()}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"⏰ Script timed out after {timeout}s")
        return False
    except Exception as e:
        print(f"💥 Script crashed: {e}")
        return False

def main():
    print("🚀 Testing YOLO Training Pipeline Example Scripts")
    print("=" * 60)
    
    scripts_dir = Path(__file__).parent
    
    tests = [
        # Test validation script
        {
            "script": scripts_dir / "validate_data.py",
            "args": [],
            "description": "Dataset validation"
        },
        {
            "script": scripts_dir / "validate_data.py", 
            "args": ["--clean"],
            "description": "Dataset cleaning"
        },
        # Test generation script
        {
            "script": scripts_dir / "generate_dataset.py",
            "args": ["--num-images", "10"],
            "description": "Synthetic data generation (small batch)"
        },
        # Test training script
        {
            "script": scripts_dir / "train.py",
            "args": ["--model", "yolov8n.pt", "--epochs", "3"],
            "description": "Model training (3 epochs)"
        }
    ]
    
    passed = 0
    total = len(tests)
    
    for i, test in enumerate(tests, 1):
        print(f"\n[{i}/{total}] {test['description']}")
        print("-" * 40)
        
        if run_script_test(test["script"], test["args"]):
            passed += 1
        
        time.sleep(1)  # Brief pause between tests
    
    print(f"\n{'='*60}")
    print(f"🏁 Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All scripts working correctly!")
        return 0
    else:
        print("⚠️  Some scripts have issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())

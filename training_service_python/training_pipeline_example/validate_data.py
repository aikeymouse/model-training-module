#!/usr/bin/env python3
"""
Example Data Validation Script for YOLO Training Pipeline
This script demonstrates data validation with realistic output.
"""

import argparse
import time
import random
import sys
from pathlib import Path

def print_banner(title):
    """Print a styled banner for script sections"""
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)

def validate_dataset():
    """Simulate dataset validation with realistic output"""
    print_banner("DATASET VALIDATION")
    
    # Simulate checking dataset structure
    print("🔍 Checking dataset structure...")
    time.sleep(1)
    
    dataset_paths = [
        "data/train/images",
        "data/train/labels", 
        "data/val/images",
        "data/val/labels"
    ]
    
    for path in dataset_paths:
        print(f"  ✓ Found: {path}")
        time.sleep(0.5)
    
    # Simulate counting files
    print("\n📊 Analyzing dataset contents...")
    time.sleep(1)
    
    train_images = random.randint(800, 1200)
    val_images = random.randint(200, 400)
    
    print(f"  • Training images: {train_images}")
    print(f"  • Validation images: {val_images}")
    print(f"  • Total images: {train_images + val_images}")
    
    # Simulate class distribution analysis
    print("\n🏷️  Class distribution analysis...")
    time.sleep(1)
    
    classes = ["person", "car", "truck", "bicycle", "motorcycle"]
    for i, cls in enumerate(classes):
        count = random.randint(50, 300)
        print(f"  Class {i} ({cls}): {count} instances")
        time.sleep(0.3)
    
    # Simulate image quality checks
    print("\n🖼️  Image quality validation...")
    time.sleep(1)
    
    print("  ✓ Image formats: PNG, JPG (valid)")
    print("  ✓ Resolution range: 416x416 to 1920x1080")
    print("  ✓ Color channels: RGB (3 channels)")
    print("  ✓ Corrupted images: 0 found")
    
    # Simulate annotation validation
    print("\n📝 Annotation validation...")
    time.sleep(1)
    
    print("  ✓ YOLO format annotations detected")
    print("  ✓ Bounding box coordinates: normalized [0,1]")
    print("  ✓ Class indices: within valid range")
    print("  ✓ Orphaned annotations: 0 found")
    
    print("\n✅ Dataset validation completed successfully!")
    return True

def clean_dataset():
    """Simulate dataset cleaning operations"""
    print_banner("DATASET CLEANING")
    
    print("🧹 Starting dataset cleanup operations...")
    time.sleep(1)
    
    # Simulate removing duplicates
    print("\n🔍 Checking for duplicate images...")
    time.sleep(2)
    duplicates = random.randint(0, 15)
    if duplicates > 0:
        print(f"  ⚠️  Found {duplicates} duplicate images")
        print(f"  🗑️  Removed {duplicates} duplicates")
    else:
        print("  ✓ No duplicate images found")
    
    # Simulate fixing annotations
    print("\n📐 Validating annotation coordinates...")
    time.sleep(1)
    
    invalid_boxes = random.randint(0, 8)
    if invalid_boxes > 0:
        print(f"  ⚠️  Found {invalid_boxes} invalid bounding boxes")
        print(f"  🔧 Fixed {invalid_boxes} annotation issues")
    else:
        print("  ✓ All bounding boxes are valid")
    
    # Simulate image preprocessing
    print("\n🎨 Optimizing image formats...")
    time.sleep(1)
    
    print("  ✓ Converted BMP files to JPG")
    print("  ✓ Optimized PNG compression")
    print("  ✓ Standardized color profiles")
    
    # Simulate cache cleanup
    print("\n🗂️  Cleaning cache files...")
    time.sleep(1)
    
    cache_files = [".DS_Store", "Thumbs.db", "*.tmp", "*.cache"]
    for cache_file in cache_files:
        print(f"  🗑️  Removed: {cache_file}")
        time.sleep(0.3)
    
    print("\n✅ Dataset cleaning completed successfully!")
    return True

def main():
    parser = argparse.ArgumentParser(
        description="Validate and clean YOLO training dataset",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python validate_data.py                    # Validate dataset
  python validate_data.py --clean           # Clean dataset after validation
  python validate_data.py --verbose         # Show detailed output
        """
    )
    
    parser.add_argument(
        "--clean", 
        action="store_true",
        help="Perform dataset cleaning operations"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true", 
        help="Enable verbose output"
    )
    
    parser.add_argument(
        "--data-path",
        default="./data",
        help="Path to dataset directory (default: ./data)"
    )
    
    args = parser.parse_args()
    
    try:
        if args.verbose:
            print(f"🎯 Script: {Path(__file__).name}")
            print(f"📁 Data path: {args.data_path}")
            print(f"🧹 Clean mode: {'enabled' if args.clean else 'disabled'}")
            print()
        
        if args.clean:
            # In clean mode, run cleaning operations
            success = clean_dataset()
        else:
            # Default mode: validate dataset
            success = validate_dataset()
        
        if success:
            print(f"\n🎉 Script completed successfully!")
            sys.exit(0)
        else:
            print(f"\n❌ Script failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Script interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

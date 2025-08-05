#!/usr/bin/env python3
"""
Example Synthetic Dataset Generation Script for YOLO Training Pipeline
This script demonstrates synthetic data generation with realistic output.
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

def print_progress_bar(current, total, width=50):
    """Print a progress bar"""
    progress = current / total
    filled = int(width * progress)
    bar = "█" * filled + "░" * (width - filled)
    percentage = progress * 100
    print(f"\r  Progress: |{bar}| {percentage:.1f}% ({current}/{total})", end="", flush=True)

def generate_synthetic_images(num_images, verbose=False):
    """Simulate synthetic image generation"""
    print_banner("SYNTHETIC DATASET GENERATION")
    
    print(f"🎯 Target: Generate {num_images} synthetic images")
    print(f"🎨 Method: Advanced data augmentation + GAN synthesis")
    print()
    
    # Simulate initialization
    print("🔧 Initializing generators...")
    time.sleep(1)
    print("  ✓ Background generator loaded")
    print("  ✓ Object placement engine ready")
    print("  ✓ Lighting simulation initialized")
    print("  ✓ Noise patterns configured")
    
    # Simulate generation process
    print(f"\n🏭 Generating {num_images} synthetic images...")
    time.sleep(1)
    
    batch_size = min(50, max(10, num_images // 10))
    batches = (num_images + batch_size - 1) // batch_size
    
    generated_count = 0
    
    for batch in range(batches):
        batch_start = batch * batch_size
        batch_end = min((batch + 1) * batch_size, num_images)
        batch_count = batch_end - batch_start
        
        if verbose:
            print(f"\n  📦 Batch {batch + 1}/{batches}: Processing {batch_count} images...")
        
        # Simulate batch processing
        for i in range(batch_count):
            generated_count += 1
            
            # Simulate different generation techniques
            techniques = [
                "Background replacement",
                "Object augmentation", 
                "Lighting variation",
                "Perspective transformation",
                "Color space adjustment",
                "Texture synthesis"
            ]
            
            if verbose and random.random() < 0.1:  # Show details for ~10% of images
                technique = random.choice(techniques)
                print(f"    🎨 Image {generated_count}: {technique}")
            
            # Update progress bar
            if not verbose or generated_count % 10 == 0:
                print_progress_bar(generated_count, num_images)
            
            # Simulate processing time
            time.sleep(0.02 if verbose else 0.01)
    
    print()  # New line after progress bar
    
    # Simulate annotation generation
    print(f"\n📝 Generating annotations for {num_images} images...")
    time.sleep(1)
    
    annotation_types = ["bounding_boxes", "class_labels", "confidence_scores"]
    for ann_type in annotation_types:
        print(f"  ✓ Generated {ann_type}")
        time.sleep(0.5)
    
    # Simulate quality validation
    print("\n🔍 Validating generated dataset...")
    time.sleep(1)
    
    valid_images = num_images - random.randint(0, max(1, num_images // 100))
    invalid_images = num_images - valid_images
    
    print(f"  ✓ Valid images: {valid_images}")
    if invalid_images > 0:
        print(f"  ⚠️  Invalid images: {invalid_images} (regenerating...)")
        time.sleep(1)
        print(f"  ✓ Regenerated {invalid_images} images")
    
    # Simulate dataset statistics
    print(f"\n📊 Dataset Statistics:")
    print(f"  • Total images generated: {num_images}")
    print(f"  • Average objects per image: {random.uniform(2.1, 4.8):.1f}")
    print(f"  • Resolution: 640x640 pixels")
    print(f"  • Format: YOLO annotation format")
    
    # Simulate class distribution
    print(f"\n🏷️  Class distribution in synthetic data:")
    classes = ["person", "car", "truck", "bicycle", "motorcycle"]
    total_objects = int(num_images * random.uniform(2, 5))
    
    for i, cls in enumerate(classes):
        percentage = random.uniform(10, 30)
        count = int(total_objects * percentage / 100)
        print(f"  Class {i} ({cls}): {count} instances ({percentage:.1f}%)")
    
    print(f"\n✅ Synthetic dataset generation completed!")
    print(f"📁 Output: {num_images} images + annotations saved to ./synthetic_data/")
    
    return True

def main():
    parser = argparse.ArgumentParser(
        description="Generate synthetic training data for YOLO models",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_dataset.py --num-images 1000      # Generate 1000 images
  python generate_dataset.py --num-images 500 -v    # Generate with verbose output
  python generate_dataset.py --num-images 2000 --output ./custom_data/
        """
    )
    
    parser.add_argument(
        "--num-images", 
        type=int,
        default=500,
        help="Number of synthetic images to generate (default: 500)"
    )
    
    parser.add_argument(
        "--output", "-o",
        default="./synthetic_data",
        help="Output directory for generated data (default: ./synthetic_data)"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true", 
        help="Enable verbose output with detailed progress"
    )
    
    parser.add_argument(
        "--seed",
        type=int,
        help="Random seed for reproducible generation"
    )
    
    parser.add_argument(
        "--quality",
        choices=["fast", "balanced", "high"],
        default="balanced",
        help="Generation quality preset (default: balanced)"
    )
    
    args = parser.parse_args()
    
    # Set random seed if provided
    if args.seed:
        random.seed(args.seed)
        print(f"🎲 Random seed set to: {args.seed}")
    
    try:
        if args.verbose:
            print(f"🎯 Script: {Path(__file__).name}")
            print(f"📁 Output directory: {args.output}")
            print(f"🔢 Number of images: {args.num_images}")
            print(f"⚡ Quality preset: {args.quality}")
            print()
        
        # Validate arguments
        if args.num_images <= 0:
            raise ValueError("Number of images must be positive")
        
        if args.num_images > 50000:
            print("⚠️  Warning: Generating >50,000 images may take a long time")
            print("   Consider using smaller batches for better progress tracking")
        
        # Run generation
        success = generate_synthetic_images(args.num_images, args.verbose)
        
        if success:
            print(f"\n🎉 Script completed successfully!")
            print(f"💾 Generated {args.num_images} images in {args.output}")
            sys.exit(0)
        else:
            print(f"\n❌ Script failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Script interrupted by user")
        sys.exit(130)
    except ValueError as e:
        print(f"\n❌ Invalid argument: {e}")
        sys.exit(2)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

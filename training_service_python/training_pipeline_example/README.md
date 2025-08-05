# YOLO Training Pipeline Example Scripts

This directory contains example Python scripts that demonstrate a complete YOLO training pipeline. These scripts are designed to work with the configurable training system and provide realistic output without requiring actual ML libraries.

## 📁 Scripts Overview

### `validate_data.py`
**Purpose**: Dataset validation and cleaning operations

**Features**:
- Dataset structure validation
- File count analysis
- Class distribution checking
- Image quality validation
- Annotation format verification
- Dataset cleaning operations (duplicate removal, annotation fixes)

**Usage**:
```bash
# Basic validation
python validate_data.py

# Validation with cleaning
python validate_data.py --clean

# Verbose output
python validate_data.py --verbose

# Custom data path
python validate_data.py --data-path /path/to/dataset
```

### `generate_dataset.py`
**Purpose**: Synthetic dataset generation with progress tracking

**Features**:
- Configurable number of images
- Realistic progress bars
- Batch processing simulation
- Quality validation
- Class distribution reporting
- Multiple generation techniques simulation

**Usage**:
```bash
# Generate 500 images (default)
python generate_dataset.py

# Generate specific number
python generate_dataset.py --num-images 1000

# Verbose output with batch details
python generate_dataset.py --num-images 200 --verbose

# Custom output directory
python generate_dataset.py --num-images 100 --output ./my_data/
```

### `train.py`
**Purpose**: YOLO model training simulation with realistic metrics

**Features**:
- Epoch-by-epoch training simulation
- Realistic loss curves (decreasing over time)
- YOLO-style output format
- Validation metrics (precision, recall, mAP)
- Learning rate scheduling
- Progress tracking with GPU memory usage
- Model checkpoint saving simulation

**Usage**:
```bash
# Basic training
python train.py --model yolov8n.pt --epochs 50

# Quick test training
python train.py --model yolov8s.pt --epochs 5

# Verbose training with batch details  
python train.py --model custom.pt --epochs 25 --verbose

# Custom hyperparameters
python train.py --model yolov8n.pt --epochs 100 --batch-size 32 --learning-rate 0.001
```

## 🎯 Integration with Pipeline Config

These scripts are referenced in `frontend/config/training-pipeline.json`:

```json
{
  "pipeline": {
    "stages": [
      {
        "id": "validate",
        "scripts": [
          {"script": "training_yolov8/validate_data.py", "args": []},
          {"script": "training_yolov8/validate_data.py", "args": ["--clean"]}
        ]
      },
      {
        "id": "generate", 
        "scripts": [
          {"script": "training_yolov8/generate_dataset.py", "args": ["--num-images", "{synthetic_images}"]}
        ]
      },
      {
        "id": "train",
        "scripts": [
          {"script": "training_yolov8/train.py", "args": ["--model", "{model_path}", "--epochs", "{epochs}"]}
        ]
      }
    ]
  }
}
```

## 🚀 Realistic Output Examples

### Validation Output
```
============================================================
  DATASET VALIDATION
============================================================
🔍 Checking dataset structure...
  ✓ Found: data/train/images
  ✓ Found: data/train/labels
  ✓ Found: data/val/images
  ✓ Found: data/val/labels

📊 Analyzing dataset contents...
  • Training images: 1047
  • Validation images: 312
  • Total images: 1359

🏷️  Class distribution analysis...
  Class 0 (person): 234 instances
  Class 1 (car): 189 instances
  Class 2 (truck): 156 instances
  Class 3 (bicycle): 98 instances
  Class 4 (motorcycle): 127 instances

✅ Dataset validation completed successfully!
```

### Training Output
```
============================================================
  YOLO MODEL TRAINING
============================================================
🎯 Model: yolov8n.pt
📊 Epochs: 25
⚡ Device: CUDA (GPU 0)

🚀 Starting training for 25 epochs...
      Epoch   GPU_mem       box_loss   cls_loss   dfl_loss  Instances       Size

==================== Epoch 1/25 (4.0%) ====================
Learning Rate: 0.010000
Batch Size: 16
Total Batches: 67

Epoch   1/25: GPU_mem: 3.2G, box_loss: 2.451, cls_loss: 1.823, dfl_loss: 1.156, Instances: 28, Size: 640

🔍 Running validation...
                 all         28      640      0.678      0.734     0.712     0.523
💾 Saving best model checkpoint (mAP@0.5 = 0.712)
```

## 🔧 Customization

### Adding New Scripts
1. Create your script in this directory
2. Follow the output format patterns (emojis, progress bars, metrics)
3. Add proper argument parsing with `argparse`
4. Update the pipeline configuration to reference your script

### Output Format Guidelines
- Use emojis for visual clarity (🔍, ✅, ⚠️, 📊, etc.)
- Include progress indicators for long operations
- Print realistic metrics that change over time
- Use consistent formatting for easy parsing
- Include error handling and graceful exits

### Script Template
```python
#!/usr/bin/env python3
import argparse
import time
import sys

def print_banner(title):
    print("=" * 60)
    print(f"  {title}")
    print("=" * 60)

def main():
    parser = argparse.ArgumentParser(description="Your script description")
    parser.add_argument("--param", help="Parameter description")
    args = parser.parse_args()
    
    try:
        print_banner("YOUR OPERATION")
        # Your logic here
        print("✅ Operation completed successfully!")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## 🧪 Testing

Run the test script to verify all example scripts work correctly:

```bash
python test_scripts.py
```

This will run each script with sample parameters and verify they execute without errors.

## 📝 Notes

- These scripts are **examples** and don't perform actual ML operations
- They're designed to demonstrate realistic training pipeline output
- The scripts use `time.sleep()` to simulate processing time
- Metrics are randomly generated but follow realistic patterns
- All scripts support `--help` for detailed usage information

## 🎯 Next Steps

To create a real training pipeline:

1. Replace the simulation code with actual ML operations
2. Integrate with your preferred ML framework (PyTorch, TensorFlow, etc.)
3. Add real dataset loading and processing
4. Implement actual model training and validation
5. Add proper error handling and recovery mechanisms
6. Include GPU detection and memory management
7. Add support for distributed training if needed

The structure and interface patterns demonstrated here provide a solid foundation for building production-ready training pipelines!

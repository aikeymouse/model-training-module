# YOLO Training Scripts

This directory contains Python scripts for generating synthetic datasets and training YOLOv8 models for object detection.

## Scripts Overview

### 1. `generate_dataset.py`
Generates synthetic datasets by combining background images with target objects (e.g., cursors) at random positions and scales.

### 2. `train_yolov8.py` 
Trains YOLOv8 models using the generated datasets and produces comprehensive training reports.

---

## generate_dataset.py

### Purpose
Creates a synthetic dataset for YOLO training by:
- Placing target objects at random positions on background images
- Maintaining realistic object sizes (20-40px for cursors)
- Generating proper YOLO format labels with bounding box coordinates
- Supporting custom dataset integration

### Usage

```bash
python generate_dataset.py [OPTIONS]
```

### Command Line Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--num-images` | int | 500 | Number of synthetic images to generate |
| `--width` | int | 640 | Width of output images |
| `--height` | int | 640 | Height of output images |
| `--custom-dataset` | str | None | Path to custom dataset directory to include |
| `--resize-method` | str | 'pad' | Resize method: 'pad' or 'crop' |
| `--preset-size` | str | 'custom' | Preset sizes: 'yolo-s', 'yolo-m', 'yolo-l', 'custom' |
| `--target-name` | str | 'cursor' | Name of the target object being detected |

### Preset Sizes

- **yolo-s**: 640×384 (fast training, smaller models)
- **yolo-m**: 832×512 (balanced performance)
- **yolo-l**: 1024×640 (high resolution, better accuracy)
- **custom**: Use --width and --height values

### Examples

```bash
# Generate 1000 images with default cursor detection
python generate_dataset.py --num-images 1000

# Generate dataset with medium preset size
python generate_dataset.py --preset-size yolo-m --num-images 500

# Generate dataset for custom target object
python generate_dataset.py --target-name "mouse" --num-images 750

# Include custom dataset and use crop resize method
python generate_dataset.py --custom-dataset /path/to/custom/data --resize-method crop

# High resolution training dataset
python generate_dataset.py --preset-size yolo-l --num-images 2000
```

### Directory Structure Required

```
training_scripts/
├── data/
│   ├── backgrounds/          # Background images (.jpg)
│   ├── cursors/             # Target object images (.png with transparency)
│   └── generated_dataset/   # Output directory (auto-created)
│       ├── images/          # Generated training images
│       └── labels/          # YOLO format label files
```

### Output Format

- **Images**: JPEG format with specified dimensions
- **Labels**: YOLO format text files with normalized coordinates
- **Naming**: `synth_cursor_XXXX.jpg` and `synth_cursor_XXXX.txt`

---

## train_yolov8.py

### Purpose
Trains YOLOv8 models using synthetic datasets and provides:
- Automated dataset splitting (80% train, 20% validation)
- Model training with configurable parameters
- Comprehensive HTML and text reports
- Metrics extraction and visualization
- Model file management with timestamps

### Usage

```bash
python train_yolov8.py [OPTIONS]
```

### Command Line Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--epochs` | int | 100 | Number of training epochs |
| `--batch-size` | int | 16 | Batch size for training |
| `--img-size` | int | 640 | Square image size (use with --width/--height for custom) |
| `--width` | int | None | Custom image width |
| `--height` | int | None | Custom image height |
| `--preset-size` | str | None | Preset sizes: 'yolo-s', 'yolo-m', 'yolo-l', 'hd' |
| `--skip-install` | flag | False | Skip dependency installation |
| `--model` | str | 'yolov8n.pt' | Base model to use for training |
| `--target-name` | str | 'cursor' | Name of the target object being detected |

### Preset Sizes

- **yolo-s**: 640×384 (16:9.6 ratio)
- **yolo-m**: 832×512 (16:9.7 ratio) 
- **yolo-l**: 1024×640 (16:10 ratio)
- **hd**: 1280×720 (true 16:9 HD)

### Examples

```bash
# Basic training with default parameters
python train_yolov8.py

# Custom training configuration
python train_yolov8.py --epochs 50 --batch-size 8 --preset-size yolo-m

# High resolution training
python train_yolov8.py --preset-size hd --epochs 200 --batch-size 4

# Custom target object training
python train_yolov8.py --target-name "mouse" --epochs 75

# Use different base model
python train_yolov8.py --model yolov8s.pt --epochs 150

# Custom image dimensions
python train_yolov8.py --width 1920 --height 1080 --batch-size 2
```

### Automatic Batch Size Adjustment

The script automatically adjusts batch size based on image resolution:
- Very large images (>800k pixels): batch size 2
- Large images (>400k pixels): batch size 4  
- Medium images (>250k pixels): batch size 8
- Default: batch size 16

### Output Files

All output files use the format: `{target_name}_model_{timestamp}`

1. **Model File** (`.pt`): Trained YOLOv8 model
2. **Info File** (`.txt`): Training configuration and metrics
3. **HTML Report** (`.html`): Comprehensive visual report with:
   - Training configuration summary
   - Performance metrics (Precision, Recall, mAP)
   - Training curves and visualizations
   - Confusion matrix analysis

### Training Metrics

The script tracks and reports:
- **Precision (P)**: Accuracy of positive predictions
- **Recall (R)**: Ability to find all positive instances  
- **mAP50**: Mean Average Precision at 50% IoU threshold
- **mAP50-95**: Mean Average Precision across IoU thresholds 0.5-0.95

### Memory Management

- Automatic memory monitoring during training
- CPU-only training for consistent performance
- Garbage collection after training completion
- Process memory tracking and reporting

---

## Complete Workflow Example

```bash
# 1. Generate training dataset
python generate_dataset.py --target-name "cursor" --preset-size yolo-m --num-images 1000

# 2. Train the model
python train_yolov8.py --target-name "cursor" --preset-size yolo-m --epochs 100 --batch-size 8

# 3. Check results in models/ directory:
#    - cursor_model_20250805_143022.pt    (trained model)
#    - cursor_model_20250805_143022.txt   (training info)
#    - cursor_model_20250805_143022.html  (visual report)
```

## Dependencies

### For generate_dataset.py:
- PIL/Pillow
- NumPy
- Python standard library (os, random, shutil, glob, argparse)

### For train_yolov8.py:
- ultralytics (YOLOv8)
- scikit-learn
- PyYAML
- OpenCV (cv2)
- PIL/Pillow
- NumPy
- psutil

## Directory Structure After Training

```
training_scripts/
├── data/
│   ├── backgrounds/
│   ├── cursors/
│   ├── generated_dataset/
│   └── yolo_dataset/        # Auto-created during training
│       ├── images/
│       │   ├── train/       # 80% of images
│       │   └── val/         # 20% of images
│       ├── labels/
│       │   ├── train/       # Training labels
│       │   └── val/         # Validation labels
│       └── dataset.yaml     # YOLO dataset configuration
├── models/                  # Output directory for trained models
│   ├── {target}_model_{timestamp}.pt
│   ├── {target}_model_{timestamp}.txt
│   └── {target}_model_{timestamp}.html
└── runs/                   # YOLOv8 training runs (auto-created)
    └── train/
        └── {target}_yolov8/
```

## Best Practices

1. **Dataset Size**: Use 500-2000 images for good results
2. **Image Quality**: Ensure backgrounds are representative of real use cases
3. **Object Variety**: Include diverse target object appearances and orientations
4. **Validation**: Check HTML reports for training curves and metrics
5. **Model Selection**: Start with yolov8n.pt for speed, use yolov8s.pt or larger for accuracy
6. **Batch Size**: Let auto-adjustment handle memory constraints
7. **Epochs**: Monitor validation metrics to avoid overfitting

## Troubleshooting

- **Memory Issues**: Reduce batch size or use smaller image dimensions
- **Poor Performance**: Increase dataset size or training epochs
- **Slow Training**: Use smaller image sizes or reduce batch size
- **Missing Dependencies**: Run without `--skip-install` flag

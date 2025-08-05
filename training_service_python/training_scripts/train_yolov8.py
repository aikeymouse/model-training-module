import os
import shutil
import argparse
import subprocess
import sys
import gc
from datetime import datetime

def install_dependencies():
    """Installs ultralytics and its dependencies."""
    print("--> Checking/Installing dependencies (ultralytics, scikit-learn, pyyaml)...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "ultralytics", "scikit-learn", "pyyaml"], check=True)
        print("Dependencies installed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error: Failed to install dependencies. {e}", file=sys.stderr)
        sys.exit(1)

def create_dataset_yaml(data_dir, train_dir, val_dir, target_name='cursor'):
    """Creates the dataset.yaml file required by YOLOv8."""
    import yaml
    print("\n--> Creating dataset.yaml file...")
    
    yaml_path = os.path.join(data_dir, 'dataset.yaml')
    
    data = {
        'train': os.path.abspath(train_dir),
        'val': os.path.abspath(val_dir),
        'nc': 1,
        'names': [target_name]
    }
    
    with open(yaml_path, 'w') as f:
        yaml.dump(data, f, sort_keys=False)
        
    print(f"'{yaml_path}' created successfully.")
    return yaml_path

def generate_html_report(html_filepath, timestamp, results_dir, epochs, batch_size, img_size, model_used, metrics, train_count=0, val_count=0):
    """Generates an HTML report with training results and metrics."""
    import base64
    
    # Try to read and encode images from results directory
    def encode_image_to_base64(image_path):
        try:
            with open(image_path, 'rb') as img_file:
                return base64.b64encode(img_file.read()).decode('utf-8')
        except:
            return None
    
    # Look for common result images
    results_images = {}
    potential_images = [
        ('confusion_matrix.png', 'Confusion Matrix'),
        ('results.png', 'Training Results'),
        # ('train_batch0.jpg', 'Training Batch Sample'),
        # ('val_batch0_pred.jpg', 'Validation Predictions'),
        # ('val_batch0_labels.jpg', 'Validation Labels'),
        ('F1_curve.png', 'F1 Curve'),
        ('P_curve.png', 'Precision Curve'),
        ('R_curve.png', 'Recall Curve'),
        ('PR_curve.png', 'Precision-Recall Curve')
    ]
    
    for img_file, img_title in potential_images:
        img_path = os.path.join(results_dir, img_file)
        if os.path.exists(img_path):
            encoded = encode_image_to_base64(img_path)
            if encoded:
                results_images[img_title] = encoded
    
    # Generate HTML content
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YOLO Training Report - {timestamp}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        
        .header h1 {{
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }}
        
        .header .subtitle {{
            margin-top: 10px;
            font-size: 1.1em;
            opacity: 0.9;
        }}
        
        .content {{
            padding: 30px;
        }}
        
        .section {{
            margin-bottom: 40px;
            background: #f8f9fa;
            border-radius: 10px;
            padding: 25px;
            border-left: 5px solid #3498db;
        }}
        
        .section h2 {{
            margin-top: 0;
            color: #2c3e50;
            font-size: 1.8em;
            font-weight: 500;
        }}
        
        .config-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }}
        
        .config-item {{
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e1e8ed;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        
        .config-label {{
            font-weight: 600;
            color: #3498db;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        .config-value {{
            font-size: 1.2em;
            color: #2c3e50;
            margin-top: 5px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
        }}
        
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }}
        
        .metric-card {{
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid #e1e8ed;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }}
        
        .metric-card:hover {{
            transform: translateY(-5px);
        }}
        
        .metric-name {{
            font-size: 0.9em;
            color: #7f8c8d;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        
        .metric-value {{
            font-size: 2em;
            font-weight: 700;
            color: #2c3e50;
            margin-top: 10px;
        }}
        
        .images-section {{
            margin-top: 30px;
        }}
        
        .image-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }}
        
        .image-card {{
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }}
        
        .image-card img {{
            width: 100%;
            height: auto;
            display: block;
        }}
        
        .image-title {{
            padding: 15px;
            font-weight: 600;
            color: #2c3e50;
            background: #f8f9fa;
            border-top: 1px solid #e1e8ed;
        }}
        
        .image-annotation {{
            padding: 10px 15px;
            font-size: 0.75em;
            color: #6c757d;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
            line-height: 1.4;
            font-style: italic;
        }}
        
        .timestamp {{
            text-align: center;
            color: #7f8c8d;
            font-size: 0.9em;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e1e8ed;
        }}
        
        .no-images {{
            text-align: center;
            color: #7f8c8d;
            font-style: italic;
            padding: 40px;
            background: white;
            border-radius: 10px;
            border: 2px dashed #e1e8ed;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 YOLO Training Report</h1>
            <div class="subtitle">Target Detection Model Training Results</div>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>📋 Training Configuration</h2>
                <div class="config-grid">
                    <div class="config-item">
                        <div class="config-label">Epochs</div>
                        <div class="config-value">{epochs}</div>
                    </div>
                    <div class="config-item">
                        <div class="config-label">Batch Size</div>
                        <div class="config-value">{batch_size}</div>
                    </div>
                    <div class="config-item">
                        <div class="config-label">Image Size</div>
                        <div class="config-value">{img_size if isinstance(img_size, str) else (f"{img_size[0]}×{img_size[1]}" if isinstance(img_size, tuple) else f"{img_size}×{img_size}")}</div>
                    </div>
                    <div class="config-item">
                        <div class="config-label">Base Model</div>
                        <div class="config-value">{os.path.basename(model_used)}</div>
                    </div>
                    <div class="config-item">
                        <div class="config-label">Training Images</div>
                        <div class="config-value">{train_count:,}</div>
                    </div>
                    <div class="config-item">
                        <div class="config-label">Validation Images</div>
                        <div class="config-value">{val_count:,}</div>
                    </div>"""
        
    html_content += """
                    </div>
                </div>"""
    
    # Add metrics section if available
    if metrics:
        precision = metrics.get('metrics/precision(B)', 0.0)
        recall = metrics.get('metrics/recall(B)', 0.0)
        map50 = metrics.get('metrics/mAP50(B)', 0.0)
        map50_95 = metrics.get('metrics/mAP50-95(B)', 0.0)
        
        html_content += f"""
            <div class="section">
                <h2>📊 Performance Metrics</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-name">Precision</div>
                        <div class="metric-value">{precision:.3f}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-name">Recall</div>
                        <div class="metric-value">{recall:.3f}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-name">mAP@50</div>
                        <div class="metric-value">{map50:.3f}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-name">mAP@50-95</div>
                        <div class="metric-value">{map50_95:.3f}</div>
                    </div>
                </div>
            </div>"""
    
    # Add images section
    html_content += """
            <div class="section">
                <h2>📈 Training Results & Visualizations</h2>"""
    
    if results_images:
        html_content += '<div class="image-grid">'
        for title, encoded_img in results_images.items():
            # Add specific annotations for key visualizations
            annotation = ""
            if title == "Confusion Matrix":
                annotation = '<div class="image-annotation">Shows model accuracy: High numbers on diagonal (correct predictions) = good performance. Low off-diagonal numbers (mistakes) = fewer errors. For target detection: True Positives (targets found correctly), False Positives (background detected as target), False Negatives (missed targets).</div>'
            elif title == "Training Results":
                annotation = '<div class="image-annotation">Training progress over epochs: Loss curves should decrease and stabilize. Precision/Recall/mAP should increase. Train and validation curves close together indicates good generalization without overfitting. Smooth curves suggest proper learning rate.</div>'
            
            html_content += f"""
                    <div class="image-card">
                        <img src="data:image/png;base64,{encoded_img}" alt="{title}">
                        <div class="image-title">{title}</div>{annotation}
                    </div>"""
        html_content += '</div>'
    else:
        html_content += '''
                <div class="no-images">
                    No training result images found in the results directory.<br>
                    Check the training output directory for manual review.
                </div>'''
    
    html_content += f"""
            </div>
            
            <div class="timestamp">
                Report generated on {datetime.now().strftime('%Y-%m-%d at %H:%M:%S')}
            </div>
        </div>
    </div>
</body>
</html>"""
    
    # Write HTML file
    with open(html_filepath, 'w', encoding='utf-8') as f:
        f.write(html_content)

def run_training(script_dir, data_yaml_path, epochs, batch_size, img_size, project_name, model_name, model_to_use, target_name='cursor'):
    """Executes the YOLOv8 training process."""
    print("\n--- Starting YOLOv8 Training ---")
    print(f"   Data config: {data_yaml_path}")
    print(f"   Epochs: {epochs}")
    print(f"   Batch size: {batch_size}")
    print(f"   Image size: {img_size}")
    print(f"   Model: {model_to_use}")
    print("---------------------------------\n")

    try:
        from ultralytics import YOLO

        # Construct the full path to the model.
        # If the path is not absolute, it's considered relative to the script's directory.
        model_path = os.path.abspath(os.path.join(script_dir, model_to_use))

        if not os.path.exists(model_path):
            print(f"Error: Model not found at '{model_path}'", file=sys.stderr)
            print("Please check the path provided via the --model argument.", file=sys.stderr)
            sys.exit(1)
        
        print(f"--> Using model for training: {model_path}")
        # Load the model
        model = YOLO(model_path)

        # Train the model with memory-efficient settings
        results = model.train(
            data=data_yaml_path,
            epochs=epochs,
            batch=batch_size,
            imgsz=img_size,
            project=project_name,
            name=model_name,
            exist_ok=True, # Allow overwriting existing project/name
            workers=2,     # Reduce data loading workers to save memory
            device='cpu',  # Force CPU training for better memory management
            cache=False,   # Disable caching to save memory
            amp=False,     # Disable automatic mixed precision to avoid CUDA issues
            verbose=True,  # Keep verbose output for debugging
            save_period=10 # Save checkpoints every 10 epochs to prevent data loss
        )
        
        print("\n--- Training completed successfully! ---")
        print(f"Your trained model and results are in the '{results.save_dir}' directory.")
        
        # Extract dataset information - use known paths since we created the dataset in this script
        dataset_train_count = 0
        dataset_val_count = 0
        
        # Use the paths we know from our dataset creation
        script_dir = os.path.dirname(__file__)
        known_train_dir = os.path.join(script_dir, 'data', 'yolo_dataset', 'images', 'train')
        known_val_dir = os.path.join(script_dir, 'data', 'yolo_dataset', 'images', 'val')
        
        print(f"Debug: Using known dataset paths:")
        print(f"Debug: Train dir: {known_train_dir}")
        print(f"Debug: Val dir: {known_val_dir}")
        
        try:
            # Count images in train directory
            if os.path.exists(known_train_dir):
                train_files = [f for f in os.listdir(known_train_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'))]
                dataset_train_count = len(train_files)
                print(f"Debug: Found {dataset_train_count} training images in {known_train_dir}")
            else:
                print(f"Debug: Training directory does not exist: {known_train_dir}")
            
            # Count images in val directory
            if os.path.exists(known_val_dir):
                val_files = [f for f in os.listdir(known_val_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'))]
                dataset_val_count = len(val_files)
                print(f"Debug: Found {dataset_val_count} validation images in {known_val_dir}")
            else:
                print(f"Debug: Validation directory does not exist: {known_val_dir}")
            
            print(f"Dataset info extracted: {dataset_train_count} train, {dataset_val_count} val images")
            
        except Exception as e:
            print(f"Warning: Could not count dataset images: {e}")
            print("Dataset counts will remain at 0 in reports - check dataset directory manually")
            # Don't use hardcoded fallback values - let them remain 0 if counting fails
        
        # Extract and display training metrics
        try:
            # Get the best metrics from the training results
            metrics = results.results_dict if hasattr(results, 'results_dict') else None
            
            if metrics:
                # Extract key metrics (these are the final validation metrics)
                precision = metrics.get('metrics/precision(B)', 0.0)
                recall = metrics.get('metrics/recall(B)', 0.0) 
                map50 = metrics.get('metrics/mAP50(B)', 0.0)
                map50_95 = metrics.get('metrics/mAP50-95(B)', 0.0)
                
                print("\n--- Final Training Metrics ---")
                print(f"Precision (P):    {precision:.3f}")
                print(f"Recall (R):       {recall:.3f}")
                print(f"mAP50:            {map50:.3f}")
                print(f"mAP50-95:         {map50_95:.3f}")
                print("-" * 32)
            else:
                # Alternative method: try to access results from the model's validator
                if hasattr(results, 'maps') and results.maps:
                    map50 = results.maps[0] if len(results.maps) > 0 else 0.0
                    print(f"\n--- Training Metrics ---")
                    print(f"mAP50: {map50:.3f}")
                    print("-" * 25)
                else:
                    print("\n--- Training Metrics ---")
                    print("Detailed metrics not available in results object")
                    print("Check the results directory for detailed metrics files")
                    print("-" * 50)
                    
        except Exception as e:
            print(f"\n--- Warning: Could not extract training metrics: {e} ---")
            print("Training completed but metrics extraction failed")
            print("-" * 55)
        
        # The `results` object no longer has a `.best` attribute in recent ultralytics versions.
        # The path to the best model is located in the save directory.
        best_model_path = os.path.join(results.save_dir, 'weights', 'best.pt')
        
        if not os.path.exists(best_model_path):
             print(f"Error: Could not find the best model at '{best_model_path}'", file=sys.stderr)
             # As a fallback, try to copy the last model.
             last_model_path = os.path.join(results.save_dir, 'weights', 'last.pt')
             if os.path.exists(last_model_path):
                 print("Falling back to using the 'last.pt' model.")
                 best_model_path = last_model_path
             else:
                 print("Error: Could not find 'last.pt' either.", file=sys.stderr)
                 sys.exit(1)

        # --- Validate the best model and capture output ---
        print("\n--> Using training results for model validation metrics...")
        
        # --- Save the model and validation info ---
        script_dir = os.path.dirname(__file__)
        target_model_dir = os.path.join(script_dir, '..', 'models')
        os.makedirs(target_model_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Prepare comprehensive model info including metrics
        model_info = f"{target_name.title()} Model Training Results - {timestamp}\n"
        model_info += "=" * 50 + "\n\n"
        
        # Add training configuration
        model_info += f"Training Configuration:\n"
        model_info += f"  Epochs: {epochs}\n"
        model_info += f"  Batch Size: {batch_size}\n"
        model_info += f"  Image Size: {img_size if isinstance(img_size, str) else (f'{img_size[0]}×{img_size[1]}' if isinstance(img_size, tuple) else f'{img_size}×{img_size}')}\n"
        model_info += f"  Base Model: {model_to_use}\n"
        if dataset_train_count > 0:
            model_info += f"  Training Images: {dataset_train_count}\n"
            model_info += f"  Validation Images: {dataset_val_count}\n"
        model_info += "\n"
        
        # Add training metrics if available
        try:
            metrics = results.results_dict if hasattr(results, 'results_dict') else None
            if metrics:
                precision = metrics.get('metrics/precision(B)', 0.0)
                recall = metrics.get('metrics/recall(B)', 0.0)
                map50 = metrics.get('metrics/mAP50(B)', 0.0)
                map50_95 = metrics.get('metrics/mAP50-95(B)', 0.0)
                
                model_info += f"Final Training Metrics:\n"
                model_info += f"  Precision (P):    {precision:.3f}\n"
                model_info += f"  Recall (R):       {recall:.3f}\n"
                model_info += f"  mAP50:            {map50:.3f}\n"
                model_info += f"  mAP50-95:         {map50_95:.3f}\n\n"
            else:
                model_info += "Training Metrics: Not available in results object\n\n"
        except Exception as e:
            model_info += f"Training Metrics: Error extracting metrics - {e}\n\n"
        
        # Save the complete model info
        # Use consistent naming: {target_name}_model_{timestamp}.txt to match {target_name}_model_{timestamp}.pt
        info_filename = f'{target_name}_model_{timestamp}.txt'
        info_filepath = os.path.join(target_model_dir, info_filename)
        with open(info_filepath, 'w') as f:
            f.write(model_info)
        print(f"Model info saved to: {info_filepath}")

        # Save the model
        final_model_name = f'{target_name}_model_{timestamp}.pt'
        final_model_path = os.path.join(target_model_dir, final_model_name)
        shutil.copy(best_model_path, final_model_path)
        print(f"Best model copied to: {final_model_path}")

        # Generate and save HTML report
        html_report_name = f'{target_name}_model_{timestamp}.html'
        html_report_path = os.path.join(target_model_dir, html_report_name)
        generate_html_report(
            html_report_path,
            timestamp, 
            results.save_dir, 
            epochs, 
            batch_size, 
            img_size, 
            model_to_use,
            metrics if 'metrics' in locals() and metrics else None,
            dataset_train_count,
            dataset_val_count
        )
        print(f"HTML report saved to: {html_report_path}")

        # Explicit memory cleanup after all processing is complete
        print("Cleaning up memory...")
        del model
        del results
        gc.collect()  # Force garbage collection

    except ImportError:
        print("Error: ultralytics is not installed. Please run the script without --skip-install.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n--- An error occurred during training: {e} ---", file=sys.stderr)
        sys.exit(1)

def main(args):
    # --- 1. Install dependencies ---
    if not args.skip_install:
        install_dependencies()

    # It's important to import these after the installation step
    from sklearn.model_selection import train_test_split
    from glob import glob

    # --- 2. Define Paths ---
    script_dir = os.path.dirname(__file__)
    source_dataset_dir = os.path.join(script_dir, 'data', 'generated_dataset')
    
    if not os.path.exists(source_dataset_dir):
        print(f"Error: Generated dataset not found at '{source_dataset_dir}'", file=sys.stderr)
        print("Please run 'generate_dataset.py' first to create the synthetic data.", file=sys.stderr)
        sys.exit(1)

    final_data_dir = os.path.join(script_dir, 'data', 'yolo_dataset')
    train_img_dir = os.path.join(final_data_dir, 'images', 'train')
    val_img_dir = os.path.join(final_data_dir, 'images', 'val')
    train_lbl_dir = os.path.join(final_data_dir, 'labels', 'train')
    val_lbl_dir = os.path.join(final_data_dir, 'labels', 'val')

    # --- 3. Clean up previous dataset ---
    if os.path.exists(final_data_dir):
        print(f"--> Cleaning up existing dataset directory: '{final_data_dir}'")
        shutil.rmtree(final_data_dir)

    # --- 4. Create new directories ---
    print("--> Creating new YOLO dataset directories...")
    os.makedirs(train_img_dir)
    os.makedirs(val_img_dir)
    os.makedirs(train_lbl_dir)
    os.makedirs(val_lbl_dir)

    # --- 5. Split data and move files ---
    print("--> Splitting data into training and validation sets...")
    image_files = sorted(glob(os.path.join(source_dataset_dir, 'images', '*.jpg')))
    label_files = sorted(glob(os.path.join(source_dataset_dir, 'labels', '*.txt')))

    if not image_files:
        print(f"Error: No images found in '{os.path.join(source_dataset_dir, 'images')}'", file=sys.stderr)
        sys.exit(1)

    # Split the data
    train_imgs, val_imgs, train_lbls, val_lbls = train_test_split(
        image_files, label_files, test_size=0.2, random_state=42
    )

    # Function to copy files
    def copy_files(files, dest_dir):
        for f in files:
            shutil.copy(f, dest_dir)

    # Copy files to their new homes
    print(f"Copying {len(train_imgs)} images to the training set...")
    copy_files(train_imgs, train_img_dir)
    copy_files(val_imgs, val_img_dir)
    copy_files(train_lbls, train_lbl_dir)
    copy_files(val_lbls, val_lbl_dir)

    print(f"   Training set: {len(train_imgs)} images")
    print(f"   Validation set: {len(val_imgs)} images")

    # --- 6. Create dataset.yaml ---
    yaml_path = create_dataset_yaml(final_data_dir, train_img_dir, val_img_dir, args.target_name)

    # --- 7. Run Training ---
    run_training(
        script_dir=script_dir,
        data_yaml_path=yaml_path,
        epochs=args.epochs,
        batch_size=args.batch_size,
        img_size=args.img_size,
        project_name='runs/train',
        model_name=f'{args.target_name}_yolov8',
        model_to_use=args.model,
        target_name=args.target_name
    )

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="YOLOv8 Training Script")
    parser.add_argument('--epochs', type=int, default=100, help='Number of training epochs.')
    parser.add_argument('--batch-size', type=int, default=16, help='Batch size for training.')
    parser.add_argument('--img-size', type=int, default=640, help='Image size for training (square). Use --width/--height for non-square.')
    parser.add_argument('--width', type=int, default=None, help='Image width for training (overrides --img-size).')
    parser.add_argument('--height', type=int, default=None, help='Image height for training (overrides --img-size).')
    parser.add_argument('--preset-size', type=str, choices=['yolo-s', 'yolo-m', 'yolo-l', 'hd'], default=None, help='Preset sizes: yolo-s (640x384), yolo-m (832x512), yolo-l (1024x640), hd (1280x720).')
    parser.add_argument('--skip-install', action='store_true', help='Skip the dependency installation step.')
    parser.add_argument('--model', type=str, default='yolov8n.pt', help='Model to use for training (e.g., "yolov8n.pt" or a path to a custom model).')
    parser.add_argument('--target-name', type=str, default='cursor', help='Name of the target object being detected. Default is "cursor".')
    
    args = parser.parse_args()
    
    # Handle preset sizes and width/height override
    if args.preset_size:
        if args.preset_size == 'yolo-s':
            img_width, img_height = 640, 384
        elif args.preset_size == 'yolo-m':
            img_width, img_height = 832, 512
        elif args.preset_size == 'yolo-l':
            img_width, img_height = 1024, 640
        elif args.preset_size == 'hd':
            img_width, img_height = 1280, 720  # True 16:9 HD resolution
        print(f"Using preset size '{args.preset_size}': {img_width}×{img_height}")
    elif args.width and args.height:
        img_width, img_height = args.width, args.height
        print(f"Using custom size: {img_width}×{img_height}")
    else:
        # Default to a reasonable 16:9-ish ratio instead of square
        img_width, img_height = 640, 384  # Changed from square 640x640
        print(f"Using default size: {img_width}×{img_height} (16:9 ratio)")
    
    # Update args for backward compatibility
    args.img_size = (img_width, img_height) if img_width != img_height else img_width
    
    # Auto-adjust batch size based on image size to prevent OOM
    if args.batch_size == 0:  # Only auto-adjust if using default batch size
        img_pixels = img_width * img_height
        if img_pixels > 800000:  # > 1024x640 or equivalent
            args.batch_size = 2
            print(f"Auto-adjusting batch size to {args.batch_size} for very large images ({img_width}×{img_height})")
        elif img_pixels > 400000:  # > 832x512 or equivalent (yolo-m)
            args.batch_size = 4
            print(f"Auto-adjusting batch size to {args.batch_size} for large images ({img_width}×{img_height})")
        elif img_pixels > 250000:  # > 640x384 or equivalent (yolo-s)
            args.batch_size = 8
            print(f"Auto-adjusting batch size to {args.batch_size} for medium images ({img_width}×{img_height})")
        # Keep default 16 for smaller images
    
    main(args)

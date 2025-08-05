import os
import random
import shutil
from glob import glob
from PIL import Image
import numpy as np
import argparse

def resize_with_aspect_ratio(image, target_size, method='pad'):
    """
    Resize image while maintaining aspect ratio.
    
    Args:
        image: PIL Image to resize
        target_size: (width, height) tuple for target size
        method: 'pad' (add black borders) or 'crop' (center crop)
    
    Returns:
        tuple: (resized_image, scale_x, scale_y)
    """
    original_width, original_height = image.size
    target_width, target_height = target_size
    
    # Calculate scale factors
    scale_x = target_width / original_width
    scale_y = target_height / original_height
    
    if method == 'pad':
        # Use the smaller scale to fit the image within target size
        scale = min(scale_x, scale_y)
        new_width = int(original_width * scale)
        new_height = int(original_height * scale)
        
        # Resize the image
        resized = image.resize((new_width, new_height), Image.LANCZOS)
        
        # Create a new image with target size and paste the resized image
        final_image = Image.new('RGBA', target_size, (0, 0, 0, 255))
        paste_x = (target_width - new_width) // 2
        paste_y = (target_height - new_height) // 2
        final_image.paste(resized, (paste_x, paste_y))
        
        # Return actual scale factors used
        return final_image, scale, scale
        
    elif method == 'crop':
        # Use the larger scale to fill the target size, then crop
        scale = max(scale_x, scale_y)
        new_width = int(original_width * scale)
        new_height = int(original_height * scale)
        
        # Resize the image
        resized = image.resize((new_width, new_height), Image.LANCZOS)
        
        # Calculate crop coordinates (center crop)
        crop_x = (new_width - target_width) // 2
        crop_y = (new_height - target_height) // 2
        final_image = resized.crop((crop_x, crop_y, crop_x + target_width, crop_y + target_height))
        
        return final_image, scale, scale
    
    else:
        raise ValueError("Method must be 'pad' or 'crop'")

def generate_data(
    backgrounds_path, 
    cursors_path, 
    output_dir, 
    num_images, 
    img_size=(640, 640),
    custom_dataset_path=None,
    resize_method='pad',
    target_name='cursor'
):
    """
    Generates a synthetic dataset and optionally includes a custom dataset.

    Args:
        backgrounds_path (str): Path to the directory of background images.
        cursors_path (str): Path to the directory of cursor images.
        output_dir (str): Directory to save the generated images and labels.
        num_images (int): The total number of synthetic images to generate.
        img_size (tuple): The (width, height) to resize the output images to.
        custom_dataset_path (str, optional): Path to a custom dataset to include. Defaults to None.
        resize_method (str): 'pad' (maintain aspect ratio with padding) or 'crop' (center crop). Default 'pad'.
        target_name (str): Name of the target object being detected. Default 'cursor'.
    """
    print(f"--- Starting Dataset Generation ---")
    print(f"   Backgrounds: {backgrounds_path}")
    print(f"   Target objects ({target_name}): {cursors_path}")
    print(f"   Output: {output_dir}")
    print(f"   Number of images: {num_images}")
    print(f"   Image size: {img_size}")
    if custom_dataset_path:
        print(f"   Custom dataset to include: {custom_dataset_path}")


    # --- 1. Setup Directories ---
    images_out_dir = os.path.join(output_dir, 'images')
    labels_out_dir = os.path.join(output_dir, 'labels')

    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
        print(f"Cleaned existing output directory: {output_dir}")

    os.makedirs(images_out_dir)
    os.makedirs(labels_out_dir)

    # --- 2. Load File Lists ---
    background_files = glob(os.path.join(backgrounds_path, '*.jpg'))
    cursor_files = glob(os.path.join(cursors_path, '*.png'))

    if not background_files:
        raise FileNotFoundError(f"No background images found in {backgrounds_path}")
    if not cursor_files:
        raise FileNotFoundError(f"No target images found in {cursors_path}")

    print(f"Found {len(background_files)} backgrounds and {len(cursor_files)} {target_name} objects.")

    # --- 3. Generate Synthetic Images ---
    print("\n--- Generating Synthetic Images ---")
    for i in range(num_images):
        # --- Choose random assets ---
        bg_path = random.choice(background_files)
        cursor_path = random.choice(cursor_files)

        # --- Open and process images ---
        background = Image.open(bg_path).convert("RGBA")
        cursor = Image.open(cursor_path).convert("RGBA")

        # --- New Logic: Paste small cursor on large background, then resize all at once ---

        # 1. Define a realistic, small size for the cursor (e.g., 20-40px height)
        # This size is relative to a typical screen, not the final 640x640 image.
        new_cursor_h = random.randint(20, 40)
        cursor_w, cursor_h = cursor.size
        if cursor_h > 0: # Avoid division by zero
            aspect_ratio = cursor_w / cursor_h
            new_cursor_w = int(new_cursor_h * aspect_ratio)
        else:
            new_cursor_w = 20 # Default width if height is 0

        # Resize the cursor to its small, realistic size
        cursor_resized = cursor.resize((new_cursor_w, new_cursor_h), Image.LANCZOS)

        # 2. Place the small cursor on the full-size background
        bg_w, bg_h = background.size
        max_x = bg_w - new_cursor_w
        max_y = bg_h - new_cursor_h
        
        # Ensure max_x and max_y are not negative if background is smaller than cursor
        if max_x < 0 or max_y < 0:
            # If the background is smaller than the cursor, we'll just place at 0,0
            # and let the final resize handle it. This is an edge case.
            paste_x = 0
            paste_y = 0
        else:
            paste_x = random.randint(0, max_x)
            paste_y = random.randint(0, max_y)

        # Paste using the alpha channel as a mask
        background.paste(cursor_resized, (paste_x, paste_y), cursor_resized)

        # 3. Resize maintaining aspect ratio with padding or cropping
        final_image, scale_x, scale_y = resize_with_aspect_ratio(background, img_size, resize_method)
        
        # Convert back to RGB for saving as JPEG
        final_image_rgb = final_image.convert("RGB")

        # --- Save image ---
        img_filename = f"synth_cursor_{i:04d}.jpg"
        final_image_rgb.save(os.path.join(images_out_dir, img_filename))

        # --- Calculate and save YOLO label based on the final resized image ---
        # The coordinates of the pasted cursor must be scaled by the actual scale used
        final_x = paste_x * scale_x
        final_y = paste_y * scale_y
        final_w = new_cursor_w * scale_x
        final_h = new_cursor_h * scale_y

        # If using 'pad' method and both scales are equal, account for padding offset
        if resize_method == 'pad' and scale_x == scale_y:  
            # Calculate the actual scaled dimensions and padding offsets
            actual_scaled_w = bg_w * scale_x
            actual_scaled_h = bg_h * scale_y
            pad_x = (img_size[0] - actual_scaled_w) / 2
            pad_y = (img_size[1] - actual_scaled_h) / 2
            
            final_x += pad_x
            final_y += pad_y

        x_center = final_x + final_w / 2
        y_center = final_y + final_h / 2

        # Ensure coordinates are within bounds
        x_center_norm = max(0, min(1, x_center / img_size[0]))
        y_center_norm = max(0, min(1, y_center / img_size[1]))
        width_norm = max(0, min(1, final_w / img_size[0]))
        height_norm = max(0, min(1, final_h / img_size[1]))

        label_content = f"0 {x_center_norm:.6f} {y_center_norm:.6f} {width_norm:.6f} {height_norm:.6f}"
        
        label_filename = f"synth_cursor_{i:04d}.txt"
        with open(os.path.join(labels_out_dir, label_filename), 'w') as f:
            f.write(label_content)

        if (i + 1) % 100 == 0:
            print(f"Generated {i + 1}/{num_images} synthetic images...")
    
    print(f"--- Synthetic dataset generation complete. ---")

    # --- 4. Include Custom Dataset ---
    if custom_dataset_path and os.path.exists(custom_dataset_path):
        print(f"\n--- Including Custom Dataset from {custom_dataset_path} ---")

        custom_images_src = os.path.join(custom_dataset_path, 'images')
        custom_labels_src = os.path.join(custom_dataset_path, 'labels')

        copied_images = 0
        if os.path.exists(custom_images_src):
            for img_file in glob(os.path.join(custom_images_src, '*.jpg')):
                shutil.copy(img_file, images_out_dir)
                copied_images += 1
        
        copied_labels = 0
        if os.path.exists(custom_labels_src):
            for label_file in glob(os.path.join(custom_labels_src, '*.txt')):
                shutil.copy(label_file, labels_out_dir)
                copied_labels += 1

        print(f"Copied {copied_images} images and {copied_labels} labels from custom dataset.")
    elif custom_dataset_path:
        print(f"\nCustom dataset path provided but not found: {custom_dataset_path}")


    print(f"\n--- Full dataset generation complete. ---")
    print(f"Images and labels saved in {output_dir}")


def sync_backgrounds(source_dir, dest_dir):
    """
    Copies files from source_dir to dest_dir if they don't already exist in dest_dir.
    """
    print(f"--- Syncing Backgrounds ---")
    print(f"   Source: {source_dir}")
    print(f"   Destination: {dest_dir}")

    if not os.path.exists(source_dir):
        print(f"Warning: Source directory for sync not found: {source_dir}")
        return

    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir)
        print(f"Created destination directory: {dest_dir}")

    source_files = os.listdir(source_dir)
    dest_files = os.listdir(dest_dir)
    
    copied_count = 0
    for filename in source_files:
        if filename not in dest_files:
            source_path = os.path.join(source_dir, filename)
            dest_path = os.path.join(dest_dir, filename)
            # Check if it's a file before copying
            if os.path.isfile(source_path):
                shutil.copy2(source_path, dest_path) # copy2 preserves metadata
                copied_count += 1
    
    if copied_count > 0:
        print(f"Copied {copied_count} new background file(s) from screenshots.")
    else:
        print("Backgrounds are already up to date.")
    print("--- Sync Complete ---\n")


if __name__ == '__main__':
    # --- Argument Parsing ---
    parser = argparse.ArgumentParser(description="Generate a synthetic dataset for YOLOv8 training.")
    parser.add_argument(
        '--num-images', 
        type=int, 
        default=500, 
        help='Number of synthetic images to generate. Default is 500.'
    )
    parser.add_argument(
        '--width', 
        type=int, 
        default=640, 
        help='Width of the output images. Default is 640.'
    )
    parser.add_argument(
        '--height', 
        type=int, 
        default=640, 
        help='Height of the output images. Default is 640.'
    )
    parser.add_argument(
        '--custom-dataset', 
        type=str, 
        default=None, 
        help='Path to custom dataset directory to include (optional). Should contain images/ and labels/ subdirectories.'
    )
    parser.add_argument(
        '--resize-method',
        type=str,
        choices=['pad', 'crop'],
        default='pad',
        help='Resize method: "pad" maintains aspect ratio with black borders, "crop" fills target size by cropping. Default is "pad".'
    )
    parser.add_argument(
        '--preset-size',
        type=str,
        choices=['yolo-s', 'yolo-m', 'yolo-l', 'custom'],
        default='custom',
        help='Preset image sizes: "yolo-s" (640x384), "yolo-m" (832x512), "yolo-l" (1024x640), "custom" (use --width/--height). Default is "custom".'
    )
    parser.add_argument(
        '--target-name',
        type=str,
        default='cursor',
        help='Name of the target object being detected. Default is "cursor".'
    )
    args = parser.parse_args()

    # Handle preset sizes (maintaining 16:9-ish aspect ratio for screen content)
    if args.preset_size == 'yolo-s':
        img_size = (640, 384)  # ~16:9.6 ratio, good for small/fast training
    elif args.preset_size == 'yolo-m':
        img_size = (832, 512)  # ~16:9.7 ratio, good balance
    elif args.preset_size == 'yolo-l':
        img_size = (1024, 640)  # 16:10 ratio, higher resolution
    else:  # custom
        img_size = (args.width, args.height)

    print(f"Using image size: {img_size[0]}x{img_size[1]} ({'custom' if args.preset_size == 'custom' else args.preset_size})")

    # Define paths relative to the script's location
    script_dir = os.path.dirname(__file__)
    
    base_data_path = os.path.join(script_dir, 'data')
    
    backgrounds_input_path = os.path.join(base_data_path, 'backgrounds')
    cursors_input_path = os.path.join(base_data_path, 'cursors')
    generated_output_path = os.path.join(base_data_path, 'generated_dataset')

    # Custom dataset path from command line argument (optional)
    custom_dataset_input_path = args.custom_dataset

    generate_data(
        backgrounds_path=backgrounds_input_path,
        cursors_path=cursors_input_path,
        output_dir=generated_output_path,
        num_images=args.num_images,
        img_size=img_size,
        custom_dataset_path=custom_dataset_input_path,
        resize_method=args.resize_method,
        target_name=args.target_name
    )

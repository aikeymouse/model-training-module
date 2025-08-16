# YOLO Training Service API

This service provides a FastAPI-based backend for YOLO model training, testing, and management.

## API Endpoints

### Model Management

#### `GET /api/models`
List all available YOLO models with their metrics and metadata.

**Response:**
```json
[
  {
    "path": "cursor_model_20250805_123456.pt",
    "last_modified": 1691234567.89,
    "p": 0.85,
    "r": 0.78,
    "map50": 0.82,
    "map50_95": 0.65,
    "has_report": true
  }
]
```

#### `POST /api/model/load`
Load a specific model for testing and inference.

**Request Body:**
```json
{
  "path": "cursor_model_20250805_123456.pt"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Model cursor_model_20250805_123456.pt loaded successfully",
  "model_path": "cursor_model_20250805_123456.pt",
  "load_time": 2.34
}
```

#### `GET /api/model/loaded`
Get information about the currently loaded model.

**Response:**
```json
{
  "loaded": true,
  "model_path": "cursor_model_20250805_123456.pt"
}
```

#### `POST /api/model/delete`
Delete a model and its associated files (HTML report, info file).

**Request Body:**
```json
{
  "name": "cursor_model_20250805_123456.pt"
}
```

**Response:**
```json
{
  "message": "Model cursor_model_20250805_123456.pt and related files deleted successfully"
}
```

#### `GET /api/model/report/{model_name}`
Serve the HTML training report for a specific model.

**Parameters:**
- `model_name`: Name of the model file (with or without .pt extension)

**Response:** HTML file containing training metrics and visualizations

### Model Testing and Inference

#### `POST /api/model/test`
Test the loaded model on an uploaded image with detailed results and annotations.

**Request:**
- `image`: Image file (multipart/form-data)
- `confidence`: Confidence threshold (0.01-1.0, default: 0.25)

**Response:**
```json
{
  "success": true,
  "detections": [
    {
      "bbox": [100, 50, 200, 150],
      "confidence": 0.89,
      "class_id": 0,
      "class_name": "target"
    }
  ],
  "detection_count": 1,
  "annotated_image": "base64_encoded_image_with_annotations",
  "processing_time": 0.123,
  "model_used": "cursor_model_20250805_123456.pt",
  "image_size": [1920, 1080]
}
```

#### `POST /api/model/detect`
Detect targets in an image and return the highest confidence detection with center coordinates.

**Request:**
- `image`: Image file (multipart/form-data)
- `confidence`: Confidence threshold (0.01-1.0, default: 0.25)

**Response (when target found):**
```json
{
  "status": "success",
  "x": 150,
  "y": 100,
  "confidence": 0.89,
  "box": [100, 50, 200, 150]
}
```

**Response (when no target found):**
```json
{
  "status": "not_found"
}
```

### Pipeline Management

Pipeline configuration is the single source of truth for all training module settings, including model selection and confidence thresholds.

#### `GET /api/pipeline/load`
Load the training pipeline configuration.

**Response:**
```json
{
  "pipeline": {
    "selected_model_variable_reference": "model_path",
    "confidence_threshold": 0.25,
    "stages": [...],
    "variables": {...}
  }
}
```

#### `POST /api/pipeline/save`
Save the training pipeline configuration.

**Request Body:**
```json
{
  "pipeline": {
    "selected_model_variable_reference": "model_path",
    "confidence_threshold": 0.25,
    "stages": [...],
    "variables": {...}
  }
}
```

**Response:**
```json
{
  "message": "Pipeline configuration saved successfully",
  "config": {...}
}
```

### Script Execution

#### `POST /api/script/execute`
Execute a Python script with arguments (background task).

**Request Body:**
```json
{
  "script": "training_scripts/train_yolov8.py",
  "args": ["--epochs", "50", "--batch-size", "8"]
}
```

**Response:**
```json
{
  "message": "Script execution started",
  "task_id": "uuid-string"
}
```

#### `WebSocket /api/script/ws/execute`
Execute scripts with real-time output via WebSocket.

**WebSocket Message (to server):**
```json
{
  "script_path": "training_scripts/train_yolov8.py",
  "args": ["--epochs", "50", "--batch-size", "8"]
}
```

**WebSocket Messages (from server):**
- Real-time script output lines
- `EXECUTION_FINISHED` on success
- `EXECUTION_ERROR: <message>` on failure
- `MEMORY_MONITOR: <status>` for memory usage updates
- `HEARTBEAT: Process running...` for connection keepalive

### Dataset Management

The service provides comprehensive dataset management capabilities for both synthetic and custom datasets, including viewing, uploading, generating, and deleting dataset images and labels.

#### Synthetic Dataset Management

##### `GET /api/dataset/synthetic/info`
Get information about the synthetic dataset.

**Response:**
```json
{
  "total_images": 1250,
  "dataset_exists": true,
  "dataset_path": "/app/training_scripts/data/generated_dataset"
}
```

##### `GET /api/dataset/synthetic/images`
Get paginated list of synthetic dataset images.

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Number of images per page (default: 25)

**Response:**
```json
{
  "images": [
    {
      "name": "synthetic_20250815_001.jpg",
      "width": 640,
      "height": 640,
      "size": 45123,
      "path": "images/synthetic_20250815_001.jpg"
    }
  ],
  "total": 1250,
  "page": 1,
  "page_size": 25,
  "total_pages": 50
}
```

##### `GET /api/dataset/synthetic/image/{image_name}`
Get a specific synthetic dataset image file.

**Response:** Image file (JPEG/PNG)

##### `GET /api/dataset/synthetic/image/{image_name}/with-boxes`
Get a synthetic dataset image with bounding boxes drawn on it.

**Response:** Image file with bounding box annotations

##### `GET /api/dataset/synthetic/image/{image_name}/labels`
Get label data for a specific synthetic dataset image.

**Response:**
```json
[
  {
    "class_id": 0,
    "x_center": 0.5,
    "y_center": 0.3,
    "width": 0.1,
    "height": 0.15
  }
]
```

##### `DELETE /api/dataset/synthetic/image/{image_name}`
Delete a specific synthetic dataset image and its corresponding label.

**Response:**
```json
{
  "status": "success",
  "deleted_files": ["images/synthetic_20250815_001.jpg", "labels/synthetic_20250815_001.txt"],
  "message": "Successfully deleted synthetic_20250815_001.jpg and its label from synthetic dataset"
}
```

#### Custom Dataset Management

##### `GET /api/dataset/custom/backgrounds`
Get list of available background images for custom dataset generation.

**Response:**
```json
{
  "backgrounds": [
    {
      "filename": "background_20250815_140523_650074.png",
      "size": 2048576,
      "created": "2025-08-15T14:05:23.650074"
    }
  ]
}
```

##### `GET /api/dataset/custom/targets`
Get list of available target images for custom dataset generation.

**Response:**
```json
{
  "targets": [
    {
      "filename": "cursor_20250815_140523_650074.png",
      "size": 8192,
      "created": "2025-08-15T14:05:23.650074"
    }
  ]
}
```

##### `GET /api/dataset/custom/backgrounds/{filename}`
Serve a specific background image file.

**Response:** Image file

##### `GET /api/dataset/custom/targets/{filename}`
Serve a specific target image file.

**Response:** Image file

##### `DELETE /api/dataset/custom/backgrounds/{filename}`
Delete a background image.

**Response:**
```json
{
  "status": "success",
  "message": "Successfully deleted background image: background_20250815_140523_650074.png"
}
```

##### `DELETE /api/dataset/custom/targets/{filename}`
Delete a target image.

**Response:**
```json
{
  "status": "success",
  "message": "Successfully deleted target image: cursor_20250815_140523_650074.png"
}
```

##### `POST /api/dataset/custom/upload/target`
Upload a target image file for custom dataset generation.

**Request:**
- `file`: Image file (multipart/form-data)

**Response:**
```json
{
  "success": true,
  "message": "Target file uploaded successfully as cursor_20250815_140523_650074.png",
  "filename": "cursor_20250815_140523_650074.png"
}
```

##### `POST /api/dataset/custom/upload/background`
Upload a background image file for custom dataset generation.

**Request:**
- `file`: Image file (multipart/form-data)

**Response:**
```json
{
  "success": true,
  "message": "Background file uploaded successfully as background_20250815_140523_650074.png",
  "filename": "background_20250815_140523_650074.png"
}
```

##### `POST /api/dataset/custom/generate`
Generate synthetic dataset using selected target and background images.

**Request Body:**
```json
{
  "target_filename": "cursor_20250815_140523_650074.png",
  "background_filename": "background_20250815_140523_650074.png",
  "num_images": 100,
  "width": 640,
  "height": 640
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Successfully generated 100 images",
  "details": {
    "images_generated": 100,
    "target_image": "cursor_20250815_140523_650074.png",
    "background_image": "background_20250815_140523_650074.png",
    "output_size": "640x640",
    "output_directory": "/app/training_scripts/data/custom_dataset"
  }
}
```

#### Custom Generated Dataset Viewing

These endpoints allow viewing and managing the generated custom dataset:

##### `GET /api/dataset/custom/info`
Get information about the generated custom dataset.

**Response:**
```json
{
  "total_images": 100,
  "dataset_exists": true,
  "dataset_path": "/app/training_scripts/data/custom_dataset"
}
```

##### `GET /api/dataset/custom/images`
Get paginated list of generated custom dataset images.

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Number of images per page (default: 25)

**Response:**
```json
{
  "images": [
    {
      "name": "custom_20250815_140523_0001.jpg",
      "width": 640,
      "height": 640,
      "size": 45123,
      "path": "images/custom_20250815_140523_0001.jpg"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 25,
  "total_pages": 4
}
```

##### `GET /api/dataset/custom/image/{image_name}`
Get a specific custom dataset image file.

**Response:** Image file (JPEG/PNG)

##### `GET /api/dataset/custom/image/{image_name}/with-boxes`
Get a custom dataset image with bounding boxes drawn on it.

**Response:** Image file with bounding box annotations

##### `GET /api/dataset/custom/image/{image_name}/labels`
Get label data for a specific custom dataset image.

**Response:**
```json
[
  {
    "class_id": 0,
    "x_center": 0.5,
    "y_center": 0.3,
    "width": 0.1,
    "height": 0.15
  }
]
```

##### `DELETE /api/dataset/custom/image/{image_name}`
Delete a specific custom dataset image and its corresponding label.

**Response:**
```json
{
  "status": "success",
  "deleted_files": ["images/custom_20250815_140523_0001.jpg", "labels/custom_20250815_140523_0001.txt"],
  "message": "Successfully deleted custom_20250815_140523_0001.jpg and its label from custom dataset"
}
```

### Process Management

#### `GET /api/process/active`
Get information about currently active processes.

**Response:**
```json
{
  "active_processes": {
    "session-uuid": {
      "pid": 12345,
      "status": "running",
      "return_code": null
    }
  },
  "count": 1
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (model/file not found)
- `500`: Internal Server Error

Error responses include a `detail` field with the error message:
```json
{
  "detail": "Model not found: invalid_model.pt"
}
```

## Model File Structure

The service expects model files to follow this naming convention:
- Model file: `{target_name}_model_{timestamp}.pt`
- Info file: `{target_name}_model_{timestamp}.txt`
- HTML report: `{target_name}_model_{timestamp}.html`

## Environment Variables

- `PYTHON_SERVICE_URL`: URL of the Python service (default: http://localhost:3001)

## Dependencies

- FastAPI
- Ultralytics YOLO
- OpenCV
- PIL/Pillow
- NumPy
- psutil (for memory monitoring)

## Usage

1. Start the service: `uvicorn main_v8:app --host 0.0.0.0 --port 3001`
2. Load a model using `/api/model/load`
3. Test the model using `/api/model/test` or `/api/model/detect`
4. Execute training scripts using WebSocket `/api/script/ws/execute`
5. Manage pipeline configuration using `/api/pipeline/load` and `/api/pipeline/save`
6. Upload target and background images using `/api/dataset/custom/upload/target` and `/api/dataset/custom/upload/background`
7. Generate custom datasets using `/api/dataset/custom/generate`
8. View and manage datasets using the `/api/dataset/synthetic/*` and `/api/dataset/custom/*` endpoints

## Configuration

The service uses `training-pipeline.json` as the single source of configuration truth. This file contains:
- Model selection preferences
- Confidence thresholds for detection
- Training pipeline stages and variables
- UI display settings

Configuration is accessed via the pipeline endpoints rather than separate config endpoints.

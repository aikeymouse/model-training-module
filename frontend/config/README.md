# Training Pipeline Configuration

This document provides comprehensive documentation for the `training-pipeline.json` configuration file, which defines the training pipeline stages, variables, and execution parameters for the YOLO Training Module.

## 📁 File Overview

**File**: `training-pipeline.json`
**Purpose**: Configure multi-stage training pipelines with dynamic variable substitution
**Format**: JSON with nested objects for stages and variables
**Location**: `/frontend/config/training-pipeline.json`

## 🔧 Configuration Structure

### Root Configuration Object

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

#### Global Pipeline Settings

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `selected_model_variable_reference` | `string` | Variable name that references the selected model | `"model_path"` |
| `confidence_threshold` | `number` | Default confidence threshold for model inference | `0.25` |
| `stages` | `array` | Array of pipeline stage definitions | See [Pipeline Stages](#-pipeline-stages) |
| `variables` | `object` | Variable definitions with UI controls | See [Variables](#-variables) |

## 🚀 Pipeline Stages

Stages define the sequential execution steps in the training pipeline. Each stage can contain multiple scripts and has configurable execution settings.

### Stage Structure

```json
{
  "id": "unique_stage_id",
  "name": "Display Name",
  "description": "Detailed description for users",
  "scripts": [
    {
      "script": "path/to/script.py",
      "args": ["--param", "{variable_name}"]
    }
  ],
  "enabled": true,
  "optional": false
}
```

#### Stage Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | ✅ | Unique identifier for the stage (used for progress tracking) |
| `name` | `string` | ✅ | Display name shown in the UI |
| `description` | `string` | ✅ | Detailed description for user guidance |
| `scripts` | `array` | ✅ | Array of script execution objects |
| `enabled` | `boolean` | ✅ | Whether the stage executes during pipeline run |
| `optional` | `boolean` | ✅ | Whether the stage can be skipped if it fails |

#### Script Execution Object

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `script` | `string` | Relative path to Python script from training service root | `"training_scripts/train_yolov8.py"` |
| `args` | `array` | Array of command-line arguments with variable substitution | `["--epochs", "{epochs}"]` |

### Available Stages in Current Configuration

#### 1. Validate Dataset Stage
```json
{
  "id": "validate",
  "name": "Validate Dataset",
  "description": "Validate custom dataset",
  "enabled": false,
  "optional": false
}
```
- **Purpose**: Validates dataset structure and integrity
- **Scripts**: `validate_data.py` (with and without `--clean` flag)
- **Status**: Currently disabled (`enabled: false`)

#### 2. Generate Synthetic Data Stage
```json
{
  "id": "generate", 
  "name": "Generate Synthetic Data",
  "description": "Generate synthetic dataset",
  "enabled": true,
  "optional": true
}
```
- **Purpose**: Creates synthetic training images for data augmentation
- **Script**: `generate_dataset.py`
- **Parameters**: Number of images, preset size, resize method, target name
- **Status**: Enabled and optional (pipeline continues if this fails)

#### 3. Train Model Stage
```json
{
  "id": "train",
  "name": "Train Model", 
  "description": "Train YOLO model",
  "enabled": true,
  "optional": false
}
```
- **Purpose**: Executes YOLO model training with specified parameters
- **Script**: `train_yolov8.py`
- **Parameters**: Model path, epochs, preset size, batch size, target name
- **Status**: Enabled and required (pipeline fails if this fails)

## 🎛️ Variables

Variables define configurable parameters that can be substituted into script arguments using `{variable_name}` syntax. They generate UI controls in the training interface.

### Variable Structure

```json
{
  "variable_name": {
    "type": "variable_type",
    "label": "Display Label",
    "default": "default_value",
    "display_in_ui": true,
    // Additional type-specific properties
  }
}
```

#### Common Variable Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `string` | ✅ | Variable type determining UI control and validation |
| `label` | `string` | ✅ | Display label in the training interface |
| `default` | `any` | ✅ | Default value for the variable |
| `display_in_ui` | `boolean` | ✅ | Whether to show this variable in the training modal |

### Variable Types

#### 1. Number Type
Controls numeric input with validation and constraints.

```json
{
  "type": "number",
  "default": 25,
  "min": 1,
  "max": 1000,
  "label": "Epochs",
  "display_in_ui": true
}
```

**Properties:**
- `min` (number): Minimum allowed value
- `max` (number): Maximum allowed value
- `step` (number, optional): Step increment for input controls

**UI Control**: Number input with min/max validation

#### 2. Selector Type
Provides dropdown selection from predefined options.

```json
{
  "type": "selector",
  "label": "Preset Size",
  "default": "yolo-m",
  "options": ["yolo-s", "yolo-m", "yolo-l", "hd"],
  "display_in_ui": true
}
```

**Properties:**
- `options` (array): Array of available option values

**UI Control**: Dropdown select menu

#### 3. Text Type
Allows free-form text input.

```json
{
  "type": "text", 
  "label": "Target Name",
  "default": "cursor",
  "display_in_ui": false
}
```

**Properties:**
- `maxlength` (number, optional): Maximum character length
- `pattern` (string, optional): Regex pattern for validation

**UI Control**: Text input field

### Current Variables Configuration

| Variable | Type | Default | Min/Max | Options | UI Display | Purpose |
|----------|------|---------|---------|---------|------------|---------|
| `synthetic_images` | number | 500 | 1-10000 | - | ✅ | Number of synthetic images to generate |
| `epochs` | number | 25 | 1-1000 | - | ✅ | Training epochs for model |
| `preset_size` | selector | "yolo-m" | - | yolo-s, yolo-m, yolo-l, hd | ✅ | Image size preset for training |
| `batch_size` | number | 2 | 1-64 | - | ✅ | Training batch size |
| `model_path` | selector | "cursor_model..." | - | yolov8n.pt | ❌ | Base model for training |
| `target_name` | text | "cursor" | - | - | ❌ | Target object name for detection |

## 🔄 Variable Substitution

Variables are substituted into script arguments using curly brace syntax: `{variable_name}`.

### Example Substitution

**Configuration:**
```json
{
  "args": ["--epochs", "{epochs}", "--model", "{model_path}"]
}
```

**With Variables:**
- `epochs = 50`
- `model_path = "yolov8n.pt"`

**Resulting Command:**
```bash
python train_yolov8.py --epochs 50 --model yolov8n.pt
```

### Special Variables

#### Model Reference Variable
The `selected_model_variable_reference` field specifies which variable receives the currently selected model:

```json
{
  "selected_model_variable_reference": "model_path"
}
```

This automatically populates the `model_path` variable with the user's selected model from the UI.

## 📝 Configuration Examples

### Basic Training Pipeline
Minimal configuration for simple model training:

```json
{
  "pipeline": {
    "selected_model_variable_reference": "model",
    "stages": [
      {
        "id": "train",
        "name": "Train Model",
        "description": "Basic YOLO training", 
        "scripts": [
          {
            "script": "train_yolov8.py",
            "args": ["--model", "{model}", "--epochs", "{epochs}"]
          }
        ],
        "enabled": true,
        "optional": false
      }
    ],
    "variables": {
      "epochs": {
        "type": "number",
        "default": 10,
        "min": 1,
        "max": 100,
        "label": "Training Epochs",
        "display_in_ui": true
      },
      "model": {
        "type": "selector",
        "label": "Base Model",
        "default": "yolov8n.pt",
        "options": ["yolov8n.pt", "yolov8s.pt"],
        "display_in_ui": false
      }
    }
  }
}
```

### Advanced Multi-Stage Pipeline
Comprehensive pipeline with data preprocessing, training, and validation:

```json
{
  "pipeline": {
    "selected_model_variable_reference": "base_model",
    "confidence_threshold": 0.3,
    "stages": [
      {
        "id": "preprocess",
        "name": "Preprocess Data",
        "description": "Prepare training dataset",
        "scripts": [
          {
            "script": "preprocess.py",
            "args": ["--input", "{dataset_path}", "--output", "{processed_path}"]
          }
        ],
        "enabled": true,
        "optional": false
      },
      {
        "id": "augment",
        "name": "Data Augmentation", 
        "description": "Generate additional training samples",
        "scripts": [
          {
            "script": "augment.py",
            "args": ["--count", "{augment_count}", "--methods", "{augment_methods}"]
          }
        ],
        "enabled": true,
        "optional": true
      },
      {
        "id": "train",
        "name": "Train Model",
        "description": "Execute model training",
        "scripts": [
          {
            "script": "train_yolov8.py",
            "args": [
              "--model", "{base_model}",
              "--epochs", "{epochs}",
              "--lr", "{learning_rate}",
              "--batch-size", "{batch_size}"
            ]
          }
        ],
        "enabled": true,
        "optional": false
      },
      {
        "id": "validate",
        "name": "Validate Model",
        "description": "Test trained model performance",
        "scripts": [
          {
            "script": "validate.py", 
            "args": ["--model", "trained_model.pt", "--threshold", "{validation_threshold}"]
          }
        ],
        "enabled": true,
        "optional": true
      }
    ],
    "variables": {
      "dataset_path": {
        "type": "text",
        "default": "/data/train",
        "label": "Dataset Path", 
        "display_in_ui": true
      },
      "processed_path": {
        "type": "text",
        "default": "/data/processed",
        "label": "Processed Data Path",
        "display_in_ui": true
      },
      "augment_count": {
        "type": "number",
        "default": 1000,
        "min": 100,
        "max": 10000,
        "label": "Augmentation Count",
        "display_in_ui": true
      },
      "augment_methods": {
        "type": "selector",
        "label": "Augmentation Methods",
        "default": "rotation,scaling",
        "options": ["rotation", "scaling", "rotation,scaling", "all"],
        "display_in_ui": true
      },
      "epochs": {
        "type": "number",
        "default": 50,
        "min": 1,
        "max": 500,
        "label": "Training Epochs",
        "display_in_ui": true
      },
      "learning_rate": {
        "type": "number",
        "default": 0.001,
        "min": 0.0001,
        "max": 1.0,
        "label": "Learning Rate",
        "display_in_ui": true
      },
      "batch_size": {
        "type": "number",
        "default": 8,
        "min": 1,
        "max": 32,
        "label": "Batch Size",
        "display_in_ui": true
      },
      "validation_threshold": {
        "type": "number",
        "default": 0.5,
        "min": 0.1,
        "max": 0.9,
        "label": "Validation Threshold",
        "display_in_ui": true
      },
      "base_model": {
        "type": "selector",
        "label": "Base Model",
        "default": "yolov8n.pt",
        "options": ["yolov8n.pt", "yolov8s.pt", "yolov8m.pt"],
        "display_in_ui": false
      }
    }
  }
}
```

## 🛠️ Customization Guide

### Adding New Variable Types

To add custom variable types, extend the frontend JavaScript in `pipeline-config.js`:

```javascript
// Add new variable type handling
function generateVariableHTML(key, variable) {
  switch (variable.type) {
    case 'file_selector':
      return `
        <div class="variable-group">
          <label for="${key}">${variable.label}:</label>
          <input type="file" id="${key}" accept="${variable.accept || ''}">
        </div>`;
    
    case 'range':
      return `
        <div class="variable-group">
          <label for="${key}">${variable.label}: <span id="${key}_value">${variable.default}</span></label>
          <input type="range" id="${key}" min="${variable.min}" max="${variable.max}" 
                 value="${variable.default}" step="${variable.step || 1}"
                 oninput="document.getElementById('${key}_value').textContent = this.value">
        </div>`;
    
    case 'boolean':
      return `
        <div class="variable-group">
          <label for="${key}">${variable.label}:</label>
          <input type="checkbox" id="${key}" ${variable.default ? 'checked' : ''}>
        </div>`;
  }
}
```

### Adding New Stages

1. **Define the Stage:**
```json
{
  "id": "custom_stage",
  "name": "Custom Processing",
  "description": "Custom data processing step",
  "scripts": [
    {
      "script": "custom_scripts/process.py",
      "args": ["--input", "{input_path}", "--output", "{output_path}"]
    }
  ],
  "enabled": true,
  "optional": false
}
```

2. **Add Required Variables:**
```json
{
  "input_path": {
    "type": "text",
    "default": "/data/input",
    "label": "Input Path",
    "display_in_ui": true
  },
  "output_path": {
    "type": "text", 
    "default": "/data/output",
    "label": "Output Path",
    "display_in_ui": true
  }
}
```

3. **Create the Script:**
Create the corresponding Python script in the training service:
```python
# custom_scripts/process.py
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    
    # Your custom processing logic here
    print(f"Processing {args.input} -> {args.output}")

if __name__ == "__main__":
    main()
```

### Preset Size Configurations

The current configuration supports these preset sizes:

| Preset | Dimensions | Use Case |
|--------|------------|----------|
| `yolo-s` | 416x416 | Small, fast inference |
| `yolo-m` | 640x640 | Balanced size/accuracy |
| `yolo-l` | 832x832 | Large, high accuracy |
| `hd` | 1280x720 | HD video processing |

To add new presets, update the `preset_size` variable options:

```json
{
  "preset_size": {
    "type": "selector",
    "label": "Preset Size", 
    "default": "yolo-m",
    "options": [
      "yolo-s",
      "yolo-m", 
      "yolo-l",
      "hd",
      "4k",        // New preset
      "custom"     // New preset
    ],
    "display_in_ui": true
  }
}
```

## 🔍 Validation & Testing

### JSON Schema Validation

Validate your configuration file structure:

```bash
# Using Python
python -m json.tool training-pipeline.json

# Using jq
jq . training-pipeline.json

# Using online validators
# Copy content to jsonlint.com or similar
```

### Configuration Testing

Test your configuration through the UI:

1. **Load Configuration**: Refresh the training interface to load changes
2. **Check Variables**: Verify all variables appear correctly in the UI
3. **Test Substitution**: Run a simple stage to verify variable substitution
4. **Validate Scripts**: Ensure all script paths exist and are executable

### Common Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Config file not found" | File path incorrect | Check file location and permissions |
| "Invalid JSON format" | Syntax error in JSON | Use JSON validator to find syntax issues |
| "Unknown variable type" | Unsupported variable type | Use supported types: number, text, selector |
| "Script not found" | Invalid script path | Verify script exists in training service |
| "Variable substitution failed" | Missing variable definition | Ensure all referenced variables are defined |

## 📚 Best Practices

### 1. **Naming Conventions**
- Use descriptive stage IDs: `validate_dataset` vs `stage1`
- Use clear variable names: `training_epochs` vs `epochs`
- Use consistent naming patterns across related configurations

### 2. **Default Values**
- Provide sensible defaults for all variables
- Use conservative values that work on most systems
- Document the reasoning behind default choices

### 3. **Stage Organization**
- Order stages logically (preprocess → augment → train → validate)
- Make data preparation stages optional when possible
- Keep training stages as required for pipeline integrity

### 4. **Variable Validation**
- Set appropriate min/max values for numeric inputs
- Provide meaningful option lists for selectors
- Use display_in_ui strategically to avoid UI clutter

### 5. **Error Handling**
- Mark experimental stages as optional
- Provide clear descriptions for each stage's purpose
- Test configuration changes thoroughly before deployment

### 6. **Documentation**
- Comment complex configurations inline
- Maintain this README when adding new features
- Provide examples for common use cases

## 🔗 Related Documentation

- **[Training Service API](../training_service_python/README.md)** - Backend API documentation
- **[Training Scripts Guide](../training_service_python/training_scripts/README.md)** - Script parameter reference
- **[Main Project README](../../README.md)** - Complete system overview
- **[Frontend JavaScript](../js/)** - UI implementation details

## 🆘 Support & Troubleshooting

### Common Issues

1. **Configuration Not Loading**
   - Check JSON syntax with validator
   - Verify file permissions and location
   - Check browser console for JavaScript errors

2. **Variables Not Appearing in UI**
   - Ensure `display_in_ui: true` is set
   - Check variable type spelling
   - Verify JavaScript console for errors

3. **Script Execution Failures**
   - Verify script paths are correct
   - Check if all required variables are defined
   - Test script execution manually in container

### Getting Help

- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Join community discussions for help and tips
- **Documentation**: Check related documentation files
- **Logs**: Enable debug logging for detailed troubleshooting

---

**Need to modify the training pipeline?** Edit this configuration file and refresh the training interface to see your changes! 🚀

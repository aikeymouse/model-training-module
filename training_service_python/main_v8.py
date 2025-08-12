import asyncio
import os
import uuid
import time
import base64
import io
import cv2
import pty
import select
import psutil
from PIL import Image
import numpy as np
from fastapi import FastAPI, BackgroundTasks, HTTPException, WebSocket, File, UploadFile, Form
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from pydantic import BaseModel
import subprocess
import datetime
import json
from contextlib import asynccontextmanager

# Optional import - YOLO might not be available during development
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    YOLO = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up FastAPI application...")
    initialize_model_from_config()
    yield
    # Shutdown
    print("Shutting down FastAPI application...")

app = FastAPI(lifespan=lifespan)

MODELS_DIR = "models"
LOGS_DIR = "logs"
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

# In-memory tracking of training tasks
tasks = {}

# Track active processes for cancellation
active_processes = {}

# Global model instance for testing
loaded_model = None
loaded_model_path = None

def load_pipeline_config_sync():
    """Load pipeline configuration to get selected model"""
    pipeline_config_file = "./frontend/config/training-pipeline.json"
    if os.path.exists(pipeline_config_file):
        try:
            with open(pipeline_config_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading pipeline config: {e}")
    return None

def initialize_model_from_config():
    """Initialize model from pipeline configuration on startup"""
    global loaded_model, loaded_model_path
    
    pipeline_config = load_pipeline_config_sync()
    if not pipeline_config:
        print("No pipeline configuration found, skipping model initialization")
        return
    
    try:
        pipeline = pipeline_config.get('pipeline', {})
        selected_model_var_ref = pipeline.get('selected_model_variable_reference')
        
        if selected_model_var_ref:
            variables = pipeline.get('variables', {})
            model_variable = variables.get(selected_model_var_ref, {})
            selected_model = model_variable.get('default')
            
            if selected_model:
                # Check if the model file exists
                model_path = os.path.join(MODELS_DIR, selected_model)
                if os.path.exists(model_path):
                    try:
                        if not YOLO_AVAILABLE:
                            print("YOLO not available, skipping model loading")
                            return
                        loaded_model = YOLO(model_path)
                        loaded_model_path = selected_model
                        print(f"Successfully loaded model from config: {selected_model}")
                    except Exception as e:
                        print(f"Failed to load model {selected_model}: {e}")
                else:
                    print(f"Model file not found: {selected_model}")
            else:
                print("No model selected in pipeline configuration")
        else:
            print("No selected_model_variable_reference in pipeline configuration")
    except Exception as e:
        print(f"Error initializing model from config: {e}")

class SetModelRequest(BaseModel):
    path: str

class ExecuteScriptRequest(BaseModel):
    script: str
    args: list = []

class DeleteModelRequest(BaseModel):
    name: str

def parse_model_metrics(model_filename):
    """
    Parse metrics from the corresponding model info file.
    Returns default values if file not found or parsing fails.
    """
    # Generate the expected info file name based on model filename
    # For target_model_20250802_124519.pt -> target_model_20250802_124519.txt
    base_name = model_filename.replace('.pt', '')
    
    # Use consistent naming: target_model_{timestamp}.txt
    info_filename = f"{base_name}.txt"
    
    info_path = os.path.join(MODELS_DIR, info_filename)
    
    # Default metrics if file not found or parsing fails
    default_metrics = {"p": 0.0, "r": 0.0, "map50": 0.0, "map50_95": 0.0}
    
    if not os.path.exists(info_path):
        return default_metrics
    
    try:
        with open(info_path, 'r') as f:
            content = f.read()
            
        metrics = {}
        lines = content.split('\n')
        
        for line in lines:
            line = line.strip()
            if 'Precision (P):' in line:
                metrics['p'] = float(line.split(':')[1].strip())
            elif 'Recall (R):' in line:
                metrics['r'] = float(line.split(':')[1].strip())
            elif 'mAP50:' in line and 'mAP50-95:' not in line:
                metrics['map50'] = float(line.split(':')[1].strip())
            elif 'mAP50-95:' in line:
                metrics['map50_95'] = float(line.split(':')[1].strip())
        
        # Return parsed metrics or defaults if any are missing
        return {
            "p": metrics.get('p', 0.0),
            "r": metrics.get('r', 0.0),
            "map50": metrics.get('map50', 0.0),
            "map50_95": metrics.get('map50_95', 0.0)
        }
        
    except Exception as e:
        print(f"Error parsing metrics for {model_filename}: {e}")
        return default_metrics

def has_html_report(model_filename):
    """
    Check if an HTML report exists for the given model.
    """
    base_name = model_filename.replace('.pt', '')
    html_filename = f"{base_name}.html"
    html_path = os.path.join(MODELS_DIR, html_filename)
    return os.path.exists(html_path)

@app.get("/models")
async def get_models():
    models = []
    for filename in os.listdir(MODELS_DIR):
        if filename.endswith(".pt"):
            # Parse real metrics from corresponding info file
            metrics = parse_model_metrics(filename)
            models.append({
                "path": filename,
                "last_modified": os.path.getmtime(os.path.join(MODELS_DIR, filename)),
                "p": metrics["p"], 
                "r": metrics["r"], 
                "map50": metrics["map50"], 
                "map50_95": metrics["map50_95"],
                "has_report": has_html_report(filename)
            })
    return sorted(models, key=lambda x: x['last_modified'], reverse=True)

# API endpoints with /api prefix for frontend compatibility
@app.get("/api/models")
async def get_api_models():
    return await get_models()

@app.get("/api/model/report/{model_name}")
async def get_model_report(model_name: str):
    """
    Serve the HTML report for a specific model.
    """
    # Remove .pt extension if present and add .html
    base_name = model_name.replace('.pt', '')
    html_filename = f"{base_name}.html"
    html_path = os.path.join(MODELS_DIR, html_filename)
    
    if not os.path.exists(html_path):
        raise HTTPException(status_code=404, detail="HTML report not found for this model")
    
    return FileResponse(html_path, media_type="text/html")



@app.post("/api/pipeline/save")
async def save_pipeline_config(pipeline_config: dict):
    try:
        # Save pipeline configuration ONLY to the frontend config file (single source of truth)
        frontend_config_file = "./frontend/config/training-pipeline.json"
        os.makedirs(os.path.dirname(frontend_config_file), exist_ok=True)
        with open(frontend_config_file, 'w') as f:
            json.dump(pipeline_config, f, indent=2)
        
        return {"message": "Pipeline configuration saved successfully", "config": pipeline_config}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save pipeline configuration: {str(e)}")

@app.get("/api/pipeline/load")
async def load_pipeline_config():
    try:
        # Load from the single frontend config file (single source of truth)
        frontend_config_file = "./frontend/config/training-pipeline.json"
        if os.path.exists(frontend_config_file):
            with open(frontend_config_file, 'r') as f:
                return json.load(f)
        
        # If file doesn't exist, return a default empty pipeline config
        return {
            "pipeline": {
                "stages": [],
                "variables": {}
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load pipeline configuration: {str(e)}")

@app.post("/api/model/delete")
async def delete_yolo_model(req: DeleteModelRequest):
    model_path = os.path.join(MODELS_DIR, req.name)
    if os.path.exists(model_path):
        # Remove the main .pt model file
        os.remove(model_path)
        
        # Get the base name without extension to find related files
        base_name = os.path.splitext(req.name)[0]
        
        # Remove corresponding HTML report file if it exists
        html_path = os.path.join(MODELS_DIR, f"{base_name}.html")
        if os.path.exists(html_path):
            os.remove(html_path)
            print(f"Removed HTML report: {html_path}")
        
        # Remove corresponding TXT info file if it exists
        txt_path = os.path.join(MODELS_DIR, f"{base_name}.txt")
        if os.path.exists(txt_path):
            os.remove(txt_path)
            print(f"Removed info file: {txt_path}")
        
        return {"message": f"Model {req.name} and related files deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail=f"Model {req.name} not found")

@app.post("/api/script/execute")
async def execute_script(req: ExecuteScriptRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    log_path = os.path.join(LOGS_DIR, f"{task_id}.log")
    
    background_tasks.add_task(run_script_execution, task_id, log_path, req.script, req.args)
    
    return JSONResponse(status_code=202, content={"message": "Script execution started", "task_id": task_id})

def run_script_execution(task_id: str, log_path: str, script: str, args: list):
    """
    Execute a Python script with arguments and capture output directly in the container.
    Uses the same approach as our working pipeline config - simple file operations.
    """
    tasks[task_id] = {"status": "running", "log_path": log_path, "progress": 0}
    try:
        with open(log_path, "w") as log_file:
            log_file.write(f"Starting script execution: {script} {' '.join(args)}\n")
            log_file.flush()
            
            # Execute script directly in the current environment
            # Build command to execute the script
            cmd = ["python", script] + args
            
            log_file.write(f"Command: {' '.join(cmd)}\n")
            log_file.flush()
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            # Read output line by line
            for line in process.stdout:
                log_file.write(line)
                log_file.flush()
            
            process.wait()
            
            if process.returncode == 0:
                tasks[task_id]["status"] = "completed"
                tasks[task_id]["progress"] = 100
                log_file.write(f"\nScript completed successfully with exit code {process.returncode}\n")
            else:
                tasks[task_id]["status"] = "failed"
                log_file.write(f"\nScript failed with exit code {process.returncode}\n")
            
            log_file.flush()

    except Exception as e:
        tasks[task_id]["status"] = "failed"
        with open(log_path, "a") as log_file:
            log_file.write(f"\nError during script execution: {e}\n")
            log_file.flush()

# Pipeline logging functionality
PIPELINE_LOG_FILE = "logs/pipeline.log"
pipeline_log_active = False

def init_pipeline_log():
    """Initialize pipeline log file for a new pipeline execution"""
    global pipeline_log_active
    pipeline_log_active = True
    
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    # Create/overwrite pipeline log file
    with open(PIPELINE_LOG_FILE, "w", encoding="utf-8") as f:
        f.write(f"=== YOLO Training Pipeline Log ===\n")
        f.write(f"Started at: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 50 + "\n\n")

def log_pipeline_message(message: str):
    """Log a message to the pipeline log file"""
    global pipeline_log_active
    if not pipeline_log_active:
        return
        
    try:
        # Filter out heartbeat messages from log
        if message.startswith("HEARTBEAT:"):
            return
            
        with open(PIPELINE_LOG_FILE, "a", encoding="utf-8") as f:
            timestamp = datetime.datetime.now().strftime('%H:%M:%S')
            f.write(f"[{timestamp}] {message}\n")
            f.flush()
    except Exception as e:
        print(f"Error writing to pipeline log: {e}")

def finalize_pipeline_log(success: bool = True):
    """Finalize the pipeline log with completion status"""
    global pipeline_log_active
    if not pipeline_log_active:
        return
        
    try:
        with open(PIPELINE_LOG_FILE, "a", encoding="utf-8") as f:
            f.write("\n" + "=" * 50 + "\n")
            status = "COMPLETED SUCCESSFULLY" if success else "FAILED"
            f.write(f"Pipeline {status} at: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 50 + "\n")
    except Exception as e:
        print(f"Error finalizing pipeline log: {e}")
    finally:
        pipeline_log_active = False

async def send_and_log(websocket, message: str):
    """Send message to WebSocket and log it to pipeline log"""
    try:
        await websocket.send_text(message)
        log_pipeline_message(message)
    except:
        # WebSocket connection lost, but still log the message
        log_pipeline_message(message)
        raise

def get_memory_status():
    """Get current memory status and training process info"""
    try:
        # Get system memory
        mem = psutil.virtual_memory()
        
        # Find training processes
        training_processes = []
        python_processes = []
        
        for proc in psutil.process_iter(['pid', 'name', 'memory_info', 'cmdline']):
            try:
                if 'python' in proc.info['name'].lower():
                    memory_mb = proc.info['memory_info'].rss / 1024 / 1024
                    if memory_mb > 50:  # Only track processes >50MB
                        cmdline = ' '.join(proc.info['cmdline'][:3]) if proc.info['cmdline'] else proc.info['name']
                        
                        process_info = {
                            'pid': proc.info['pid'],
                            'memory_mb': round(memory_mb, 1),
                            'cmdline': cmdline
                        }
                        
                        python_processes.append(process_info)
                        
                        # Check if it's a training process
                        if any(keyword in cmdline.lower() for keyword in ['train', 'yolo', 'ultralytics']):
                            training_processes.append(process_info)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
        
        return {
            'container_memory_gb': round(mem.used / 1024**3, 2),
            'container_total_gb': round(mem.total / 1024**3, 2),
            'container_percent': round(mem.percent, 1),
            'training_processes': training_processes,
            'python_processes': python_processes
        }
    except Exception as e:
        return {'error': f'Memory monitoring failed: {str(e)}'}

async def memory_monitoring_task(websocket, stop_event):
    """Background task for memory monitoring during script execution"""
    monitor_interval = 300  # 5 minutes = 300 seconds
    
    while not stop_event.is_set():
        try:
            # Wait for interval or until stop event
            for _ in range(monitor_interval):
                if stop_event.is_set():
                    return
                await asyncio.sleep(1)
            
            # Get memory status
            mem_status = get_memory_status()
            
            if 'error' in mem_status:
                await send_and_log(websocket, f"MEMORY_ERROR: {mem_status['error']}")
                continue
            
            # Format memory report
            mem_report = f"MEMORY_MONITOR: Container {mem_status['container_memory_gb']}GB/{mem_status['container_total_gb']}GB ({mem_status['container_percent']}%)"
            
            # Add training process info if any
            if mem_status['training_processes']:
                training_info = []
                for proc in mem_status['training_processes']:
                    training_info.append(f"PID{proc['pid']}:{proc['memory_mb']}MB")
                mem_report += f" | Training: {', '.join(training_info)}"
            else:
                # Show top Python processes if no training detected
                top_python = sorted(mem_status['python_processes'], key=lambda x: x['memory_mb'], reverse=True)[:2]
                if top_python:
                    python_info = []
                    for proc in top_python:
                        python_info.append(f"PID{proc['pid']}:{proc['memory_mb']}MB")
                    mem_report += f" | Python: {', '.join(python_info)}"
            
            await send_and_log(websocket, mem_report)
            
        except Exception as e:
            try:
                await send_and_log(websocket, f"MEMORY_ERROR: Monitoring failed - {str(e)}")
            except:
                # WebSocket might be closed, just log and continue
                log_pipeline_message(f"MEMORY_ERROR: Monitoring failed - {str(e)}")
                pass

@app.websocket("/api/script/ws/execute")
async def websocket_execute_script(websocket: WebSocket):
    await websocket.accept()
    
    # Create stop event for memory monitoring
    memory_stop_event = asyncio.Event()
    memory_task = None
    process = None
    session_id = str(uuid.uuid4())
    
    try:
        # Initialize pipeline log on first connection (start of pipeline)
        init_pipeline_log()
        
        await send_and_log(websocket, "WebSocket connected successfully")
        
        # Receive script execution request
        data = await websocket.receive_text()
        request_data = json.loads(data)
        script_path = request_data.get('script_path')
        args = request_data.get('args', [])
        
        if not script_path:
            await send_and_log(websocket, "EXECUTION_ERROR: No script path provided")
            finalize_pipeline_log(False)
            return
        
        # Start memory monitoring in background
        memory_task = asyncio.create_task(memory_monitoring_task(websocket, memory_stop_event))
        
        # Execute the script with real-time output using PTY
        try:
            cmd = ["stdbuf", "-o0", "-e0", "python", "-u", script_path] + args
            await send_and_log(websocket, f"Executing: {' '.join(cmd)}")
            
            # Send initial memory status
            initial_mem = get_memory_status()
            if 'error' not in initial_mem:
                await send_and_log(websocket, f"MEMORY_INITIAL: Container {initial_mem['container_memory_gb']}GB/{initial_mem['container_total_gb']}GB ({initial_mem['container_percent']}%) - Starting execution")
            
            # Create PTY for real-time output
            master, slave = pty.openpty()
            
            # Start subprocess with PTY
            process = subprocess.Popen(
                cmd,
                stdout=slave,
                stderr=slave,
                stdin=slave
            )
            
            # Store process reference for potential cancellation
            active_processes[session_id] = process
            
            # Close slave end in parent
            os.close(slave)
            
            # Read output in real-time
            last_heartbeat = time.time()
            heartbeat_interval = 30  # Send heartbeat every 30 seconds for better connection stability
            cancelled = False
            
            while process.poll() is None:
                # Check for incoming WebSocket messages (potential cancellation)
                try:
                    # Non-blocking check for WebSocket messages
                    message = await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
                    if message == "CANCEL":
                        cancelled = True
                        log_pipeline_message("Cancellation requested by user")
                        break
                except asyncio.TimeoutError:
                    pass  # No message received, continue
                except Exception:
                    # WebSocket connection lost
                    cancelled = True
                    log_pipeline_message("WebSocket connection lost - treating as cancellation")
                    break
                
                ready, _, _ = select.select([master], [], [], 0.1)
                if ready:
                    try:
                        data = os.read(master, 1024)
                        if data:
                            lines = data.decode('utf-8', errors='ignore').strip()
                            if lines:
                                for line in lines.split('\n'):
                                    if line.strip():
                                        try:
                                            await send_and_log(websocket, line.strip())
                                        except:
                                            # Connection lost, but continue process and logging
                                            log_pipeline_message(line.strip())
                                            print(f"WebSocket connection lost, but continuing process execution: {script_path}")
                                            cancelled = True
                                            break
                                if cancelled:
                                    break
                            last_heartbeat = time.time()
                    except OSError:
                        break
                
                # Send heartbeat to keep connection alive during long operations
                current_time = time.time()
                if current_time - last_heartbeat > heartbeat_interval:
                    try:
                        await websocket.send_text("HEARTBEAT: Process running...")
                        last_heartbeat = current_time
                    except:
                        # Connection lost, treat as cancellation
                        print(f"WebSocket connection lost during heartbeat: {script_path}")
                        cancelled = True
                        break
                
                # Small sleep to prevent busy waiting
                await asyncio.sleep(0.01)
            
            # Handle cancellation
            if cancelled:
                log_pipeline_message("Process execution cancelled - terminating")
                if process.poll() is None:  # Process still running
                    try:
                        process.terminate()
                        process.wait(timeout=5)
                        log_pipeline_message("Process terminated successfully")
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
                        log_pipeline_message("Process forcefully killed")
                    except Exception as e:
                        log_pipeline_message(f"Error terminating process: {str(e)}")
                
                finalize_pipeline_log(False)
                return
            
            # Read any remaining output
            try:
                while True:
                    ready, _, _ = select.select([master], [], [], 0.1)
                    if ready:
                        data = os.read(master, 1024)
                        if data:
                            lines = data.decode('utf-8', errors='ignore').strip()
                            if lines:
                                for line in lines.split('\n'):
                                    if line.strip():
                                        try:
                                            await send_and_log(websocket, line.strip())
                                        except:
                                            # Connection lost, just log but continue
                                            log_pipeline_message(line.strip())
                                            print(f"WebSocket connection lost while reading final output: {script_path}")
                                            pass
                    else:
                        break
            except OSError:
                pass
            
            # Close PTY
            os.close(master)
            
            # Wait for process to complete
            return_code = process.wait()
            
            # Send final memory status
            final_mem = get_memory_status()
            if 'error' not in final_mem:
                try:
                    await send_and_log(websocket, f"MEMORY_FINAL: Container {final_mem['container_memory_gb']}GB/{final_mem['container_total_gb']}GB ({final_mem['container_percent']}%) - Execution completed")
                except:
                    log_pipeline_message(f"MEMORY_FINAL: Container {final_mem['container_memory_gb']}GB/{final_mem['container_total_gb']}GB ({final_mem['container_percent']}%) - Execution completed")
            
            # Log completion regardless of WebSocket status
            print(f"Process completed: {script_path}, exit code: {return_code}")
            
            # Try to send completion message, but don't fail if connection is lost
            try:
                if return_code == 0:
                    await send_and_log(websocket, "EXECUTION_FINISHED")
                    finalize_pipeline_log(True)
                else:
                    await send_and_log(websocket, f"EXECUTION_ERROR: Script failed with exit code {return_code}")
                    finalize_pipeline_log(False)
            except:
                # Connection lost, but process completed - this is fine
                if return_code == 0:
                    log_pipeline_message("EXECUTION_FINISHED")
                    finalize_pipeline_log(True)
                else:
                    log_pipeline_message(f"EXECUTION_ERROR: Script failed with exit code {return_code}")
                    finalize_pipeline_log(False)
                print(f"WebSocket connection lost, but process completed successfully: {script_path}")
                pass
                
        except Exception as e:
            await send_and_log(websocket, f"EXECUTION_ERROR: {str(e)}")
            finalize_pipeline_log(False)
            
    except Exception as e:
        try:
            await send_and_log(websocket, f"EXECUTION_ERROR: {str(e)}")
        except:
            log_pipeline_message(f"EXECUTION_ERROR: {str(e)}")
        finalize_pipeline_log(False)
    finally:
        # Cleanup: stop memory monitoring and terminate process if needed
        if memory_task:
            memory_stop_event.set()
            try:
                await asyncio.wait_for(memory_task, timeout=1.0)
            except asyncio.TimeoutError:
                memory_task.cancel()
        
        # Clean up process reference and handle termination
        if session_id in active_processes:
            if process and process.poll() is None:
                try:
                    # Check if WebSocket was closed due to cancellation
                    # If the process is still running and WebSocket closed, it might be a cancellation
                    print(f"Cleaning up process for session {session_id}")
                    
                    # Try graceful termination first
                    process.terminate()
                    
                    # Wait a bit for graceful shutdown
                    try:
                        process.wait(timeout=5)
                        log_pipeline_message(f"Process terminated gracefully (PID: {process.pid})")
                    except subprocess.TimeoutExpired:
                        # Force kill if graceful termination failed
                        process.kill()
                        process.wait()
                        log_pipeline_message(f"Process forcefully killed (PID: {process.pid})")
                        
                except Exception as e:
                    log_pipeline_message(f"Error terminating process: {str(e)}")
                    
            # Remove from active processes
            del active_processes[session_id]
        
        try:
            await websocket.close()
        except:
            pass

@app.get("/api/process/active")
async def get_active_processes():
    """Get information about currently active processes"""
    process_info = {}
    for session_id, process in active_processes.items():
        process_info[session_id] = {
            "pid": process.pid,
            "status": "running" if process.poll() is None else "finished",
            "return_code": process.returncode
        }
    return {"active_processes": process_info, "count": len(process_info)}

@app.post("/api/model/load")
async def load_model(req: SetModelRequest):
    """Load a YOLO model for testing. Called when user selects a model."""
    global loaded_model, loaded_model_path
    
    try:
        # Check YOLO availability
        if not YOLO_AVAILABLE:
            raise HTTPException(status_code=500, detail="YOLO not available")
        
        # Extract model filename from path
        model_filename = os.path.basename(req.path)
        full_model_path = os.path.join(MODELS_DIR, model_filename)
        
        # Check if model exists
        if not os.path.exists(full_model_path):
            raise HTTPException(status_code=404, detail=f"Model not found: {model_filename}")
        
        # Load the model
        start_time = time.time()
        loaded_model = YOLO(full_model_path)
        loaded_model_path = model_filename
        load_time = time.time() - start_time
        
        return {
            "success": True,
            "message": f"Model {model_filename} loaded successfully",
            "model_path": model_filename,
            "load_time": round(load_time, 2)
        }
        
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Required packages not installed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

@app.get("/api/model/loaded")
async def get_loaded_model():
    """Get information about the currently loaded model"""
    global loaded_model, loaded_model_path
    
    if loaded_model is None or loaded_model_path is None:
        return {
            "loaded": False,
            "model_path": None
        }
    
    return {
        "loaded": True,
        "model_path": loaded_model_path
    }

@app.post("/api/model/test")
async def test_model(image: UploadFile = File(...), confidence: float = Form(0.25)):
    """Test the currently loaded model on a provided image to detect targets."""
    global loaded_model, loaded_model_path
    
    # Validate confidence threshold
    if confidence < 0.01 or confidence > 1.0:
        raise HTTPException(status_code=400, detail="Confidence threshold must be between 0.01 and 1.0")
    
    # Check if a model is loaded
    if loaded_model is None or loaded_model_path is None:
        raise HTTPException(status_code=400, detail="No model is currently loaded. Please select a model first.")
    
    # Validate image file
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read and process the uploaded image
        image_bytes = await image.read()
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL to OpenCV format (RGB to BGR)
        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Record processing start time
        start_time = time.time()
        
        # Run inference using the pre-loaded model with custom confidence
        results = loaded_model(opencv_image, conf=confidence, device='cpu')  # Use CPU for consistency
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Process results
        detections = []
        annotated_image = opencv_image.copy()
        
        # Extract detection information
        for result in results:
            if result.boxes is not None:
                for box in result.boxes:
                    # Get box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = float(box.conf[0].cpu().numpy())
                    class_id = int(box.cls[0].cpu().numpy())
                    
                    detections.append({
                        "bbox": [float(x1), float(y1), float(x2), float(y2)],
                        "confidence": confidence,
                        "class_id": class_id,
                        "class_name": "target"
                    })
                    
                    # Draw bounding box on image
                    cv2.rectangle(annotated_image, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                    
                    # Add confidence label
                    label = f"Target: {confidence:.2f}"
                    label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                    cv2.rectangle(annotated_image, (int(x1), int(y1) - label_size[1] - 10), 
                                (int(x1) + label_size[0], int(y1)), (0, 255, 0), -1)
                    cv2.putText(annotated_image, label, (int(x1), int(y1) - 5), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
        
        # Convert annotated image back to base64 for frontend display
        annotated_image_rgb = cv2.cvtColor(annotated_image, cv2.COLOR_BGR2RGB)
        annotated_pil = Image.fromarray(annotated_image_rgb)
        
        # Save to bytes
        img_buffer = io.BytesIO()
        annotated_pil.save(img_buffer, format='JPEG', quality=90)
        img_buffer.seek(0)
        
        # Encode to base64
        annotated_image_b64 = base64.b64encode(img_buffer.getvalue()).decode()
        
        return {
            "success": True,
            "detections": detections,
            "detection_count": len(detections),
            "annotated_image": annotated_image_b64,
            "processing_time": round(processing_time, 3),
            "model_used": loaded_model_path,
            "image_size": [opencv_image.shape[1], opencv_image.shape[0]]  # width, height
        }
        
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Required packages not installed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model testing failed: {str(e)}")

@app.post("/api/model/detect")
async def detect_target(image: UploadFile = File(...), confidence: float = Form(0.25)):
    """Detect target in an image and return the highest confidence detection with center coordinates."""
    global loaded_model, loaded_model_path
    
    # Validate confidence threshold
    if confidence < 0.01 or confidence > 1.0:
        raise HTTPException(status_code=400, detail="Confidence threshold must be between 0.01 and 1.0")
    
    # Check if a model is loaded
    if loaded_model is None or loaded_model_path is None:
        raise HTTPException(status_code=400, detail="No model is currently loaded. Please select a model first.")
    
    # Validate image file
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read and process the uploaded image
        image_bytes = await image.read()
        
        # Convert to PIL Image
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL to OpenCV format (RGB to BGR)
        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Run inference using the pre-loaded model with custom confidence
        results = loaded_model(opencv_image, conf=confidence, device='cpu')  # Use CPU for consistency
        
        # Find the highest confidence detection
        best_box = None
        max_conf = 0.0
        
        for result in results:
            if result.boxes is not None:
                for box in result.boxes:
                    confidence = float(box.conf[0].cpu().numpy())
                    if confidence > max_conf:
                        max_conf = confidence
                        best_box = box.xyxy[0].cpu().numpy()
        
        # Return result based on detection
        if best_box is not None:
            x_min, y_min, x_max, y_max = map(int, best_box)
            center_x = (x_min + x_max) // 2
            center_y = (y_min + y_max) // 2
            return {
                "status": "success",
                "x": center_x,
                "y": center_y,
                "confidence": float(max_conf),
                "box": [x_min, y_min, x_max, y_max],
            }
        else:
            return {"status": "not_found"}
            
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Required packages not installed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Target detection failed: {str(e)}")

# Dataset management endpoints
@app.get("/api/dataset/info")
async def get_dataset_info():
    """Get dataset information including total count of images"""
    try:
        dataset_path = "/app/training_scripts/data/generated_dataset"
        images_path = os.path.join(dataset_path, "images")
        
        if not os.path.exists(images_path):
            return {"total_images": 0, "dataset_exists": False}
        
        # Count total images
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'}
        total_images = sum(1 for f in os.listdir(images_path) 
                          if os.path.splitext(f.lower())[1] in image_extensions)
        
        return {
            "total_images": total_images,
            "dataset_exists": True,
            "dataset_path": dataset_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dataset info: {str(e)}")

@app.get("/api/dataset/images")
async def get_dataset_images(page: int = 1, page_size: int = 25):
    """Get paginated list of dataset images"""
    try:
        dataset_path = "/app/training_scripts/data/generated_dataset"
        images_path = os.path.join(dataset_path, "images")
        
        if not os.path.exists(images_path):
            return {"images": [], "total": 0, "page": page, "page_size": page_size, "total_pages": 0}
        
        # Get all image files
        image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'}
        all_images = [f for f in os.listdir(images_path) 
                     if os.path.splitext(f.lower())[1] in image_extensions]
        all_images.sort()  # Sort alphabetically
        
        total_images = len(all_images)
        total_pages = (total_images + page_size - 1) // page_size
        
        # Calculate pagination
        start_idx = (page - 1) * page_size
        end_idx = min(start_idx + page_size, total_images)
        page_images = all_images[start_idx:end_idx]
        
        # Get image details
        images_data = []
        for img_name in page_images:
            img_path = os.path.join(images_path, img_name)
            try:
                with Image.open(img_path) as img:
                    width, height = img.size
                file_size = os.path.getsize(img_path)
                
                images_data.append({
                    "name": img_name,
                    "width": width,
                    "height": height,
                    "size": file_size,
                    "path": f"images/{img_name}"
                })
            except Exception as e:
                print(f"Error reading image {img_name}: {e}")
                continue
        
        return {
            "images": images_data,
            "total": total_images,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get dataset images: {str(e)}")

@app.get("/api/dataset/image/{image_name}")
async def get_dataset_image(image_name: str):
    """Get a specific dataset image file"""
    try:
        dataset_path = "/app/training_scripts/data/generated_dataset"
        images_path = os.path.join(dataset_path, "images")
        image_path = os.path.join(images_path, image_name)
        
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail="Image not found")
        
        return FileResponse(image_path, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get image: {str(e)}")

@app.get("/api/dataset/image/{image_name}/with-boxes")
async def get_dataset_image_with_boxes(image_name: str):
    """Get a dataset image with bounding boxes drawn on it"""
    try:
        dataset_path = "/app/training_scripts/data/generated_dataset"
        images_path = os.path.join(dataset_path, "images")
        labels_path = os.path.join(dataset_path, "labels")
        
        image_path = os.path.join(images_path, image_name)
        label_name = os.path.splitext(image_name)[0] + ".txt"
        label_path = os.path.join(labels_path, label_name)
        
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Load the image
        image = cv2.imread(image_path)
        if image is None:
            raise HTTPException(status_code=500, detail="Failed to load image")
        
        height, width = image.shape[:2]
        
        # Draw bounding boxes if label file exists
        if os.path.exists(label_path):
            with open(label_path, 'r') as f:
                lines = f.readlines()
            
            for line in lines:
                line = line.strip()
                if line:
                    parts = line.split()
                    if len(parts) >= 5:
                        class_id = int(parts[0])
                        x_center = float(parts[1])
                        y_center = float(parts[2])
                        box_width = float(parts[3])
                        box_height = float(parts[4])
                        
                        # Convert normalized coordinates to pixel coordinates
                        x_center_px = int(x_center * width)
                        y_center_px = int(y_center * height)
                        box_width_px = int(box_width * width)
                        box_height_px = int(box_height * height)
                        
                        # Calculate top-left and bottom-right corners
                        x1 = int(x_center_px - box_width_px // 2)
                        y1 = int(y_center_px - box_height_px // 2)
                        x2 = int(x_center_px + box_width_px // 2)
                        y2 = int(y_center_px + box_height_px // 2)
                        
                        # Draw rectangle (red color for class 0, other colors for other classes)
                        color = (0, 0, 255) if class_id == 0 else (0, 255, 0)  # BGR format
                        cv2.rectangle(image, (x1, y1), (x2, y2), color, 1)
                        
                        # Add styled class label with background
                        label = f"Class {class_id}"
                        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)[0]
                        cv2.rectangle(image, (x1, y1 - label_size[1] - 10), 
                                    (x1 + label_size[0], y1), color, -1)
                        cv2.putText(image, label, (x1, y1 - 5), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

        # Convert to RGB for PIL
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(image_rgb)
        
        # Save to memory buffer
        img_buffer = io.BytesIO()
        pil_image.save(img_buffer, format="JPEG", quality=95)
        img_buffer.seek(0)
        
        # Return as response
        return StreamingResponse(img_buffer, media_type="image/jpeg")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get image with boxes: {str(e)}")

@app.delete("/api/dataset/image/{image_name}")
async def delete_dataset_image(image_name: str):
    """Delete a specific dataset image and its corresponding label"""
    try:
        dataset_path = "/app/training_scripts/data/generated_dataset"
        images_path = os.path.join(dataset_path, "images")
        labels_path = os.path.join(dataset_path, "labels")
        
        image_path = os.path.join(images_path, image_name)
        
        # Get corresponding label file (same name but .txt extension)
        base_name = os.path.splitext(image_name)[0]
        label_path = os.path.join(labels_path, f"{base_name}.txt")
        
        deleted_files = []
        
        # Delete image file
        if os.path.exists(image_path):
            os.remove(image_path)
            deleted_files.append(f"images/{image_name}")
        
        # Delete corresponding label file
        if os.path.exists(label_path):
            os.remove(label_path)
            deleted_files.append(f"labels/{base_name}.txt")
        
        if not deleted_files:
            raise HTTPException(status_code=404, detail="Image not found")
        
        return {
            "status": "success",
            "deleted_files": deleted_files,
            "message": f"Successfully deleted {image_name} and its label"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")

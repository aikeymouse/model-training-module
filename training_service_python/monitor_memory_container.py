#!/usr/bin/env python3
"""
Memory monitoring script for Docker container
"""
import psutil
import time
import os
from datetime import datetime

def get_container_memory_info():
    """Get memory information from inside the container"""
    # Container memory from cgroup
    try:
        with open('/sys/fs/cgroup/memory/memory.usage_in_bytes', 'r') as f:
            usage_bytes = int(f.read().strip())
        with open('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'r') as f:
            limit_bytes = int(f.read().strip())
        
        # Convert to MB/GB
        usage_mb = usage_bytes / 1024 / 1024
        limit_mb = limit_bytes / 1024 / 1024
        usage_gb = usage_bytes / 1024**3
        limit_gb = limit_bytes / 1024**3
        
        cgroup_info = {
            'usage_mb': round(usage_mb, 2),
            'limit_mb': round(limit_mb, 2),
            'usage_gb': round(usage_gb, 2),
            'limit_gb': round(limit_gb, 2),
            'percentage': round((usage_bytes / limit_bytes) * 100, 2) if limit_bytes > 0 else 0
        }
    except:
        cgroup_info = {'error': 'Could not read cgroup memory info'}
    
    # System memory view from inside container
    mem = psutil.virtual_memory()
    
    # Find Python processes
    python_processes = []
    training_processes = []
    
    for proc in psutil.process_iter(['pid', 'name', 'memory_info', 'memory_percent', 'cmdline']):
        try:
            cmdline = ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
            memory_mb = proc.info['memory_info'].rss / 1024 / 1024
            
            if 'python' in proc.info['name'].lower():
                proc_info = {
                    'pid': proc.info['pid'],
                    'name': proc.info['name'],
                    'memory_mb': round(memory_mb, 2),
                    'memory_percent': round(proc.info['memory_percent'], 2),
                    'cmdline': cmdline[:100] + '...' if len(cmdline) > 100 else cmdline
                }
                python_processes.append(proc_info)
                
                # Check if it's a training process
                if any(keyword in cmdline.lower() for keyword in ['train', 'yolo', 'ultralytics']):
                    training_processes.append(proc_info)
                    
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    
    return {
        'timestamp': datetime.now().isoformat(),
        'cgroup_memory': cgroup_info,
        'system_memory': {
            'total_gb': round(mem.total / 1024**3, 2),
            'used_gb': round(mem.used / 1024**3, 2),
            'available_gb': round(mem.available / 1024**3, 2),
            'percent_used': mem.percent
        },
        'python_processes': python_processes,
        'training_processes': training_processes,
        'process_count': len(python_processes)
    }

def monitor_memory_simple(interval=3):
    """Simple memory monitoring with compact output"""
    print("=== DOCKER CONTAINER MEMORY MONITORING ===")
    print("Time\t\t\tContainer\tTraining Procs\tTop Process")
    print("-" * 80)
    
    try:
        while True:
            info = get_container_memory_info()
            
            # Container memory usage
            if 'error' not in info['cgroup_memory']:
                container_usage = f"{info['cgroup_memory']['usage_gb']:.1f}GB/{info['cgroup_memory']['limit_gb']:.1f}GB ({info['cgroup_memory']['percentage']:.1f}%)"
            else:
                container_usage = f"{info['system_memory']['used_gb']:.1f}GB"
            
            # Training process info
            if info['training_processes']:
                training_info = f"{len(info['training_processes'])} procs"
                top_training = max(info['training_processes'], key=lambda x: x['memory_mb'])
                top_proc_info = f"{top_training['memory_mb']:.0f}MB"
            else:
                training_info = "No training"
                # Find top Python process
                if info['python_processes']:
                    top_python = max(info['python_processes'], key=lambda x: x['memory_mb'])
                    top_proc_info = f"{top_python['name']} ({top_python['memory_mb']:.0f}MB)"
                else:
                    top_proc_info = "No Python procs"
            
            print(f"{info['timestamp'][:19]}\t{container_usage}\t{training_info}\t\t{top_proc_info}")
            
            # Show detailed training process info if available
            for proc in info['training_processes']:
                if proc['memory_mb'] > 50:  # Only show processes using >50MB
                    print(f"  -> PID {proc['pid']}: {proc['memory_mb']:.1f}MB - {proc['cmdline'][:60]}")
            
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print("\nMonitoring stopped")

def monitor_memory_detailed():
    """Detailed memory monitoring"""
    while True:
        try:
            info = get_container_memory_info()
            print(f"\n=== {info['timestamp']} ===")
            
            if 'error' not in info['cgroup_memory']:
                print(f"Container Memory: {info['cgroup_memory']['usage_gb']:.2f}GB / {info['cgroup_memory']['limit_gb']:.2f}GB ({info['cgroup_memory']['percentage']:.1f}%)")
            
            print(f"System Memory: {info['system_memory']['used_gb']:.2f}GB / {info['system_memory']['total_gb']:.2f}GB ({info['system_memory']['percent_used']:.1f}%)")
            
            if info['training_processes']:
                print(f"\nTraining Processes ({len(info['training_processes'])}):")
                for proc in info['training_processes']:
                    print(f"  PID {proc['pid']}: {proc['memory_mb']:.1f}MB - {proc['cmdline']}")
            
            if info['python_processes']:
                print(f"\nAll Python Processes ({len(info['python_processes'])}):")
                for proc in sorted(info['python_processes'], key=lambda x: x['memory_mb'], reverse=True):
                    print(f"  PID {proc['pid']}: {proc['memory_mb']:.1f}MB - {proc['name']}")
            
            time.sleep(5)
            
        except KeyboardInterrupt:
            print("\nMonitoring stopped")
            break

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--detailed":
        monitor_memory_detailed()
    else:
        monitor_memory_simple()

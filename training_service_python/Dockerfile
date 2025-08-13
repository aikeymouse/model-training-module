FROM python:3.9-slim

# Install system dependencies for OpenCV and OpenGL
RUN apt-get update && apt-get install -y \
    libgl1-mesa-dri \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgeos-dev \
    libgthread-2.0-0 \
    libgtk-3-0 \
    libglvnd0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application
CMD ["uvicorn", "main_v8:app", "--host", "0.0.0.0", "--port", "3001"]
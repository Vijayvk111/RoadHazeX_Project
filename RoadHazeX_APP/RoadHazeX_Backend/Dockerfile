# Step 9: Docker Update for Hugging Face Spaces
FROM python:3.9-slim

# Install system dependencies for CLIP and OpenCV
RUN apt-get update && apt-get install -y \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set up a new user named "user" with user ID 1000 (Required for Hugging Face Spaces)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

# Copy requirements first for better caching
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files (including data folder, models, and scripts)
COPY --chown=user . .

# Expose the default Hugging Face port
EXPOSE 7860

# Run the application
CMD ["python", "app.py"]

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Install database drivers
RUN pip install pymysql cryptography

# Copy project files
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY src/ ./src/
RUN rm -rf ./src/ui_component_agent.egg-info
COPY start_web.sh start_api.sh ./

# Make scripts executable
RUN chmod +x start_web.sh start_api.sh

# Expose port
EXPOSE 8002

# Default command
CMD ["./start_web.sh"]

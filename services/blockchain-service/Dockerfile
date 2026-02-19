# Dockerfile for Blockchain Service (Python/FastAPI)
# Multi-stage build

FROM python:3.11-slim AS builder

WORKDIR /app

# Copy requirements
COPY requirements.txt ./

# Install dependencies in a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Production image
FROM python:3.11-slim

WORKDIR /app

# Install dumb-init and bash for signal handling and entrypoint script
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init bash && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY app ./app
COPY contracts ./contracts
COPY scripts ./scripts
COPY entrypoint.sh ./entrypoint.sh

# Make entrypoint executable
RUN chmod +x ./entrypoint.sh

ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user
RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:3003/health')" || exit 1

# Use dumb-init wrapper with entrypoint script
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start with entrypoint script that deploys contracts first
CMD ["./entrypoint.sh"]

EXPOSE 3003

# Dockerfile for CV Parser Service (Python/Flask)
# Multi-stage build

FROM python:3.11-slim AS builder

WORKDIR /app

# Copy requirements
COPY requirements.txt ./

# Create virtual environment and install dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim

WORKDIR /app

# Install dumb-init and security packages
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy venv from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application
COPY src ./src

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

# Create non-root user
RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5001/health')" || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start Flask application
CMD ["python", "-m", "flask", "--app", "src.app", "run", "--host", "0.0.0.0", "--port", "5001"]

EXPOSE 5001

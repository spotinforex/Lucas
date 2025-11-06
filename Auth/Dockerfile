# ---------- BASE IMAGE ----------
FROM python:3.11-slim

# ---------- SYSTEM SETUP ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc curl && rm -rf /var/lib/apt/lists/*

# ---------- APP DIRECTORY ----------
WORKDIR /app

# ---------- COPY CODE ----------
COPY __init__.py ./
COPY api_server.py ./
COPY requirements.txt ./
COPY verification.py ./

# ---------- INSTALL DEPENDENCIES ----------
RUN pip install --no-cache-dir -r requirements.txt

# ------------ API CALL --------------------
CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8080"]

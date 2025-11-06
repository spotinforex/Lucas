# ---------- BASE IMAGE ----------
FROM python:3.11-slim

# ---------- SYSTEM SETUP ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc curl && rm -rf /var/lib/apt/lists/*

# ---------- APP DIRECTORY ----------
WORKDIR /app

# ---------- COPY CODE ----------
COPY main.py ./
COPY requirements.txt ./

# ---------- INSTALL DEPENDENCIES ----------
RUN pip install --no-cache-dir -r requirements.txt

# ---------- ENTRYPOINT ----------
ENTRYPOINT ["python", "main.py"]


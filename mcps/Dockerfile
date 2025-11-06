# ---------- BASE IMAGE ----------
FROM python:3.11-slim

# ---------- SYSTEM SETUP ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc curl && rm -rf /var/lib/apt/lists/*

# ---------- APP DIRECTORY ----------
WORKDIR /app

# ---------- COPY CODE ----------
COPY __init__.py ./
COPY data_tool.py ./
COPY requirements.txt ./
COPY db_conn.py ./
COPY mcp_api.py ./
COPY mcp_engine.py ./
COPY mcp_client.py ./
COPY sandbox_orchestrator.py ./
COPY sandbox_tool.py ./
COPY session_store.py ./

# ---------- INSTALL DEPENDENCIES ----------
RUN pip install --no-cache-dir -r requirements.txt

# ------------ EXPOSED PORT ----------------
EXPOSE 8080

# ------------ API CALL --------------------
CMD ["uvicorn", "mcp_api:app", "--host", "0.0.0.0", "--port", "8080"]


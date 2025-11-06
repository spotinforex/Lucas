from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any
import httpx
from verification import verify_supabase_jwt
import os, logging
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

#load_dotenv()
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Lucas Backend Server")

origins = [
    "https://lucas-frontend-215805715498.us-central1.run.app",
    "http://localhost:5173",  
    "http://127.0.0.1:5173", 
]

# Adding the CORS middleware 
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # Allows specific origins to make requests
    allow_credentials=True,       # Allows cookies/authorization headers
    allow_methods=["*"],          # Allows all HTTP methods (GET, POST, DELETE, etc.)
    allow_headers=["*"],          # Allows all headers (including Authorization)
)

website = os.getenv("website")

#  VERIFY JWT TOKEN

@app.get("/verify")
async def verify_token(authorization: Optional[str] = Header(None)):
    """Verifies Supabase JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    try:
        token = authorization.split(" ")[1]
        decoded = verify_supabase_jwt(token)
        if decoded:
            return {"message": "Token is valid", "claims": decoded}
        else:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")


#------- SEND MESSAGE (TEXT or IMAGE)-------

@app.post("/message")
async def send_message(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    '''
    Forwards user message (text or image) to Lucas Agent API (/run).
    Verifies JWT before sending.
    '''

    # Verify JWT
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ")[1]
    logging.info("Verifying Message Tokens")
    user_claims = verify_supabase_jwt(token)
    if not user_claims:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Parse request body
    body = await request.json()
    required_fields = ["session_id", "message"]
    for field in required_fields:
        if field not in body:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    session_id = body["session_id"]
    user_message = body["message"]

    # Optional: image data
    image_info = body.get("image")  # expects dict with keys: display_name, data, mime_type

    logging.info("Building Message Parts")
    # 3.Build parts dynamically
    parts = [{"text": user_message}]
    if image_info:
        # Validate required image fields
        for k in ["display_name", "data", "mime_type"]:
            if k not in image_info:
                raise HTTPException(status_code=400, detail=f"Missing image field: {k}")

        parts.append({
            "inlineData": {
                "display_name": image_info["display_name"],
                "data": image_info["data"],
                "mime_type": image_info["mime_type"]
            }
        })

    # 4. Prepare payload for Lucas-agent-app /run
    run_payload = {
        "app_name": "Lucas-agent-app",
        "user_id": user_claims.get("sub", "anonymous_user"),
        "session_id": session_id,
        "new_message": {
            "role": "user",
            "parts": parts
        },
        "streaming": True
    }
    logging.info("Calling Lucas Agents")
    # 5 Forward request to Lucas ADK Agent
    async def event_stream():
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST",
                    f"{website}/run_sse",
                    json=run_payload,
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if line.startswith("data:"):
                            yield f"{line}\n\n"  # forward as-is
        except httpx.RequestError as e:
            yield f"data: {{\"error\": \"Agent unreachable: {str(e)}\"}}\n\n"
        except httpx.HTTPStatusError as e:
            yield f"data: {{\"error\": \"Agent error: {e.response.text}\"}}\n\n"
        except Exception as e:
            yield f"data: {{\"error\": \"Internal error: {str(e)}\"}}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

# --------SESSION MANAGEMENT-----------

@app.post("/session")
async def create_or_update_session(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    '''
    Creates or updates a session for the user.
    Expects JSON body with 'session_id' and optional state dict.
    '''
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ")[1]
    logging.info("Verifying Session Tokens")
    user_claims = verify_supabase_jwt(token)
    if not user_claims:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    body = await request.json()
    if "session_id" not in body:
        raise HTTPException(status_code=400, detail="Missing required field: session_id")

    session_id = body["session_id"]
    state = body.get("state", {})

    payload = state  # directly send the state as body for Lucas session API
    user_id = user_claims.get("sub", "anonymous_user")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{website}/apps/Lucas-agent-app/users/{user_id}/sessions/{session_id}",
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Session service unreachable: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@app.get("/session/{session_id}")
async def get_session(session_id: str, authorization: Optional[str] = Header(None)):
    """Fetch a specific session state and events."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    logging.info("Verifying Getting Session Tokens")
    token = authorization.split(" ")[1]
    user_claims = verify_supabase_jwt(token)
    if not user_claims:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = user_claims.get("sub", "anonymous_user")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{website}/apps/Lucas-agent-app/users/{user_id}/sessions/{session_id}",
                timeout=60.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Session service unreachable: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)


@app.delete("/session/{session_id}")
async def delete_session(session_id: str, authorization: Optional[str] = Header(None)):
    """Delete a session for the user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ")[1]
    logging.info("Verifying Deleting Sessions Tokens")
    user_claims = verify_supabase_jwt(token)
    if not user_claims:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = user_claims.get("sub", "anonymous_user")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{website}/apps/Lucas-agent-app/users/{user_id}/sessions/{session_id}",
                timeout=60.0
            )
            if response.status_code == 204:
                return {"message": f"Session {session_id} deleted successfully"}
            response.raise_for_status()
            return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Session service unreachable: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)

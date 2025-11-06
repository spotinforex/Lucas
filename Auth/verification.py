from jose import jwt, JWTError
import os
import logging
from dotenv import load_dotenv
from fastapi import HTTPException, status

#load_dotenv()

logging.basicConfig(level=logging.INFO)

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def verify_supabase_jwt(token:str):
    ''' Function to verify jwt token
    Args:
        token: jwt token
    Return:
        decoded token if valid else None
    '''
    try:
      decoded = jwt.decode(
          token,
          SUPABASE_JWT_SECRET,
          algorithms = ["HS256"],
          options = {"verify_aud": False}
          )
      logging.info(f" Decode String {decoded}")
      return decoded
    except JWTError as e:
      raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail = f"Invalid token: {e}"
            )
    except Exception as e:
      logging.error(f"An error occurred while decoding token {e}")
      return None

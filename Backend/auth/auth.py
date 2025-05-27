# from jose import jwt
# from datetime import datetime, timedelta
# from fastapi import HTTPException, Depends, Request
# from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# from dotenv import load_dotenv
# import os

# load_dotenv()

# SECRET_KEY = os.getenv("SECRET_KEY")
# ALGORITHM = os.getenv("ALGORITHM")
# ACCESS_TOKEN_EXPIRE_MINUTES = 30

# def create_access_token(data: dict):
#     to_encode = data.copy()
#     expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     to_encode.update({"exp": expire})
#     return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# class JWTBearer(HTTPBearer):
#     def __init__(self, auto_error: bool = True):
#         super(JWTBearer, self).__init__(auto_error=auto_error)

#     async def __call__(self, request: Request):
#         credentials: HTTPAuthorizationCredentials = await super().__call__(request)
#         if credentials:
#             try:
#                 payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
#                 return payload
#             except jwt.ExpiredSignatureError:
#                 raise HTTPException(status_code=401, detail="Token expired")
#             except jwt.JWTError:
#                 raise HTTPException(status_code=401, detail="Invalid token")
#         raise HTTPException(status_code=403, detail="Invalid authorization code")


from jose import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from app.database import get_db
from app.models import User
from utils.logger import logger
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super().__call__(request)
        if credentials:
            try:
                payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
                return payload
            except jwt.ExpiredSignatureError:
                logger.warning("Token expired")
                raise HTTPException(status_code=401, detail="Token expired")
            except jwt.JWTError:
                logger.warning("Invalid token")
                raise HTTPException(status_code=401, detail="Invalid token")
        logger.warning("Invalid authorization code")
        raise HTTPException(status_code=403, detail="Invalid authorization code")

# Create a dependency that will be used to get the current user
jwt_bearer = JWTBearer()

async def get_current_user(
    payload: dict = Depends(jwt_bearer),
    db: Session = Depends(get_db)
):
    """Get the current user from the database based on the JWT token"""
    username = payload.get("sub")
    if username is None:
        logger.warning("Token missing username claim")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get the user from the database
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        logger.warning(f"User not found: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"Authenticated user: {username}")
    return user

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth.user_routes import router as auth_router
from utils.logger import logger
from app.database import init_db
from app.resume_router import router as resume_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # or ["*"] for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("startup")
async def startup_event():
    init_db()
    logger.info("Server started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Server shutting down")

app.include_router(auth_router, prefix="/auth")
app.include_router(resume_router, prefix="/resume", tags=["resume"])

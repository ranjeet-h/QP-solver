from fastapi import APIRouter
from app.api.endpoints import auth, pdf_process, payment

api_router = APIRouter()

# Include routers from endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(pdf_process.router, prefix="/pdf", tags=["pdf-processing"])
api_router.include_router(payment.router, prefix="/payment", tags=["payment"])

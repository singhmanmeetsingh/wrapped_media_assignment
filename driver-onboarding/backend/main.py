from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from adapters.inbound.api import auth, campaigns, drivers, health, vehicles
from config import settings

app = FastAPI(title="Driver Onboarding API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "API is running"}


app.include_router(auth.router, prefix="/api")
app.include_router(drivers.router, prefix="/api")
app.include_router(vehicles.router, prefix="/api")
app.include_router(campaigns.router, prefix="/api")
app.include_router(health.router, prefix="/api")

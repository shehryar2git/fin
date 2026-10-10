from fastapi import FastAPI
from src.providers import PROVIDERS

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Welcome to the Fintechathon API"}

@app.get("/providers")
def get_providers():
    return PROVIDERS
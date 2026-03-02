from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from uploader import (
    resize_product_image,
    get_products,
    preview_product_image
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ THIS IS REQUIRED
class ResizeRequest(BaseModel):
    width: int
    height: int


@app.get("/products")
def fetch_products():
    return get_products()


@app.post("/preview/{product_id}")
def preview(product_id: str, data: ResizeRequest):
    return preview_product_image(product_id, data.width, data.height)


@app.post("/confirm/{product_id}")
def confirm_resize(product_id: str, data: ResizeRequest):
    return resize_product_image(product_id, data.width, data.height)
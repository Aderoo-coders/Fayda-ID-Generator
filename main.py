"""
Image API: portrait slot crop (Fayda ID layout) + optional Haar frontal-face crop.
Matches frontend card preview box: 850×540 layout → normalized rect on any image size.
"""

from __future__ import annotations

import base64
from typing import Literal

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from face_pipeline import extract_fayda_face

# Same ratios as frontend `id-card-preview` portrait slot (850×540 reference).
_CARD_W = 850
_CARD_H = 540
FRONT_PHOTO_NORM = {
    "x": 186 / _CARD_W,
    "y": 171 / _CARD_H,
    "w": 348 / _CARD_W,
    "h": 443 / _CARD_H,
}

MAX_UPLOAD_BYTES = 15 * 1024 * 1024


class BBox(BaseModel):
    x: int
    y: int
    w: int
    h: int


class FaceExtractResponse(BaseModel):
    """Fayda ID face extraction (aligned 2000×1300, Haar + slot fallback)."""

    face_detected: bool
    confidence: int = Field(..., ge=0, le=100)
    bbox: BBox
    crop_png_base64: str = Field(..., description="PNG crop, base64-encoded")


app = FastAPI(title="Fayda Image Processing", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _decode_upload(data: bytes) -> np.ndarray:
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image too large (max 15MB)")
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(422, "Could not decode image (use JPEG or PNG)")
    return img


def _encode_png_b64(img_bgr: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img_bgr)
    if not ok:
        raise HTTPException(500, "Failed to encode PNG")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def crop_slot(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    sx = int(w * FRONT_PHOTO_NORM["x"])
    sy = int(h * FRONT_PHOTO_NORM["y"])
    sw = max(16, int(w * FRONT_PHOTO_NORM["w"]))
    sh = max(16, int(h * FRONT_PHOTO_NORM["h"]))
    return img[sy : sy + sh, sx : sx + sw]


def crop_face_haar(img: np.ndarray) -> np.ndarray | None:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(cascade_path)
    if cascade.empty():
        return None
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))
    if len(faces) == 0:
        return None
    x, y, fw, fh = max(faces, key=lambda r: r[2] * r[3])
    margin_x = int(fw * 0.2)
    margin_y = int(fh * 0.25)
    x1 = max(0, x - margin_x)
    y1 = max(0, y - margin_y)
    x2 = min(img.shape[1], x + fw + margin_x)
    y2 = min(img.shape[0], y + fh + margin_y)
    crop = img[y1:y2, x1:x2]
    if crop.size == 0:
        return None
    return crop


def process_image(img: np.ndarray, mode: Literal["auto", "slot", "face"]) -> tuple[np.ndarray, str]:
    if mode == "slot":
        return crop_slot(img), "slot_crop"
    if mode == "face":
        face = crop_face_haar(img)
        if face is None:
            raise HTTPException(422, "No face detected")
        return face, "face_haar"
    # auto: try face, then slot
    face = crop_face_haar(img)
    if face is not None:
        return face, "face_haar"
    return crop_slot(img), "slot_crop"


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/process")
async def process(
    image: UploadFile = File(..., description="JPEG or PNG"),
    mode: Literal["auto", "slot", "face"] = Query(
        "auto",
        description="'auto' = face Haar if found else slot; 'slot' = ID photo region only; 'face' = face only (422 if none)",
    ),
) -> dict[str, str]:
    raw = await image.read()
    img = _decode_upload(raw)
    try:
        cropped, method = process_image(img, mode)
    except HTTPException:
        raise
    return {"photo": _encode_png_b64(cropped), "method": method}


@app.post("/extract-face", response_model=FaceExtractResponse)
async def extract_face(image: UploadFile = File(..., description="JPEG or PNG — Fayda ID card")) -> FaceExtractResponse:
    """
    1) Detect card quad → perspective warp (else resize) to **2000×1300**.
    2) OpenCV Haar frontal face on normalized image (no OCR).
    3) If no face: crop fixed **portrait slot** (same layout as frontend).
    """
    raw = await image.read()
    img = _decode_upload(raw)
    try:
        result = extract_fayda_face(img)
    except RuntimeError as e:
        raise HTTPException(500, str(e)) from e
    return FaceExtractResponse(
        face_detected=result.face_detected,
        confidence=result.confidence,
        bbox=BBox(**result.bbox),
        crop_png_base64=result.crop_png_base64,
    )

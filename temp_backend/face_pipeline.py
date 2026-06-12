"""
Fayda ID card: align → normalize (2000×1300) → Haar face OR layout fallback.
No OCR. Returns bbox on the normalized canvas + cropped face PNG bytes.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass

import cv2
import numpy as np

# Canonical card size after normalization (layout matches Fayda preview ratios).
NORM_W = 2000
NORM_H = 1300

# Portrait slot on reference 850×540 — same ratios as frontend / main.FRONT_PHOTO_NORM
_CARD_REF_W = 850
_CARD_REF_H = 540
SLOT_NORM = {
    "x": 186 / _CARD_REF_W,
    "y": 171 / _CARD_REF_H,
    "w": 348 / _CARD_REF_W,
    "h": 443 / _CARD_REF_H,
}


def _order_quad_pts(pts: np.ndarray) -> np.ndarray:
    """Order corners: TL, TR, BR, BL."""
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def detect_card_quad(gray: np.ndarray) -> np.ndarray | None:
    """Try to find largest quadrilateral contour (ID card boundary)."""
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 180)
    edged = cv2.dilate(edged, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    h_img, w_img = gray.shape[:2]
    img_area = float(w_img * h_img)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:15]
    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        if peri < 100:
            continue
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        if len(approx) != 4:
            continue
        area = cv2.contourArea(approx)
        if area < 0.15 * img_area:
            continue
        pts = approx.reshape(4, 2).astype(np.float32)
        return _order_quad_pts(pts)
    return None


def warp_card_to_normalized(img_bgr: np.ndarray) -> tuple[np.ndarray, bool]:
    """
    Warp card to NORM_W×NORM_H. Returns (warped_bgr, used_perspective).
    If quad detection fails, stretch-resize whole image (may distort).
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    quad = detect_card_quad(gray)
    if quad is None:
        resized = cv2.resize(img_bgr, (NORM_W, NORM_H), interpolation=cv2.INTER_AREA)
        return resized, False

    dst = np.array(
        [[0, 0], [NORM_W - 1, 0], [NORM_W - 1, NORM_H - 1], [0, NORM_H - 1]],
        dtype=np.float32,
    )
    mat = cv2.getPerspectiveTransform(quad, dst)
    warped = cv2.warpPerspective(img_bgr, mat, (NORM_W, NORM_H), flags=cv2.INTER_LINEAR)
    return warped, True


def _haar_detect_largest(gray: np.ndarray) -> tuple[int, int, int, int] | None:
    path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(path)
    if cascade.empty():
        return None
    faces = cascade.detectMultiScale(
        gray,
        scaleFactor=1.08,
        minNeighbors=5,
        minSize=(max(48, NORM_W // 35), max(48, NORM_W // 35)),
        flags=cv2.CASCADE_SCALE_IMAGE,
    )
    if len(faces) == 0:
        return None
    x, y, fw, fh = max(faces, key=lambda r: r[2] * r[3])
    return int(x), int(y), int(fw), int(fh)


def _expand_face_crop(
    x: int,
    y: int,
    w: int,
    h: int,
    img_w: int,
    img_h: int,
    margin_frac: float = 0.22,
) -> tuple[int, int, int, int]:
    """Expand Haar face box with margins; clamp to normalized image."""
    mx = int(w * margin_frac)
    my = int(h * margin_frac)
    x1 = max(0, x - mx)
    y1 = max(0, y - my)
    x2 = min(img_w, x + w + mx)
    y2 = min(img_h, y + h + my)
    cw = max(16, x2 - x1)
    ch = max(16, y2 - y1)
    return x1, y1, cw, ch


def _confidence_haar(w: int, h: int, img_w: int, img_h: int) -> int:
    """Heuristic 0–100 from relative face size (Haar has no probability)."""
    rel = (w * h) / float(img_w * img_h)
    score = 58 + int(min(37, rel * 900))
    return max(55, min(98, score))


def _confidence_slot() -> int:
    return 48


@dataclass
class FaceExtractResult:
    face_detected: bool
    confidence: int
    bbox: dict[str, int]
    crop_png_base64: str


def extract_fayda_face(img_bgr: np.ndarray) -> FaceExtractResult:
    """
    Full pipeline: optional perspective warp → 2000×1300 → Haar or slot fallback.
    """
    normalized, _ = warp_card_to_normalized(img_bgr)
    H, W = normalized.shape[:2]
    gray = cv2.cvtColor(normalized, cv2.COLOR_BGR2GRAY)

    face = _haar_detect_largest(gray)
    if face is not None:
        fx, fy, fw, fh = face
        x1, y1, cw, ch = _expand_face_crop(fx, fy, fw, fh, W, H)
        crop = normalized[y1 : y1 + ch, x1 : x1 + cw]
        conf = _confidence_haar(fw, fh, W, H)
        ok, buf = cv2.imencode(".png", crop)
        if not ok:
            raise RuntimeError("encode failed")
        b64 = base64.b64encode(buf.tobytes()).decode("ascii")
        return FaceExtractResult(
            face_detected=True,
            confidence=conf,
            bbox={"x": x1, "y": y1, "w": cw, "h": ch},
            crop_png_base64=b64,
        )

    # Fallback: fixed layout slot on normalized canvas
    sx = int(W * SLOT_NORM["x"])
    sy = int(H * SLOT_NORM["y"])
    sw = max(16, int(W * SLOT_NORM["w"]))
    sh = max(16, int(H * SLOT_NORM["h"]))
    crop = normalized[sy : sy + sh, sx : sx + sw]
    ok, buf = cv2.imencode(".png", crop)
    if not ok:
        raise RuntimeError("encode failed")
    b64 = base64.b64encode(buf.tobytes()).decode("ascii")
    return FaceExtractResult(
        face_detected=False,
        confidence=_confidence_slot(),
        bbox={"x": sx, "y": sy, "w": sw, "h": sh},
        crop_png_base64=b64,
    )

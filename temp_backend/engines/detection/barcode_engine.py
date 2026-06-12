from pyzbar.pyzbar import decode
from PIL import Image


def detect_barcodes(image_path):
    img = Image.open(image_path).convert('RGB')
    decoded = decode(img)
    results = []
    for d in decoded:
        results.append({
            'type': d.type,
            'data': d.data.decode('utf-8'),
            'rect': {
                'left': d.rect.left,
                'top': d.rect.top,
                'width': d.rect.width,
                'height': d.rect.height,
            }
        })
    return results

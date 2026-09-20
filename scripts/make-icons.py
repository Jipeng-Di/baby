"""Generate simple PNG PWA icons using only Python's standard library."""
import struct
import zlib
from pathlib import Path

out = Path(__file__).resolve().parents[1] / 'public'

def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)

def make(size):
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            xx, yy = x / size, y / size
            bg = (19, 121, 91)
            neck = .34 <= xx <= .66 and .19 <= yy <= .34
            body = .27 <= xx <= .73 and .34 <= yy <= .83
            rounded_bottom = body and (yy < .74 or (.3 <= xx <= .7) or ((xx - .35) ** 2 + (yy - .74) ** 2 <= .08 ** 2) or ((xx - .65) ** 2 + (yy - .74) ** 2 <= .08 ** 2))
            mark = .37 <= xx <= .63 and any(abs(yy - k) < .012 for k in (.48, .57, .66))
            rgb = bg if mark else (255, 255, 255) if neck or rounded_bottom else bg
            raw.extend((*rgb, 255))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!2I5B', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')
    (out / f'icon-{size}.png').write_bytes(png)
for size in (180, 192, 512):
    make(size)

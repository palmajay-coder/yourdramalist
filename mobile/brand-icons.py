"""Apply the existing YourDramaList app icon to generated Capacitor projects."""
import base64
import io
import re
from pathlib import Path

from PIL import Image

mobile = Path(__file__).resolve().parent
icon_source = (mobile.parent / "addonIcon.ts").read_text()
encoded = re.search(r'"([A-Za-z0-9+/=]{500,})"', icon_source)[1]
original = Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGBA")

android = mobile / "android/app/src/main/res"
for path in android.glob("mipmap-*/*.png"):
    with Image.open(path) as existing:
        size = existing.size
    if path.stem.endswith("foreground"):
        icon = Image.new("RGBA", size)
        scaled = tuple(round(dimension * 0.62) for dimension in size)
        artwork = original.resize(scaled, Image.Resampling.LANCZOS)
        icon.alpha_composite(artwork, tuple((outer - inner) // 2 for outer, inner in zip(size, scaled)))
    else:
        icon = original.resize(size, Image.Resampling.LANCZOS)
    icon.save(path)

ios = mobile / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
if ios.exists():
    image = Image.new("RGB", (1024, 1024), "#181818")
    artwork = original.resize(image.size, Image.Resampling.LANCZOS)
    image.paste(artwork, mask=artwork)
    image.save(ios)

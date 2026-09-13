# Assets (not deployed)

| Path | Contents |
| --- | --- |
| [`source/`](source/) | Original home-page photography before webp export to `frontend/img/` |
| [`design/`](design/) | Claude Design handoff (`High Jewellery.dc.html`, uploads, `.image-slots.state.json`) |

Deployed images live under **`frontend/img/`** and **`frontend/high-jewellery/img/`**.

Re-export example:

```bash
cwebp -q 86 -m 6 assets/source/<file> -o frontend/img/<name>.webp
```

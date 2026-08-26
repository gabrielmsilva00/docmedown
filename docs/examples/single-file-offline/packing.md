---
title: Pack the manual
description: Build and verify the portable offline output.
order: 2
---

# Pack the manual

From the repository root, run:

```bash
npx docmedown build ./docs/examples/single-file-offline
```

Open `docs/examples/single-file-offline/.dist/index.html` directly in a browser. No server, fetch request, parent manifest, or parent component registry is required.
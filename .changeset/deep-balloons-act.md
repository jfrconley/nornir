---
"@nornir/rest": major
---

removed decorator based api and compiler transformer

With the coming changes in typescript 7, the future of transformers is uncertain.
Compared to straightforward spec-first development, the juice just isn't worth the squeeze.
If you really did build something based on decorator api, you'd likely have to stay on your existing typescript version anyways.

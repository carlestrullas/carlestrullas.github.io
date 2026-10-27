# carlestrullas.github.io

Source of my personal website: [carlestrullas.github.io](https://carlestrullas.github.io).

Plain HTML, CSS and JavaScript with no build step. GitHub Pages deploys the repository root on every push to `main` (see `.github/workflows/static.yml`).

```
index.html          single-page site
css/style.css       design tokens, layout, light and dark themes
js/field.js         animated phase portrait in the hero (canvas)
js/main.js          theme toggle, header state, active nav link
images/             portrait (WebP + JPEG) and the social preview image
assets/pdf/         CV
```

To preview locally:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000.

# carlestrullas.github.io

Source of my personal website: [carlestrullas.github.io](https://carlestrullas.github.io).

Plain HTML, CSS and JavaScript with no build step. GitHub Pages deploys the repository root on every push to `main` (see `.github/workflows/static.yml`).

```
index.html          single-page site
css/style.css       design tokens, layout, light and dark themes
js/net.js           interactive neural network behind the hero (canvas)
js/main.js          theme toggle, header state, active nav link
images/             portrait (WebP + JPEG) and the social preview image
assets/pdf/         CV
```

To preview locally:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000.

## Blog

Posts live under `blog/`, one folder per post:

- `blog/index.html` lists the posts, newest first.
- `blog/<post-slug>/index.html` is one post.
- `css/blog.css` holds the blog styles (article text, code blocks, diagrams). It builds on `css/style.css`.

To add a post, copy an existing post folder, change the content, and add an entry to the list in `blog/index.html`.

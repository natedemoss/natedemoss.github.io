# natedemoss.github.io

Personal site — <https://natedemoss.dev>

Plain HTML and CSS, no build step, typeset to look like a LaTeX article
(Latin Modern from jsDelivr, KaTeX for math in posts).

- `index.html`: home (abstract, experience, honors, live GitHub activity, writing, interests)
- `projects.html`: projects, as a bibliography
- `writing/`: posts; `writing/index.html` is the table of contents
- `style.css`: everything visual; `activity.js`: GitHub events table; `math.js`: KaTeX auto-render

Preview locally with `python -m http.server 8123` and open <http://127.0.0.1:8123/>.

Push to `main`; the workflow in `.github/workflows/deploy.yml` uploads the repo
root to GitHub Pages. The previous Astro blog lives on the `astro-blog-backup` branch.

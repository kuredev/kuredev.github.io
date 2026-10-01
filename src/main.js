import { site } from "./config.js";
import content from "./content.json";
import "./style.css";

const links = site.links.filter((link) => link.href);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function repoMeta(repo) {
  return [repo.language, repo.stars ? `★ ${repo.stars}` : null, formatDate(repo.updatedAt)]
    .filter(Boolean)
    .join("  ·  ");
}

function articleMeta(article) {
  return [article.source, formatDate(article.publishedAt)].filter(Boolean).join("  ·  ");
}

function list(items, href, title, meta) {
  if (!items.length) {
    return `<p class="empty">まだありません。src/config.js にユーザー名を入れると、ビルド時に取得します。</p>`;
  }
  return `<ul class="list">${items
    .map(
      (item) => `
        <li>
          <a href="${escapeHtml(href(item))}" rel="noreferrer">
            <span class="title">${escapeHtml(title(item))}</span>
            <span class="meta">${escapeHtml(meta(item))}</span>
          </a>
        </li>`,
    )
    .join("")}</ul>`;
}

document.querySelector("#app").innerHTML = `
  <main class="page">
    <header class="top">
      <p class="kicker">PORTFOLIO</p>
      <h1>${escapeHtml(site.name)}</h1>
      <p class="role">${escapeHtml(site.role)}</p>
      <p class="bio">${escapeHtml(site.bio)}</p>
      ${
        links.length
          ? `<ul class="links">${links
              .map(
                (link) =>
                  `<li><a href="${escapeHtml(link.href)}" rel="noreferrer">${escapeHtml(link.label)}</a></li>`,
              )
              .join("")}</ul>`
          : ""
      }
    </header>
    <nav>
      <a href="#works">Works</a>
      <a href="#articles">Articles</a>
    </nav>
    <section id="works">
      <h2>WORKS</h2>
      ${list(content.repos, (repo) => repo.url, (repo) => repo.name, repoMeta)}
    </section>
    <section id="articles">
      <h2>ARTICLES</h2>
      ${list(content.articles, (article) => article.url, (article) => article.title, articleMeta)}
    </section>
    <footer>Last built ${formatDate(content.generatedAt)}</footer>
  </main>
`;

document.title = site.name;

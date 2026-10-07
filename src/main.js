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

function softwareMeta(software) {
  return [software.description, software.released ? `公開 ${software.released}` : null]
    .filter(Boolean)
    .join("  ·  ");
}

function activityMeta(activity) {
  return [activity.event, activity.award].filter(Boolean).join("  ·  ");
}

function thumb(src) {
  return src
    ? `<img src="${escapeHtml(src)}" alt="" loading="lazy" />`
    : `<div class="thumb-empty"></div>`;
}

function list(items, href, title, meta, image) {
  if (!items.length) {
    return `<p class="empty">まだありません。src/config.js にユーザー名を入れると、ビルド時に取得します。</p>`;
  }
  return `<ul class="list">${items
    .map(
      (item) => `
        <li>
          <a href="${escapeHtml(href(item))}" target="_blank" rel="noopener noreferrer"${image ? ' class="with-thumb"' : ""}>
            ${image ? thumb(image(item)) : ""}
            <span class="title">${escapeHtml(title(item))}</span>
            <span class="meta">${escapeHtml(meta(item))}</span>
          </a>
        </li>`,
    )
    .join("")}</ul>`;
}

function cards(items) {
  return `<ul class="cards">${items
    .map(
      (item) => `
        <li>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
            ${
              item.image
                ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" />`
                : `<div class="thumb-empty"></div>`
            }
            <span class="title">${escapeHtml(item.title)}</span>
            <span class="meta">${escapeHtml(articleMeta(item))}</span>
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
                  `<li><a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a></li>`,
              )
              .join("")}</ul>`
          : ""
      }
    </header>
    <nav>
      <a href="#works">Works</a>
      <a href="#articles">Articles</a>
      <a href="#activities">Activities</a>
    </nav>
    <section id="works">
      <h2>WORKS</h2>
      ${list(
        [...(site.software ?? []).map((item) => ({ ...item, manual: true })), ...content.repos],
        (item) => item.href ?? item.url,
        (item) => item.name,
        (item) => (item.manual ? softwareMeta(item) : repoMeta(item)),
        (item) => item.image ?? content.worksImages?.[item.href ?? item.url],
      )}
    </section>
    <section id="articles">
      <h2>ARTICLES</h2>
      ${content.articles.length ? cards(content.articles) : `<p class="empty">まだありません。</p>`}
    </section>
    ${
      site.activities?.length
        ? `<section id="activities">
      <h2>ACTIVITIES</h2>
      ${list(site.activities, (activity) => activity.href, (activity) => activity.title, activityMeta)}
    </section>`
        : ""
    }
    <footer>Last built ${formatDate(content.generatedAt)}</footer>
  </main>
`;

document.title = site.name;

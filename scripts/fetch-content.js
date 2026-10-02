import { writeFile } from "node:fs/promises";
import { site } from "../src/config.js";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

function headers(extra = {}) {
  return {
    "User-Agent": "portfolio-build",
    Accept: "application/vnd.github+json",
    ...extra,
    ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
  };
}

async function getJson(url) {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(`${url} -> ${res.status}`);
  }
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, { headers: headers({ Accept: "application/rss+xml, application/xml, text/xml" }) });
  if (!res.ok) {
    throw new Error(`${url} -> ${res.status}`);
  }
  return res.text();
}

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function parseFeed(xml) {
  const blocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  return blocks.map((block) => {
    const linkTag = block.match(/<link[^>]*href="([^"]+)"/i);
    const url = linkTag?.[1] || tag(block, "link") || tag(block, "id");
    const published = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated");
    return {
      title: tag(block, "title"),
      url,
      publishedAt: published ? new Date(published).toISOString() : null,
    };
  });
}

async function fetchGithub() {
  const names = site.githubRepos ?? [];
  if (!site.githubUser || !names.length) return [];
  const repos = await Promise.all(
    names.map((name) => getJson(`https://api.github.com/repos/${site.githubUser}/${name}`)),
  );
  return repos.map((repo) => ({
    name: repo.name,
    description: repo.description,
    url: repo.html_url,
    language: repo.language,
    stars: repo.stargazers_count,
    updatedAt: repo.pushed_at,
  }));
}

async function fetchQiita() {
  if (!site.qiitaUser) return [];
  const items = await getJson(
    `https://qiita.com/api/v2/users/${site.qiitaUser}/items?per_page=10`,
  );
  return items.map((item) => ({
    title: item.title,
    url: item.url,
    source: "Qiita",
    publishedAt: item.created_at,
  }));
}

async function fetchZenn() {
  if (!site.zennUser) return [];
  const xml = await getText(`https://zenn.dev/${site.zennUser}/feed`);
  return parseFeed(xml).map((item) => ({
    ...item,
    source: "Zenn",
  }));
}

function hatenaFeedUrls() {
  if (!site.hatenaBlog) return [];
  const origin = site.hatenaBlog.replace(/\/+$/, "");
  return [`${origin}/rss`, `${origin}/feed`];
}

async function fetchHatena() {
  const urls = hatenaFeedUrls();
  if (!urls.length) return [];

  let lastError;
  for (const url of urls) {
    try {
      const xml = await getText(url);
      return parseFeed(xml).map((item) => ({
        ...item,
        source: "Hatena",
      }));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "portfolio-build" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
    for (const meta of tags) {
      if (!/(?:property|name)=["']og:image["']/i.test(meta)) continue;
      const value = meta.match(/content=["']([^"']+)["']/i)?.[1];
      if (value) return decodeXml(value);
    }
  } catch (error) {
    console.warn(`og:image fetch failed: ${url}`, error.message);
  }
  return null;
}

export async function fetchContent() {
  const results = await Promise.allSettled([
    fetchGithub(),
    fetchQiita(),
    fetchZenn(),
    fetchHatena(),
  ]);
  const [repos, qiita, zenn, hatena] = results.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const labels = ["GitHub", "Qiita", "Zenn", "Hatena"];
    console.warn(`${labels[index]} fetch failed:`, result.reason.message);
    return [];
  });

  const latest = [...qiita, ...zenn, ...hatena]
    .filter((item) => item.title && item.url)
    .sort((a, b) => new Date(b.publishedAt ?? 0) - new Date(a.publishedAt ?? 0))
    .slice(0, 5);
  const articles = await Promise.all(
    latest.map(async (item) => ({ ...item, image: await fetchOgImage(item.url) })),
  );

  const content = {
    generatedAt: new Date().toISOString(),
    repos,
    articles,
  };

  await writeFile(new URL("../src/content.json", import.meta.url), `${JSON.stringify(content, null, 2)}\n`);
  return content;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await fetchContent();
}

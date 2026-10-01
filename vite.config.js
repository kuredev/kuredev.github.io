import { defineConfig } from "vite";
import { fetchContent } from "./scripts/fetch-content.js";

function githubPagesBase() {
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (!repo || repo.endsWith(".github.io")) return "/";
  return `/${repo}/`;
}

export default defineConfig(async () => {
  await fetchContent();
  return {
    base: githubPagesBase(),
    root: ".",
  };
});

// build.js —— SSG: data + template -> dist/ 静态站
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { characterPage, gameIndexPage } from "./src/template.js";

const SITE = "https://shouldipull.com";
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));

const games = read("./data/games.json");

rmSync(new URL("./dist/", import.meta.url), { recursive: true, force: true });
mkdirSync(new URL("./dist/", import.meta.url), { recursive: true });

for (const asset of ["index.html", "style.css", "robots.txt"]) {
  if (existsSync(new URL(`./${asset}`, import.meta.url))) {
    cpSync(new URL(`./${asset}`, import.meta.url), new URL(`./dist/${asset}`, import.meta.url));
  }
}
cpSync(new URL("./src/", import.meta.url), new URL("./dist/src/", import.meta.url), { recursive: true });

const urls = ["/"];

for (const gameId of Object.keys(games)) {
  const game = { id: gameId, ...games[gameId] };
  const characters = read(`./data/characters/${gameId}.json`);
  const banners = read(`./data/banners/${gameId}.json`);
  const bannerOf = (id) => banners.find((b) => b.characterId === id) || null;

  for (const char of characters) {
    const dir = new URL(`./dist/${gameId}/should-i-pull/${char.id}/`, import.meta.url);
    mkdirSync(dir, { recursive: true });
    writeFileSync(new URL("index.html", dir), characterPage({ char, game, banner: bannerOf(char.id) }));
    urls.push(`/${gameId}/should-i-pull/${char.id}/`);
  }

  const idxDir = new URL(`./dist/${gameId}/`, import.meta.url);
  mkdirSync(idxDir, { recursive: true });
  writeFileSync(new URL("index.html", idxDir), gameIndexPage({ game, characters }));
  urls.push(`/${gameId}/`);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}
</urlset>
`;
writeFileSync(new URL("./dist/sitemap.xml", import.meta.url), sitemap);

console.log(`Built ${urls.length} pages -> dist/`);

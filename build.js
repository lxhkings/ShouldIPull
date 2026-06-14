// build.js —— SSG: data + template -> dist/ 静态站
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { characterPage, gameIndexPage, homePage } from "./src/template.js";
import { selectActiveBanners } from "./src/banners.js";

const SITE = "https://shouldipull.com";
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));

const games = read("./data/games.json");

rmSync(new URL("./dist/", import.meta.url), { recursive: true, force: true });
mkdirSync(new URL("./dist/", import.meta.url), { recursive: true });

for (const asset of ["style.css", "robots.txt"]) {
  if (existsSync(new URL(`./${asset}`, import.meta.url))) {
    cpSync(new URL(`./${asset}`, import.meta.url), new URL(`./dist/${asset}`, import.meta.url));
  }
}
cpSync(new URL("./src/", import.meta.url), new URL("./dist/src/", import.meta.url), { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const gameList = Object.keys(games).map((id) => ({ id, name: games[id].name }));
const urls = ["/"];
let activeBanners = [];

for (const gameId of Object.keys(games)) {
  const game = { id: gameId, ...games[gameId] };
  const characters = read(`./data/characters/${gameId}.json`);
  const banners = read(`./data/banners/${gameId}.json`);
  const bannerOf = (id) => banners.find((b) => b.characterId === id) || null;

  activeBanners = activeBanners.concat(selectActiveBanners({ banners, characters, game, today }));

  for (const char of characters) {
    const dir = new URL(`./dist/${gameId}/should-i-pull/${char.id}/`, import.meta.url);
    mkdirSync(dir, { recursive: true });
    writeFileSync(new URL("index.html", dir), characterPage({ char, game, banner: bannerOf(char.id), games: gameList }));
    urls.push(`/${gameId}/should-i-pull/${char.id}/`);
  }

  const idxDir = new URL(`./dist/${gameId}/`, import.meta.url);
  mkdirSync(idxDir, { recursive: true });
  writeFileSync(new URL("index.html", idxDir), gameIndexPage({ game, characters, games: gameList }));
  urls.push(`/${gameId}/`);
}

const homeGame = { id: "genshin", ...games.genshin };
writeFileSync(
  new URL("./dist/index.html", import.meta.url),
  homePage({ game: homeGame, activeBanners, games: gameList })
);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}
</urlset>
`;
writeFileSync(new URL("./dist/sitemap.xml", import.meta.url), sitemap);

console.log(`Built ${urls.length} pages -> dist/`);

// src/banners.js —— 纯函数: 选出在某日期生效的卡池, 解析角色与游戏
export function selectActiveBanners({ banners, characters, game, today }) {
  const byId = new Map(characters.map((c) => [c.id, c]));
  return banners
    .filter((b) => b.start <= today && today <= b.end)
    .map((b) => ({ char: byId.get(b.characterId), game, banner: b }))
    .filter((x) => x.char);
}

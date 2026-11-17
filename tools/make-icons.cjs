// アプリのアイコン（icon-192.png・icon-512.png）を作る。空色の地に、お日さまと雨雲。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#e6eff6"/>
      <circle cx="36" cy="34" r="16" fill="#f2b632" stroke="#1d2a3f" stroke-width="2.4"/>
      <path d="M30 70 a16 16 0 0 1 4 -31 a20 20 0 0 1 38 4 a13 13 0 0 1 0 27 Z" fill="#fbfdff" stroke="#1d2a3f" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M40 78 l-4 10 M54 78 l-4 10 M68 78 l-4 10" stroke="#1f4f7a" stroke-width="4" stroke-linecap="round"/></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();

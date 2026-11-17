// 予報ことばよみの問題を作る（ブラウザと node の両方で使う）。
// 中身は、下の SRC の気象庁の資料で確かめたことだけ（2026-11-17 に読んだ。要点は共有フォルダ games/yohou-research.md）。
// 町の名前はすべて架空（実際の予報は出さない）。
// 問題はどれも「予報のことばを読んで、意味や答えを4つから選ぶ」形（type: "act"）。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ tag なら、どの端末でも同じ問題になる。
// KINDS・TOWNS・言い回しの並びは最後に足すだけにする（並べ替え・削除をすると過去の日の問題が変わる）。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];

  // 出典（画面の「なぜ」に出す）
  const SRC = {
    toki: ["気象庁「予報用語 時に関する用語」", "https://www.jma.go.jp/jma/kishou/know/yougo_hp/toki.html"],
    kousui: ["気象庁「予報用語 降水」", "https://www.jma.go.jp/jma/kishou/know/yougo_hp/kousui.html"],
    kaze: ["気象庁「予報用語 風」", "https://www.jma.go.jp/jma/kishou/know/yougo_hp/kaze.html"],
    kion: ["気象庁「予報用語 気温」", "https://www.jma.go.jp/jma/kishou/know/yougo_hp/kion.html"],
    tenki: ["気象庁「予報用語 天気」", "https://www.jma.go.jp/jma/kishou/know/yougo_hp/tenki.html"],
    kaku: ["気象庁「よくある質問（降水確率）」", "https://www.jma.go.jp/jma/kishou/know/faq/faq4.html"],
    amehyo: ["気象庁「雨の強さと降り方」", "https://www.jma.go.jp/jma/kishou/know/yougo_hp/amehyo.html"],
  };

  // 架空の町
  const TOWNS = ["みなと町", "さくら市", "かわべ村", "あおば町", "ひなた市", "もりの村"];
  // 時間のことば（気象庁「時に関する用語」のとおり）
  const TOKI = { "未明": "0時〜3時ごろ", "明け方": "3時〜6時ごろ", "朝": "6時〜9時ごろ", "昼前": "9時〜12時ごろ", "昼過ぎ": "12時〜15時ごろ", "夕方": "15時〜18時ごろ", "夜のはじめ頃": "18時〜21時ごろ", "夜遅く": "21時〜24時ごろ" };
  // 1時間の雨の量（気象庁「降水」）
  const AME = { "弱い雨": "1時間に3mm未満", "やや強い雨": "1時間に10mm以上20mm未満", "強い雨": "1時間に20mm以上30mm未満", "激しい雨": "1時間に30mm以上50mm未満", "非常に激しい雨": "1時間に50mm以上80mm未満", "猛烈な雨": "1時間に80mm以上" };
  // 風の速さ（気象庁「風」。風速は10分間の平均）
  const KAZE = { "やや強い風": "10m/s以上15m/s未満", "強い風": "15m/s以上20m/s未満", "非常に強い風": "20m/s以上30m/s未満", "猛烈な風": "およそ30m/s以上" };
  // 気温のことば（気象庁「気温」）
  const KION = { "冬日": "1日の最低気温が0度未満の日", "真冬日": "1日の最高気温が0度未満の日", "夏日": "1日の最高気温が25度以上の日", "真夏日": "1日の最高気温が30度以上の日", "猛暑日": "1日の最高気温が35度以上の日", "熱帯夜": "夜の最低気温が25度以上のこと" };
  // 続き方・変わり方（気象庁「時に関する用語」）。最後の2つは、まちがいの選び肢だけに使う
  const KAWARI = { "一時": "続けて起こり、予報期間の4分の1より短い", "時々": "とぎれとぎれに起こり、合計が予報期間の半分より短い", "のち": "予報期間の前と後で、天気が変わる", "ずっと": "予報期間のあいだ、とぎれずに続く", "長く": "予報期間の半分より長く続く" };
  // 雨の降り方（気象庁「雨の強さと降り方」の表の「人の受けるイメージ」の列だけ。ほかの列は2つの段にまたがるセルがあり、答えが1つにならないので使わない。yohou-kotoba #1 の CodeRabbit）
  const AMEHYO = {
    "やや強い雨": ["ザーザーと降る"],
    "強い雨": ["どしゃ降り"],
    "激しい雨": ["バケツをひっくり返したように降る"],
    "非常に激しい雨": ["滝のように降る（ゴーゴーと降り続く）"],
    "猛烈な雨": ["息苦しくなるような圧迫感がある", "恐怖を感じる"],
  };
  // そのほかの雨・雪のことば（気象庁「降水」）
  const AMEGO = { "大雨": "災害が起こるおそれのある雨", "雷雨": "雷をともなう雨", "小雨": "数時間続いても雨の量が1mmに達しない雨", "強い雪": "1時間におよそ3cm以上積もる雪", "弱い雪": "1時間におよそ1cmに達しない雪", "小雪": "数時間降り続いても降水量が1mmに達しない雪" };
  // 少し長い時間のことば（気象庁「時に関する用語」）
  const NICHU = { "日中": "9時〜18時ごろ", "昼頃": "11時〜13時ごろ", "朝晩": "0時〜9時ごろと18時〜24時ごろ" };
  const NICHU_BAD = ["6時〜18時ごろ", "12時〜15時ごろ", "6時〜9時ごろと18時〜21時ごろ", "12時ちょうど", "10時〜14時ごろ", "0時〜24時"];

  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
  const pickN = (R, arr, n) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const shuffle = (R, arr) => pickN(R, arr, arr.length);

  // 場面の問題：場面 sit から1つ、正しい答え good から1つ、まちがい bad から3つ
  function act(sit, good, bad) {
    return (R) => {
      const m = pick(R, TOWNS), si = ri(R, 0, sit.length - 1), gi = ri(R, 0, good.length - 1);
      return { q: sit[si](m), opts: shuffle(R, [good[gi](m), ...pickN(R, bad, 3).map((f) => f(m))]), ans: good[gi](m), v: `${TOWNS.indexOf(m)}:${si}:${gi}` };
    };
  }
  // 表から1つ選んで聞く問題：表 tbl のことば w を1つ選び、q(w, 町) を出す。dir が "def" なら答えは意味、"word" なら答えはことば
  function byWord(tbl, qs, dir, extra = []) {
    const ws = Object.keys(tbl);
    return (R) => {
      const m = pick(R, TOWNS), w = pick(R, ws), qi = ri(R, 0, qs.length - 1);
      const a = dir === "def" ? tbl[w] : w;
      const pool = (dir === "def" ? ws.map((x) => tbl[x]) : ws).concat(extra).filter((x) => x !== a);
      return { q: qs[qi](w, m, tbl[w]), opts: shuffle(R, [a, ...pickN(R, pool, 3)]), ans: a, v: `${TOWNS.indexOf(m)}:${ws.indexOf(w)}:${qi}` };
    };
  }
  // 続き方・変わり方：word（一時・時々・のち）の意味を聞く
  const PAIRS = [["晴れ", "雨"], ["曇り", "雨"], ["曇り", "雪"], ["晴れ", "曇り"]];
  function kawari(word, qs) {
    const bads = Object.keys(KAWARI).filter((x) => x !== word).map((x) => KAWARI[x]);
    return (R) => {
      const m = pick(R, TOWNS), pi = ri(R, 0, PAIRS.length - 1), [a, b] = PAIRS[pi], qi = ri(R, 0, qs.length - 1);
      return { q: qs[qi](`${a}${word}${b}`, m, b), opts: shuffle(R, [KAWARI[word], ...pickN(R, bads, 3)]), ans: KAWARI[word], v: `${TOWNS.indexOf(m)}:${pi}:${qi}` };
    };
  }

  // 種類：id・難しさ・帳に出す名前・見るところ（ヒント1）・なぜ（正解のあと）・出典・作り方
  const KINDS = [
    // ---- やさしい ----
    { id: "toki", lv: 0, name: "時間のことば", src: ["toki"],
      look: "1日を3時間ずつに分けた言い方です。",
      why: "未明0〜3時・明け方3〜6時・朝6〜9時・昼前9〜12時・昼過ぎ12〜15時・夕方15〜18時・夜のはじめ頃18〜21時・夜遅く21〜24時です。",
      make: byWord(TOKI, [(w, m) => `${m}の予報「${w}から雨」。${w}とは何時ごろ？`, (w) => `天気予報で「${w}」と言ったら、何時ごろのこと？`], "def") },
    { id: "tokir", lv: 0, name: "時間を予報のことばに", src: ["toki"],
      look: "「昼」の前か後か、「夜」のはじめか遅くかを考えます。",
      why: "未明0〜3時・明け方3〜6時・朝6〜9時・昼前9〜12時・昼過ぎ12〜15時・夕方15〜18時・夜のはじめ頃18〜21時・夜遅く21〜24時です。",
      make: byWord(TOKI, [(w, m, d) => `${m}で、${d}に雨の予報。予報では何と言う？`, (w, m, d) => `天気予報で${d}のことは、何と言う？`], "word") },
    { id: "kion", lv: 0, name: "暑い日・寒い日の呼び名", src: ["kion"],
      look: "冬日と熱帯夜は最低気温、ほかは最高気温で決まります。",
      why: "夏日25度以上・真夏日30度以上・猛暑日35度以上は最高気温。真冬日は最高気温が0度未満、冬日は最低気温が0度未満の日です。",
      make: byWord(KION, [(w, m) => `${m}の予報「あすは${w}になりそう」。${w}とは？`, (w) => `ニュースの「${w}」とは、どんな日？`], "def") },
    { id: "ame", lv: 0, name: "雨の強さ", src: ["kousui"],
      look: "強い順に、猛烈・非常に激しい・激しい・強い・やや強い。",
      why: "1時間の雨の量で、やや強い10mm〜・強い20mm〜・激しい30mm〜・非常に激しい50mm〜・猛烈な80mm以上と呼び分けます。",
      make: byWord(AME, [(w, m) => `${m}の予報「${w}が降るでしょう」。どのくらいの雨？`, (w) => `予報の「${w}」は、1時間にどのくらいの雨？`], "def") },
    // ---- ふつう ----
    { id: "ichiji", lv: 1, name: "「一時」", src: ["toki"],
      look: "「一時」は、とぎれずに続く短い時間です。",
      why: "「一時」は、続けて起こり、その時間が予報期間の4分の1より短いときに使います。とぎれとぎれなら「時々」です。",
      make: kawari("一時", [(t, m) => `${m}の予報「${t}」。「一時」の意味は？`, (t, m, b) => `予報「${t}」。${b}はどんなふうに降る（なる）？`]) },
    { id: "tokidoki", lv: 1, name: "「時々」", src: ["toki"],
      look: "「時々」は、ふったりやんだりです。",
      why: "「時々」は、とぎれとぎれに起こり、合わせた時間が予報期間の半分より短いときに使います。",
      make: kawari("時々", [(t, m) => `${m}の予報「${t}」。「時々」の意味は？`, (t, m, b) => `予報「${t}」。${b}はどんなふうに降る（なる）？`]) },
    { id: "nochi", lv: 1, name: "「のち」", src: ["toki"],
      look: "「AのちB」は、前と後を比べた言い方です。",
      why: "「のち」は、予報期間の前と後で天気がちがうとき、その変わり方を示すのに使います。",
      make: kawari("のち", [(t, m) => `${m}の予報「${t}」。「のち」の意味は？`, (t) => `予報で「${t}」。これはどういうこと？`]) },
    { id: "kaze", lv: 1, name: "風の強さ", src: ["kaze"],
      look: "強い順に、猛烈・非常に強い・強い・やや強い。",
      why: "風の速さ（10分間の平均）で、やや強い10m/s〜・強い15m/s〜・非常に強い20m/s〜・猛烈なおよそ30m/s以上と呼び分けます。",
      make: byWord(KAZE, [(w, m) => `${m}の予報「${w}が吹くでしょう」。風の速さは？`, (w) => `予報の「${w}」は、秒速どのくらいの風？`], "def") },
    { id: "kaku", lv: 1, name: "降水確率", src: ["kaku"],
      look: "降水確率は、雨の量や時間の長さの話ではありません。",
      why: "降水確率は、その時間帯に1mm以上の雨や雪が降る確率です。70%なら、同じ予報が100回出たとき、およそ70回は降ります。",
      make: (R) => {
        const m = pick(R, TOWNS), p = ri(R, 1, 9) * 10, qi = ri(R, 0, 1);
        const q = [`${m}の降水確率は${p}%。この意味は？`, `予報「${m}、午後の降水確率${p}%」。正しい読み方は？`][qi];
        const a = `同じ予報が100回出たら、およそ${p}回は1mm以上降る`;
        const bad = [`${m}の${p}%の場所で雨が降る`, `予報の時間の${p}%のあいだ、雨が降る`, `雨の量が、ふだんの${p}%くらい`, `${p}%の強さの雨が降る`, `${p}mmの雨が降る`];
        return { q, opts: shuffle(R, [a, ...pickN(R, bad, 3)]), ans: a, v: `${TOWNS.indexOf(m)}:${p}:${qi}` };
      } },
    // ---- むずかしい ----
    { id: "amehyo", lv: 2, name: "雨の降り方からことばへ", src: ["amehyo", "kousui"],
      look: "「どしゃ降り」より強い降り方を、強い順に考えます。",
      why: "気象庁の表では、やや強い雨はザーザー、強い雨はどしゃ降り、激しい雨はバケツをひっくり返したよう、非常に激しい雨は滝のように降ります。",
      make: (R) => {
        const ws = Object.keys(AMEHYO), m = pick(R, TOWNS), w = pick(R, ws), fi = ri(R, 0, AMEHYO[w].length - 1), qi = ri(R, 0, 1), f = AMEHYO[w][fi];
        const q = [`${m}で「${f}」ような雨。予報ではどう言う？`, `「${f}」くらいの雨は、予報のことばで？`][qi];
        const pool = ws.concat(["弱い雨"]).filter((x) => x !== w);
        return { q, opts: shuffle(R, [w, ...pickN(R, pool, 3)]), ans: w, v: `${TOWNS.indexOf(m)}:${ws.indexOf(w)}:${fi}:${qi}` };
      } },
    { id: "kumo", lv: 2, name: "雲の量と晴れ・曇り", src: ["tenki"],
      look: "空の8割が雲でも、天気は「晴れ」です。",
      why: "空全体を10として、雲が1以下は快晴・2〜8は晴れ。9以上で、低い・中くらいの雲が多いと曇り、高い雲が多いと薄曇りです。",
      make: (R) => {
        const m = pick(R, TOWNS), n = ri(R, 0, 10), up = n >= 9 ? ri(R, 0, 1) : 0, qi = ri(R, 0, 1);
        const a = n <= 1 ? "快晴" : n <= 8 ? "晴れ" : up ? "薄曇り" : "曇り";
        const more = n >= 9 ? `、多いのは${up ? "高い所の雲" : "低い・中くらいの雲"}` : "";
        const q = [`${m}の空。全体を10として雲は${n}${more}。雨なし。天気は？`, `空全体を10として、雲が${n}${more}。雨なし。天気の名前は？`][qi];
        return { q, opts: shuffle(R, ["快晴", "晴れ", "薄曇り", "曇り"]), ans: a, v: `${TOWNS.indexOf(m)}:${n}:${up}:${qi}` };
      } },
    { id: "kaku2", lv: 2, name: "確率と雨の強さ", src: ["kaku"],
      look: "降水確率がわかるのは「降るか、降らないか」だけです。",
      why: "降水確率は、降るか降らないかだけを示します。降り方や雨の量の多い少ないは示しません。",
      make: (R) => {
        const m = pick(R, TOWNS), a = ri(R, 1, 4) * 10, b = a + ri(R, 3, 5) * 10, qi = ri(R, 0, 1), gi = ri(R, 0, 1);
        const q = [`${m}の降水確率、午前${a}%・午後${b}%。正しいのは？`, `友だち「午後は${b}%だから、午前の${a}%より強い雨だね」。正しいのは？`][qi];
        const good = ["雨の量や強さは、確率からはわからない", "確率が高くても、強い雨とはかぎらない"][gi];
        const bad = ["午後のほうが、強い雨が降る", "午後のほうが、雨の量が多い", `午後は、${b}%の時間だけ雨が降る`, "確率が高いほど、長い時間降る"];
        return { q, opts: shuffle(R, [good, ...pickN(R, bad, 3)]), ans: good, v: `${TOWNS.indexOf(m)}:${a}:${b}:${qi}:${gi}` };
      } },
    { id: "nichu", lv: 2, name: "日中・昼頃・朝晩", src: ["toki"],
      look: "「昼頃」は正午をはさんだ、短い時間です。",
      why: "日中は9時〜18時ごろ、昼頃は正午の前後1時間ずつ（11時〜13時ごろ）、朝晩は0時〜9時ごろと18時〜24時ごろです。",
      make: byWord(NICHU, [(w, m) => `${m}の予報「${w}は雨」。${w}とは何時ごろ？`, (w) => `天気予報の「${w}」は、何時ごろのこと？`], "def", NICHU_BAD) },
    { id: "kionr", lv: 2, name: "気温から呼び名へ", src: ["kion"],
      look: "夏日・真夏日・猛暑日・真冬日は最高気温、冬日は最低気温。",
      why: "夏日25度以上・真夏日30度以上・猛暑日35度以上・真冬日0度未満は最高気温、冬日0度未満は最低気温で決まります。",
      make: (R) => {
        const CASES = [[-6, -1, -12, -7], [1, 8, -6, -1], [12, 22, 2, 10], [25, 29, 14, 22], [30, 34, 18, 24], [35, 38, 20, 24]];
        const m = pick(R, TOWNS), ci = ri(R, 0, CASES.length - 1), [h0, h1, l0, l1] = CASES[ci], hi = ri(R, h0, h1), lo = ri(R, l0, l1), qi = ri(R, 0, 1);
        // 当てはまる呼び名（下の段の呼び名は、上の段があるときは選び肢に出さない）
        const t = { "真冬日": hi < 0, "冬日": lo < 0, "夏日": hi >= 25, "真夏日": hi >= 30, "猛暑日": hi >= 35 };
        const a = t["真冬日"] ? "真冬日" : t["冬日"] ? "冬日" : t["猛暑日"] ? "猛暑日" : t["真夏日"] ? "真夏日" : t["夏日"] ? "夏日" : "どれにもあたらない";
        const pool = ["冬日", "真冬日", "夏日", "真夏日", "猛暑日", "どれにもあたらない"].filter((x) => x !== a && !t[x]);
        const q = [`${m}のきょう：最高${hi}度・最低${lo}度。あてはまる呼び名は？`, `最高気温${hi}度、最低気温${lo}度の日。呼び名は？`][qi];
        return { q, opts: shuffle(R, [a, ...pickN(R, pool, 3)]), ans: a, v: `${TOWNS.indexOf(m)}:${hi}:${lo}:${qi}` };
      } },
    { id: "amego", lv: 2, name: "大雨・雷雨・小雨・雪", src: ["kousui"],
      look: "「小」がつくのは、量がとても少ないときです。",
      why: "大雨は災害が起こるおそれのある雨。小雨・小雪は数時間でも1mmに達しない量。強い雪は1時間におよそ3cm以上です。",
      make: byWord(AMEGO, [(w, m) => `${m}の予報「${w}」。どんな降り方？`, (w) => `予報のことば「${w}」の意味は？`], "def") },
  ];
  const BY = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  // 2段目「このことばが決めているのは？」の3つの分け方
  // 種類を足したら GRP にも足す（QA が全部の種類にあるかを見る）
  const GROUPS = {
    itsu: { name: "いつ", sub: "時間帯を決めることば" },
    dore: { name: "どのくらい", sub: "雨・風の強さ、気温、雲の量" },
    donna: { name: "どんなふうに", sub: "続き方・変わり方・確率" },
  };
  const GRP = { toki: "itsu", tokir: "itsu", nichu: "itsu", kion: "dore", ame: "dore", kaze: "dore", amehyo: "dore", kumo: "dore", kionr: "dore", amego: "dore", ichiji: "donna", tokidoki: "donna", nochi: "donna", kaku: "donna", kaku2: "donna" };
  const kindsOf = (lv) => KINDS.filter((k) => k.lv === lv).map((k) => k.id);

  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // 1問を作る。tag は「種類|種」（例 "toki|2026-11-17:d0"）。同じ tag ならいつも同じ問題
  function make(tag) {
    const [kind] = String(tag).split("|"), k = BY[kind];
    if (!k || !Object.prototype.hasOwnProperty.call(BY, kind)) return null;
    const p = k.make(rng(seedOf(tag)));
    const m = TOWNS.find((x) => p.q.includes(x)) || "";
    return { tag, kind, lv: k.lv, name: k.name, look: k.look, why: k.why, src: k.src.map((s) => SRC[s]), type: "act", media: "天気予報", prod: m, ...p, grp: GRP[kind] || null };
  }
  // 同じ問題かを見分ける鍵（種類・町・場面・選び肢の組）
  const keyOf = (P) => `${P.kind}:${P.v}:${P.opts.slice().sort().join("/")}`;

  // 今日の5問（やさしい2・ふつう2・むずかしい1）。種類は重ねない
  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), e = pickN(R, kindsOf(0), 2), n = pickN(R, kindsOf(1), 2), h = pickN(R, kindsOf(2), 1);
    return [...e, ...n, ...h].map((id, i) => `${id}|${date}:d${i}`);
  }
  // 上級の3問（むずかしいだけ・今日の5問のむずかしいとは別の種類）
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), h = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return h.map((id, i) => `${id}|${date}:h${i}`);
  }

  const YOHOU = { KINDS, BY, GROUPS, GRP, LV, SRC, TOWNS, TOKI, AME, KAZE, KION, KAWARI, AMEHYO, AMEGO, NICHU, kindsOf, seedOf, rng, make, keyOf, dailyTags, hardTags, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = YOHOU; else root.YOHOU = YOHOU;
})(typeof self !== "undefined" ? self : this);

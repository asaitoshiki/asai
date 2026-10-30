// 恋リア登場人物データベース：data.json を読み込み、ハッシュルーティングで各ページを描画する

const app = document.getElementById("app");

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// 参照整合性が崩れていたら即座に気付けるよう、見つからない ID は例外にする
const lookup = (map, id) => {
  const v = map.get(id);
  if (v === undefined) throw new Error(`未定義の ID: ${id}`);
  return v;
};

const buildIndex = (data) => {
  const seasons = new Map();
  for (const show of data.shows) {
    for (const season of show.seasons) seasons.set(season.id, { ...season, show });
  }
  const people = new Map(data.people.map((p) => [p.id, p]));
  for (const r of data.relations) {
    lookup(people, r.from);
    lookup(people, r.to);
    lookup(seasons, r.season);
  }
  for (const p of data.people) p.appearances.forEach((a) => lookup(seasons, a.season));
  return { ...data, seasons, peopleById: people };
};

const seasonName = (season) => `${season.show.title} ${season.label}`;
const seasonLink = (season) => `<a href="#/season/${season.id}">${escapeHtml(seasonName(season))}</a>`;
const personLink = (p) => `<a href="#/person/${p.id}">${escapeHtml(p.name)}</a>`;
const sourceList = (urls) =>
  `<ul class="plain sources">${urls.map((u) => `<li><a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(u)}</a></li>`).join("")}</ul>`;

const personCard = (db, p) => {
  const shows = p.appearances.map((a) => seasonName(lookup(db.seasons, a.season))).join(" / ");
  return `<a class="card" href="#/person/${p.id}">
    <div class="name">${escapeHtml(p.name)}</div>
    <div class="meta">${escapeHtml(p.gender)}・${escapeHtml(shows)}</div>
  </a>`;
};

const renderPeople = (db) => {
  const showOptions = db.shows.map((s) => `<option value="${s.id}">${escapeHtml(s.title)}</option>`).join("");
  app.innerHTML = `
    <div class="filters">
      <input id="q" type="search" placeholder="名前で検索">
      <select id="show"><option value="">すべての番組</option>${showOptions}</select>
      <select id="gender"><option value="">性別すべて</option><option>男性</option><option>女性</option></select>
    </div>
    <div class="count" id="count"></div>
    <div class="cards" id="list"></div>`;

  const q = document.getElementById("q");
  const show = document.getElementById("show");
  const gender = document.getElementById("gender");

  // 空文字の条件は「絞り込まない」として扱うことで分岐を増やさない
  const update = () => {
    const keyword = q.value.trim();
    const hits = db.people.filter(
      (p) =>
        `${p.name}${p.kana ?? ""}`.includes(keyword) &&
        p.gender.includes(gender.value) &&
        p.appearances.some((a) => lookup(db.seasons, a.season).show.id.includes(show.value))
    );
    document.getElementById("count").textContent = `${hits.length} 人`;
    document.getElementById("list").innerHTML = hits.map((p) => personCard(db, p)).join("");
  };
  [q, show, gender].forEach((el) => el.addEventListener("input", update));
  update();
};

const relationRows = (db, relations, selfId) =>
  relations
    .map((r) => {
      const other = lookup(db.peopleById, r.from === selfId ? r.to : r.from);
      return `<tr>
        <td>${personLink(other)}</td>
        <td><span class="tag">${escapeHtml(r.type)}</span>${escapeHtml(r.note ?? "")}</td>
        <td>${seasonLink(lookup(db.seasons, r.season))}</td>
      </tr>`;
    })
    .join("");

const renderPerson = (db, id) => {
  const p = lookup(db.peopleById, id);
  const relations = db.relations.filter((r) => r.from === id || r.to === id);
  const profile = Object.entries({ 性別: p.gender, ...p.profile })
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join("");
  const appearances = p.appearances
    .map((a) => `<li>${seasonLink(lookup(db.seasons, a.season))}：${escapeHtml(a.role)}</li>`)
    .join("");
  const relationSources = relations.map((r) => r.source);

  app.innerHTML = `
    <h1>${escapeHtml(p.name)} <span class="kana">${escapeHtml(p.kana ?? "")}</span></h1>
    <h2>プロフィール</h2>
    <table>${profile}</table>
    <h2>出演</h2>
    <ul class="plain">${appearances}</ul>
    <h2>人物関係</h2>
    <table>${relationRows(db, relations, id) || "<tr><td>登録なし</td></tr>"}</table>
    <h2>出典</h2>
    ${sourceList([...new Set([...p.sources, ...relationSources])])}`;
};

const renderShows = (db) => {
  app.innerHTML = db.shows
    .map(
      (s) => `
      <h2>${escapeHtml(s.title)} <span class="kana">${escapeHtml(s.platform)}</span></h2>
      <ul class="plain">${s.seasons
        .map((se) => `<li><a href="#/season/${se.id}">${escapeHtml(se.label)}</a>（${se.year}年）</li>`)
        .join("")}</ul>`
    )
    .join("");
};

const renderSeason = (db, id) => {
  const season = lookup(db.seasons, id);
  const members = db.people.filter((p) => p.appearances.some((a) => a.season === id));
  const rows = members
    .map((p) => `<tr><td>${personLink(p)}</td><td>${escapeHtml(p.appearances.find((a) => a.season === id).role)}</td></tr>`)
    .join("");
  const relations = db.relations
    .filter((r) => r.season === id)
    .map(
      (r) =>
        `<li>${personLink(lookup(db.peopleById, r.from))} → ${personLink(lookup(db.peopleById, r.to))}
         <span class="tag">${escapeHtml(r.type)}</span>${escapeHtml(r.note ?? "")}</li>`
    )
    .join("");

  app.innerHTML = `
    <h1>${escapeHtml(seasonName(season))}</h1>
    <p class="kana">${escapeHtml(season.show.platform)}・${season.year}年</p>
    <h2>出演者</h2>
    <table>${rows || "<tr><td>登録なし</td></tr>"}</table>
    <h2>人物関係</h2>
    <ul class="plain">${relations || "<li>登録なし</li>"}</ul>`;
};

const routes = [
  [/^#\/person\/(.+)$/, renderPerson],
  [/^#\/season\/(.+)$/, renderSeason],
  [/^#\/shows$/, renderShows],
  [/^/, renderPeople],
];

const route = (db) => {
  const hash = decodeURIComponent(location.hash);
  const [pattern, render] = routes.find(([re]) => re.test(hash));
  render(db, hash.match(pattern)[1]);
  window.scrollTo(0, 0);
};

fetch("data.json")
  .then((res) => res.json())
  .then((data) => {
    const db = buildIndex(data);
    window.addEventListener("hashchange", () => route(db));
    route(db);
  });

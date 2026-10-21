const STORAGE_KEY = "manner-card-state-v1";

const DEFAULT_STATE = {
  shop: "",
  langs: LANGS.map((l) => l.code),
  selected: ["no-smoking", "no-photo", "trash-home"],
  custom: [],
  layout: "list",
};

// 保存に失敗しても初期状態で動くようにする（プライベートブラウズ等）
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...DEFAULT_STATE, ...saved };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 保存できなくても画面上の操作は続けられる
  }
}

let state = loadState();

const $ = (sel) => document.querySelector(sel);

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, attrs);
  node.append(...children);
  return node;
}

function allRules() {
  return [...RULES, ...state.custom];
}

// 選択順ではなく一覧の並び順でカードに載せる
function selectedRules() {
  return allRules().filter((r) => state.selected.includes(r.id));
}

function activeLangs() {
  return LANGS.filter((l) => state.langs.includes(l.code));
}

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function update(patch) {
  state = { ...state, ...patch };
  saveState();
  render();
}

// ---- 操作パネル ----

function renderLangList() {
  const chips = LANGS.map((l) =>
    el("label", { className: "chip", lang: l.htmlLang }, [
      el("input", {
        type: "checkbox",
        checked: state.langs.includes(l.code),
        onchange: () => update({ langs: toggle(state.langs, l.code) }),
      }),
      l.label,
    ])
  );
  $("#lang-list").replaceChildren(...chips);
}

function ruleOption(rule, removable) {
  const removeBtn = el("button", {
    type: "button",
    className: "remove",
    title: "削除",
    textContent: "✕",
    onclick: (e) => {
      e.preventDefault();
      update({
        custom: state.custom.filter((c) => c.id !== rule.id),
        selected: state.selected.filter((id) => id !== rule.id),
      });
    },
  });
  return el("label", { className: "rule-option" }, [
    el("input", {
      type: "checkbox",
      checked: state.selected.includes(rule.id),
      onchange: () => update({ selected: toggle(state.selected, rule.id) }),
    }),
    el("span", { className: "icon", textContent: rule.icon }),
    el("span", { textContent: rule.ja }),
    ...(removable ? [removeBtn] : []),
  ]);
}

function renderRuleList() {
  const groups = CATEGORIES.map((c) =>
    el("div", {}, [
      el("h3", { textContent: c.label }),
      ...RULES.filter((r) => r.cat === c.id).map((r) => ruleOption(r, false)),
    ])
  );
  const customGroup = el("div", {}, [
    el("h3", { textContent: "オリジナル" }),
    ...state.custom.map((r) => ruleOption(r, true)),
  ]);
  $("#rule-list").replaceChildren(...groups, ...(state.custom.length ? [customGroup] : []));
}

function renderControls() {
  $("#shop-name").value = state.shop;
  document.querySelector(`input[name="layout"][value="${state.layout}"]`).checked = true;
  renderLangList();
  renderRuleList();
}

// ---- カード（プレビュー兼印刷面） ----

// ルールの訳文のうち、選択中の言語で入力済みのものだけを並べる
function translations(rule, className) {
  return activeLangs()
    .filter((l) => rule[l.code])
    .map((l) => el("div", { className, lang: l.htmlLang, textContent: rule[l.code] }));
}

function headingSpans(key) {
  return activeLangs().map((l) => el("span", { lang: l.htmlLang, textContent: HEADINGS[key][l.code] }));
}

function sheetHeader() {
  return el("div", { className: "sheet-header" }, [
    ...(state.shop ? [el("div", { className: "sheet-shop", textContent: state.shop })] : []),
    el("div", { className: "sheet-title-ja", textContent: HEADINGS.title.ja }),
    el("div", { className: "sheet-title-sub" }, headingSpans("title")),
  ]);
}

function sheetFooter() {
  return el("div", { className: "sheet-footer" }, [
    el("span", { lang: "ja", textContent: HEADINGS.thanks.ja }),
    ...headingSpans("thanks"),
  ]);
}

function listSheet(rules) {
  const rows = rules.map((r) =>
    el("div", { className: "rule-row" }, [
      el("div", { className: "icon", textContent: r.icon }),
      el("div", {}, [el("div", { className: "ja", textContent: r.ja }), ...translations(r, "tr")]),
    ])
  );
  const empty = el("p", { className: "empty", textContent: "左のリストからルールを選んでください" });
  return el("article", { className: "sheet" }, [
    sheetHeader(),
    el("div", { className: "sheet-rules" }, rows.length ? rows : [empty]),
    sheetFooter(),
  ]);
}

function singleSheet(rule) {
  return el("article", { className: "sheet single" }, [
    ...(state.shop ? [el("div", { className: "sheet-shop", textContent: state.shop })] : []),
    el("div", { className: "sheet-rules" }, [
      el("div", { className: "icon", textContent: rule.icon }),
      el("div", { className: "ja", textContent: rule.ja }),
      ...translations(rule, "tr"),
    ]),
    sheetFooter(),
  ]);
}

// A4 1枚に収まる件数ごとにページを分ける
const RULES_PER_SHEET = 5;

function chunk(list, size) {
  return Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));
}

const LAYOUTS = {
  list: (rules) => (rules.length ? chunk(rules, RULES_PER_SHEET).map(listSheet) : [listSheet(rules)]),
  // 1件も選ばれていないときは案内入りの一覧を出す
  single: (rules) => (rules.length ? rules.map(singleSheet) : [listSheet(rules)]),
};

function renderPreview() {
  $("#preview").replaceChildren(...LAYOUTS[state.layout](selectedRules()));
}

function render() {
  renderControls();
  renderPreview();
}

// ---- イベント ----

$("#shop-name").addEventListener("input", (e) => {
  state = { ...state, shop: e.target.value };
  saveState();
  renderPreview();
});

document.querySelectorAll('input[name="layout"]').forEach((radio) =>
  radio.addEventListener("change", (e) => update({ layout: e.target.value }))
);

$("#custom-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const rule = { ...data, id: `custom-${Date.now()}`, cat: "custom", icon: data.icon || "📌" };
  update({ custom: [...state.custom, rule], selected: [...state.selected, rule.id] });
  e.target.reset();
});

$("#print-btn").addEventListener("click", () => window.print());

$("#reset-btn").addEventListener("click", () => update({ ...DEFAULT_STATE, custom: state.custom }));

render();

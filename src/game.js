const SAVE_KEY = "cookie-atelier-deluxe-save-v1";

const buildings = [
  {
    id: "cursor",
    name: "符文指针",
    desc: "会自己轻敲饼干的银质指针。",
    icon: "icon-cursor.png",
    baseCost: 15,
    cps: 0.12,
  },
  {
    id: "witch",
    name: "糖霜女巫",
    desc: "用古老咒语给面团注入甜味。",
    icon: "icon-witch.png",
    baseCost: 120,
    cps: 1.1,
  },
  {
    id: "oven",
    name: "余烬烤炉",
    desc: "永不熄灭的工坊核心火源。",
    icon: "icon-oven.png",
    baseCost: 760,
    cps: 7,
  },
  {
    id: "alchemy",
    name: "糖浆炼金釜",
    desc: "把星尘和焦糖熬成稳定产能。",
    icon: "icon-alchemy.png",
    baseCost: 4200,
    cps: 34,
  },
  {
    id: "portal",
    name: "午夜传送门",
    desc: "从另一个甜品维度偷渡新鲜饼干。",
    icon: "icon-portal.png",
    baseCost: 23000,
    cps: 180,
  },
  {
    id: "guild",
    name: "饼干行会",
    desc: "让整座城市为你烘焙。",
    icon: "icon-guild.png",
    baseCost: 128000,
    cps: 960,
  },
];

const upgrades = [
  {
    id: "double-click",
    name: "镀金擀面杖",
    desc: "点击收益 x2。",
    icon: "upgrade-multiplier.png",
    cost: 120,
    requires: (s) => s.totalCookies >= 90,
    apply: (s) => {
      s.clickMultiplier *= 2;
    },
  },
  {
    id: "warm-fingers",
    name: "余温手套",
    desc: "点击收益再 x2。",
    icon: "upgrade-ember.png",
    cost: 1400,
    requires: (s) => s.totalClicks >= 180,
    apply: (s) => {
      s.clickMultiplier *= 2;
    },
  },
  {
    id: "night-shift",
    name: "夜班钟摆",
    desc: "所有建筑产能 x1.5。",
    icon: "upgrade-clock.png",
    cost: 3600,
    requires: (s) => countBuildings(s) >= 18,
    apply: (s) => {
      s.globalCpsMultiplier *= 1.5;
    },
  },
  {
    id: "prism-sugar",
    name: "棱镜糖霜",
    desc: "黄金饼干奖励 x2。",
    icon: "upgrade-prism.png",
    cost: 12000,
    requires: (s) => s.goldenClicks >= 3,
    apply: (s) => {
      s.goldenMultiplier *= 2;
    },
  },
  {
    id: "guild-ledger",
    name: "行会账本",
    desc: "每个建筑额外提升 1% 点击收益。",
    icon: "icon-guild.png",
    cost: 56000,
    requires: (s) => countBuildings(s) >= 42,
    apply: (s) => {
      s.hasGuildLedger = true;
    },
  },
];

const achievements = [
  { id: "first-bite", name: "第一口", desc: "点击 1 次饼干。", test: (s) => s.totalClicks >= 1 },
  { id: "hundred", name: "一小袋饼干", desc: "累计获得 100 块饼干。", test: (s) => s.totalCookies >= 100 },
  { id: "thousand", name: "甜味开始失控", desc: "累计获得 1,000 块饼干。", test: (s) => s.totalCookies >= 1000 },
  { id: "factory", name: "工坊成型", desc: "拥有 25 座建筑。", test: (s) => countBuildings(s) >= 25 },
  { id: "gold-hunter", name: "追光者", desc: "点击 5 次黄金饼干。", test: (s) => s.goldenClicks >= 5 },
  { id: "prestige", name: "星尘烘焙师", desc: "完成一次转生。", test: (s) => s.ascensions >= 1 },
];

const defaultState = () => ({
  cookies: 0,
  totalCookies: 0,
  lifetimeCookies: 0,
  totalClicks: 0,
  goldenClicks: 0,
  ascensions: 0,
  stardust: 0,
  clickMultiplier: 1,
  globalCpsMultiplier: 1,
  goldenMultiplier: 1,
  hasGuildLedger: false,
  boughtUpgrades: [],
  achievements: [],
  buildings: Object.fromEntries(buildings.map((b) => [b.id, 0])),
  buyMode: 1,
  goldenVisible: false,
  goldenExpiresAt: 0,
  frenzyUntil: 0,
  lastSavedAt: Date.now(),
});

let state = loadState();
let lastTick = performance.now();
let lastAutoRender = 0;
let goldenTimer = null;

const $ = (id) => document.getElementById(id);

const refs = {
  cookieButton: $("cookieButton"),
  goldenCookie: $("goldenCookie"),
  fxLayer: $("fxLayer"),
  cookieCount: $("cookieCount"),
  perClick: $("perClick"),
  cps: $("cps"),
  topCookies: $("topCookies"),
  topCps: $("topCps"),
  topPrestige: $("topPrestige"),
  buildingList: $("buildingList"),
  upgradeList: $("upgradeList"),
  achievementList: $("achievementList"),
  statsGrid: $("statsGrid"),
  currentEvent: $("currentEvent"),
  eventTimer: $("eventTimer"),
  ascendButton: $("ascendButton"),
  ascendHint: $("ascendHint"),
  resetButton: $("resetButton"),
  saveNow: $("saveNow"),
};

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const merged = { ...defaultState(), ...parsed };
    merged.buildings = { ...defaultState().buildings, ...(parsed.buildings || {}) };
    merged.boughtUpgrades = Array.isArray(parsed.boughtUpgrades) ? parsed.boughtUpgrades : [];
    merged.achievements = Array.isArray(parsed.achievements) ? parsed.achievements : [];
    applyUpgradeDerivedState(merged);
    const offlineSeconds = Math.min(8 * 60 * 60, Math.max(0, (Date.now() - (merged.lastSavedAt || Date.now())) / 1000));
    const offlineGain = calculateCps(merged) * offlineSeconds * 0.12;
    if (offlineGain >= 5) {
      merged.cookies += offlineGain;
      merged.totalCookies += offlineGain;
      merged.lifetimeCookies += offlineGain;
      setTimeout(() => toast(`离线工坊产出了 ${format(offlineGain)} 块饼干。`), 350);
    }
    return merged;
  } catch {
    return defaultState();
  }
}

function applyUpgradeDerivedState(target) {
  target.clickMultiplier = 1;
  target.globalCpsMultiplier = 1;
  target.goldenMultiplier = 1;
  target.hasGuildLedger = false;
  for (const upgrade of upgrades) {
    if (target.boughtUpgrades.includes(upgrade.id)) upgrade.apply(target);
  }
}

function saveState() {
  state.lastSavedAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function countBuildings(s = state) {
  return Object.values(s.buildings).reduce((sum, n) => sum + n, 0);
}

function achievementBonus(s = state) {
  return 1 + s.achievements.length * 0.01;
}

function prestigeBonus(s = state) {
  return 1 + s.stardust * 0.04;
}

function frenzyBonus(s = state) {
  return Date.now() < s.frenzyUntil ? 7 : 1;
}

function calculateCps(s = state) {
  const base = buildings.reduce((sum, b) => sum + (s.buildings[b.id] || 0) * b.cps, 0);
  return base * s.globalCpsMultiplier * achievementBonus(s) * prestigeBonus(s) * frenzyBonus(s);
}

function calculateClickValue(s = state) {
  const ledger = s.hasGuildLedger ? 1 + countBuildings(s) * 0.01 : 1;
  return Math.max(1, s.clickMultiplier * achievementBonus(s) * prestigeBonus(s) * ledger);
}

function buildingCost(building, amount = 1) {
  const owned = state.buildings[building.id] || 0;
  let total = 0;
  for (let i = 0; i < amount; i += 1) {
    total += building.baseCost * Math.pow(1.15, owned + i);
  }
  return total;
}

function resolveBuyAmount(building) {
  if (state.buyMode !== "max") return Number(state.buyMode);
  let amount = 0;
  let total = 0;
  while (amount < 1000) {
    const next = building.baseCost * Math.pow(1.15, (state.buildings[building.id] || 0) + amount);
    if (total + next > state.cookies) break;
    total += next;
    amount += 1;
  }
  return Math.max(1, amount);
}

function addCookies(amount) {
  state.cookies += amount;
  state.totalCookies += amount;
  state.lifetimeCookies += amount;
}

function spend(amount) {
  if (state.cookies < amount) return false;
  state.cookies -= amount;
  return true;
}

function clickCookie(event) {
  const value = calculateClickValue();
  addCookies(value);
  state.totalClicks += 1;
  refs.cookieButton.classList.remove("pulse");
  void refs.cookieButton.offsetWidth;
  refs.cookieButton.classList.add("pulse");
  const rect = refs.fxLayer.getBoundingClientRect();
  const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
  const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
  spawnFloat(`+${format(value)}`, x, y);
  spawnCrumbs(x, y);
  checkAchievements();
  render();
}

function buyBuilding(building) {
  const amount = resolveBuyAmount(building);
  const cost = buildingCost(building, amount);
  if (!spend(cost)) {
    toast("饼干不够，工坊还买不起这个。");
    return;
  }
  state.buildings[building.id] += amount;
  toast(`购买 ${building.name} x${amount}`);
  checkAchievements();
  render();
}

function buyUpgrade(upgrade) {
  if (state.boughtUpgrades.includes(upgrade.id)) return;
  if (!upgrade.requires(state)) {
    toast("秘方还没解锁。");
    return;
  }
  if (!spend(upgrade.cost)) {
    toast("饼干不够，秘方买不起。");
    return;
  }
  state.boughtUpgrades.push(upgrade.id);
  upgrade.apply(state);
  toast(`升级完成：${upgrade.name}`);
  render();
}

function showGoldenCookie() {
  if (state.goldenVisible) return;
  const rect = refs.fxLayer.getBoundingClientRect();
  const x = Math.max(80, Math.min(rect.width - 150, Math.random() * rect.width));
  const y = Math.max(120, Math.min(rect.height - 160, Math.random() * rect.height));
  refs.goldenCookie.style.left = `${x}px`;
  refs.goldenCookie.style.top = `${y}px`;
  refs.goldenCookie.classList.remove("hidden");
  state.goldenVisible = true;
  state.goldenExpiresAt = Date.now() + 9500;
  refs.currentEvent.textContent = "黄金饼干出现";
  scheduleGoldenCookie();
}

function clickGoldenCookie() {
  if (!state.goldenVisible) return;
  state.goldenVisible = false;
  state.goldenExpiresAt = 0;
  refs.goldenCookie.classList.add("hidden");
  state.goldenClicks += 1;
  const rewardType = Math.random();
  if (rewardType < 0.45) {
    const reward = Math.max(77, calculateCps() * 55 + calculateClickValue() * 24) * state.goldenMultiplier;
    addCookies(reward);
    toast(`黄金饼干爆发：+${format(reward)} 饼干`);
    spawnFloat(`+${format(reward)}`, refs.fxLayer.clientWidth * 0.62, refs.fxLayer.clientHeight * 0.25);
  } else {
    state.frenzyUntil = Date.now() + 30000;
    toast("焦糖狂热：30 秒内建筑产能 x7");
  }
  checkAchievements();
  render();
}

function scheduleGoldenCookie() {
  if (goldenTimer) window.clearTimeout(goldenTimer);
  goldenTimer = window.setTimeout(showGoldenCookie, 24000 + Math.random() * 28000);
}

function checkGoldenExpiry() {
  if (state.goldenVisible && Date.now() > state.goldenExpiresAt) {
    state.goldenVisible = false;
    refs.goldenCookie.classList.add("hidden");
  }
}

function checkAchievements() {
  for (const achievement of achievements) {
    if (!state.achievements.includes(achievement.id) && achievement.test(state)) {
      state.achievements.push(achievement.id);
      toast(`成就解锁：${achievement.name}`);
    }
  }
}

function ascend() {
  const earned = Math.floor(Math.sqrt(state.totalCookies / 50000));
  if (earned <= 0) return;
  const keep = {
    stardust: state.stardust + earned,
    ascensions: state.ascensions + 1,
    lifetimeCookies: state.lifetimeCookies,
    achievements: state.achievements,
  };
  state = { ...defaultState(), ...keep };
  checkAchievements();
  saveState();
  toast(`转生完成：获得 ${earned} 星尘。`);
  render();
}

function resetSave() {
  if (!window.confirm("确定清空 Cookie Atelier Deluxe 的存档吗？")) return;
  localStorage.removeItem(SAVE_KEY);
  state = defaultState();
  toast("存档已清空。");
  render();
}

function spawnFloat(text, x, y) {
  const el = document.createElement("div");
  el.className = "float-num";
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  refs.fxLayer.appendChild(el);
  window.setTimeout(() => el.remove(), 860);
}

function spawnCrumbs(x, y) {
  for (let i = 0; i < 10; i += 1) {
    const crumb = document.createElement("span");
    crumb.className = "crumb";
    crumb.style.left = `${x}px`;
    crumb.style.top = `${y}px`;
    crumb.style.background = ["#9a4a24", "#d98b3f", "#f0b45f", "#603018"][i % 4];
    crumb.style.setProperty("--dx", `${Math.cos(i * 0.7) * (30 + Math.random() * 58)}px`);
    crumb.style.setProperty("--dy", `${Math.sin(i * 0.7) * (30 + Math.random() * 58)}px`);
    refs.fxLayer.appendChild(crumb);
    window.setTimeout(() => crumb.remove(), 760);
  }
}

function toast(message) {
  const template = $("toastTemplate");
  const node = template.content.firstElementChild.cloneNode(true);
  node.textContent = message;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 3300);
}

function format(value) {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs < 1000) return `${Math.floor(value).toLocaleString("zh-CN")}`;
  const units = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  const unit = units.find(([limit]) => abs >= limit);
  return `${(value / unit[0]).toFixed(abs >= unit[0] * 100 ? 1 : 2)}${unit[1]}`;
}

function renderBuildings() {
  refs.buildingList.innerHTML = "";
  for (const building of buildings) {
    const amount = resolveBuyAmount(building);
    const cost = buildingCost(building, amount);
    const owned = state.buildings[building.id] || 0;
    const card = document.createElement("button");
    card.className = `buy-card ${state.cookies < cost ? "disabled" : ""}`;
    card.innerHTML = `
      <span class="item-icon"><img src="./assets/${building.icon}" alt=""></span>
      <span class="item-meta">
        <h3>${building.name}<span class="badge">${owned}</span></h3>
        <p>${building.desc}<br>每座 ${building.cps}/s · 本次 x${amount}</p>
      </span>
      <span class="item-cost">
        <strong>${format(cost)}</strong>
        <span>购买成本</span>
      </span>
    `;
    card.addEventListener("click", () => buyBuilding(building));
    refs.buildingList.appendChild(card);
  }
}

function renderUpgrades() {
  refs.upgradeList.innerHTML = "";
  for (const upgrade of upgrades) {
    const bought = state.boughtUpgrades.includes(upgrade.id);
    const unlocked = upgrade.requires(state);
    const card = document.createElement("button");
    card.className = `buy-card ${bought || !unlocked || state.cookies < upgrade.cost ? "disabled" : ""}`;
    card.innerHTML = `
      <span class="item-icon"><img src="./assets/${upgrade.icon}" alt=""></span>
      <span class="item-meta">
        <h3>${upgrade.name}${bought ? '<span class="badge">已拥有</span>' : ""}</h3>
        <p>${unlocked ? upgrade.desc : "条件未满足，继续扩张工坊。"}</p>
      </span>
      <span class="item-cost">
        <strong>${bought ? "完成" : format(upgrade.cost)}</strong>
        <span>${bought ? "秘方已生效" : "秘方成本"}</span>
      </span>
    `;
    card.addEventListener("click", () => buyUpgrade(upgrade));
    refs.upgradeList.appendChild(card);
  }
}

function renderAchievements() {
  refs.achievementList.innerHTML = "";
  for (const achievement of achievements) {
    const unlocked = state.achievements.includes(achievement.id);
    const card = document.createElement("div");
    card.className = `achievement ${unlocked ? "" : "locked"}`;
    card.innerHTML = `
      <strong>${unlocked ? "★" : "☆"} ${achievement.name}</strong>
      <span>${achievement.desc}</span>
    `;
    refs.achievementList.appendChild(card);
  }
}

function renderStats() {
  const cps = calculateCps();
  const click = calculateClickValue();
  refs.statsGrid.innerHTML = [
    ["累计饼干", format(state.totalCookies)],
    ["终身饼干", format(state.lifetimeCookies)],
    ["总点击", format(state.totalClicks)],
    ["黄金饼干", format(state.goldenClicks)],
    ["建筑数量", format(countBuildings())],
    ["点击收益", `+${format(click)}`],
    ["当前产能", `${format(cps)}/s`],
    ["星尘", `${state.stardust} (+${Math.round((prestigeBonus() - 1) * 100)}%)`],
  ]
    .map(([name, value]) => `<div class="stat-card"><strong>${value}</strong><span>${name}</span></div>`)
    .join("");
  const earned = Math.floor(Math.sqrt(state.totalCookies / 50000));
  refs.ascendButton.disabled = earned <= 0;
  refs.ascendHint.textContent =
    earned > 0 ? `现在转生可获得 ${earned} 星尘，永久提升 ${earned * 4}%` : "累计 50,000 饼干后解锁";
}

function render() {
  checkGoldenExpiry();
  const cookies = format(state.cookies);
  const cps = calculateCps();
  const click = calculateClickValue();
  refs.cookieCount.textContent = cookies;
  refs.topCookies.textContent = cookies;
  refs.topCps.textContent = `${format(cps)}/s`;
  refs.topPrestige.textContent = `+${Math.round((prestigeBonus() - 1) * 100)}%`;
  refs.perClick.textContent = `每次 +${format(click)}`;
  refs.cps.textContent = `每秒 ${format(cps)}`;
  if (Date.now() < state.frenzyUntil) {
    refs.currentEvent.textContent = "焦糖狂热";
    refs.eventTimer.textContent = `剩余 ${Math.ceil((state.frenzyUntil - Date.now()) / 1000)} 秒，产能 x7`;
  } else if (state.goldenVisible) {
    refs.currentEvent.textContent = "黄金饼干出现";
    refs.eventTimer.textContent = `剩余 ${Math.ceil((state.goldenExpiresAt - Date.now()) / 1000)} 秒`;
  } else {
    refs.currentEvent.textContent = "工坊待命";
    refs.eventTimer.textContent = "黄金饼干会偶尔出现";
  }
  renderBuildings();
  renderUpgrades();
  renderAchievements();
  renderStats();
}

function tick(now) {
  const delta = Math.min(0.25, (now - lastTick) / 1000);
  lastTick = now;
  const gain = calculateCps() * delta;
  if (gain > 0) addCookies(gain);
  if (now - lastAutoRender > 250) {
    lastAutoRender = now;
    render();
  }
  requestAnimationFrame(tick);
}

function setupEvents() {
  refs.cookieButton.addEventListener("click", clickCookie);
  refs.goldenCookie.addEventListener("click", clickGoldenCookie);
  refs.ascendButton.addEventListener("click", ascend);
  refs.resetButton.addEventListener("click", resetSave);
  refs.saveNow.addEventListener("click", () => {
    saveState();
    toast("已保存。");
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      $(`${tab.dataset.tab}Panel`).classList.add("active");
    });
  });

  document.querySelectorAll(".mode").forEach((mode) => {
    mode.addEventListener("click", () => {
      document.querySelectorAll(".mode").forEach((m) => m.classList.remove("active"));
      mode.classList.add("active");
      state.buyMode = mode.dataset.buy === "max" ? "max" : Number(mode.dataset.buy);
      render();
    });
  });

  window.addEventListener("beforeunload", saveState);
  window.setInterval(saveState, 10000);
}

function boot() {
  setupEvents();
  scheduleGoldenCookie();
  checkAchievements();
  render();
  requestAnimationFrame(tick);
}

boot();

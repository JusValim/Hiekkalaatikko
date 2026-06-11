const STORAGE_KEY = "wc2026-sim-v2";

const GROUPS = {
  A: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
  B: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

const GROUP_ORDER = Object.keys(GROUPS);

const FLAGS = {
  "Mexico": "🇲🇽",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  "Czech Republic": "🇨🇿",
  "Canada": "🇨🇦",
  "Bosnia and Herzegovina": "🇧🇦",
  "Qatar": "🇶🇦",
  "Switzerland": "🇨🇭",
  "Brazil": "🇧🇷",
  "Morocco": "🇲🇦",
  "Haiti": "🇭🇹",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "United States": "🇺🇸",
  "Paraguay": "🇵🇾",
  "Australia": "🇦🇺",
  "Turkey": "🇹🇷",
  "Germany": "🇩🇪",
  "Curaçao": "🇨🇼",
  "Ivory Coast": "🇨🇮",
  "Ecuador": "🇪🇨",
  "Netherlands": "🇳🇱",
  "Japan": "🇯🇵",
  "Sweden": "🇸🇪",
  "Tunisia": "🇹🇳",
  "Belgium": "🇧🇪",
  "Egypt": "🇪🇬",
  "Iran": "🇮🇷",
  "New Zealand": "🇳🇿",
  "Spain": "🇪🇸",
  "Cape Verde": "🇨🇻",
  "Saudi Arabia": "🇸🇦",
  "Uruguay": "🇺🇾",
  "France": "🇫🇷",
  "Senegal": "🇸🇳",
  "Iraq": "🇮🇶",
  "Norway": "🇳🇴",
  "Argentina": "🇦🇷",
  "Algeria": "🇩🇿",
  "Austria": "🇦🇹",
  "Jordan": "🇯🇴",
  "Portugal": "🇵🇹",
  "DR Congo": "🇨🇩",
  "Uzbekistan": "🇺🇿",
  "Colombia": "🇨🇴",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Croatia": "🇭🇷",
  "Ghana": "🇬🇭",
  "Panama": "🇵🇦",
};

function teamLabel(name) {
  if (!name) return "–";
  const flag = FLAGS[name] || "";
  return flag ? `${flag} ${name}` : name;
}

const R32_PAIRINGS = [
  [0, 31],
  [15, 16],
  [7, 24],
  [8, 23],
  [3, 28],
  [12, 19],
  [4, 27],
  [11, 20],
  [2, 29],
  [13, 18],
  [6, 25],
  [9, 22],
  [1, 30],
  [14, 17],
  [5, 26],
  [10, 21],
];

let state = loadState() || createInitialState();
let dragState = null;

const groupsSection = document.getElementById("groupsSection");
const thirdSection = document.getElementById("thirdSection");
const knockoutSection = document.getElementById("knockoutSection");
const doneSection = document.getElementById("doneSection");
const resetBtn = document.getElementById("resetBtn");

resetBtn.addEventListener("click", () => {
  const ok = window.confirm("Poistetaanko kaikki tallennetut valinnat ja aloitetaan alusta?");
  if (!ok) {
    return;
  }

  state = createInitialState();
  saveState();
  render();
});

render();

function createInitialState() {
  const groups = {};
  for (const key of GROUP_ORDER) {
    groups[key] = [...GROUPS[key]];
  }

  return {
    phase: "groups",
    groups,
    thirdPlaceSelected: [],
    knockout: {
      r32: [],
      r16: [],
      qf: [],
      sf: [],
      final: [{ id: "F-1", home: null, away: null, winner: null }],
      third: [{ id: "T-1", home: null, away: null, winner: null }],
    },
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.groups) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("State parse failed", error);
    return null;
  }
}

function render() {
  renderPhasePills();

  groupsSection.classList.toggle("hidden", state.phase !== "groups");
  thirdSection.classList.toggle("hidden", state.phase !== "third");
  knockoutSection.classList.toggle("hidden", state.phase !== "knockout");
  doneSection.classList.toggle("hidden", state.phase !== "done");

  if (state.phase === "groups") {
    renderGroups();
  }

  if (state.phase === "third") {
    renderThirdPlace();
  }

  if (state.phase === "knockout") {
    recomputeKnockout();
    renderKnockout();
  }

  if (state.phase === "done") {
    recomputeKnockout();
    renderDone();
  }
}

function renderPhasePills() {
  const map = {
    groups: "pill-groups",
    third: "pill-third",
    knockout: "pill-knockout",
    done: "pill-done",
  };

  for (const id of Object.values(map)) {
    document.getElementById(id).classList.remove("active");
  }

  const activeId = map[state.phase];
  if (activeId) {
    document.getElementById(activeId).classList.add("active");
  }
}

function renderGroups() {
  const groupCards = GROUP_ORDER.map((groupKey) => {
    const teams = state.groups[groupKey];
    const items = teams
      .map((team, index) => {
        const canMoveUp = index > 0;
        const canMoveDown = index < teams.length - 1;
        return `
          <li class="team-item pos-${index + 1}" draggable="true" data-group="${groupKey}" data-index="${index}">
            <span>${teamLabel(team)}</span>
            <span class="mobile-reorder" aria-label="Jarjesta joukkuetta ${team}">
              <button class="reorder-btn" type="button" data-move="up" data-group="${groupKey}" data-index="${index}" ${canMoveUp ? "" : "disabled"}>▲</button>
              <button class="reorder-btn" type="button" data-move="down" data-group="${groupKey}" data-index="${index}" ${canMoveDown ? "" : "disabled"}>▼</button>
            </span>
            <span class="rank-tag">${index + 1}.</span>
          </li>
        `;
      })
      .join("");

    return `
      <article class="group-card">
        <h3>Lohko ${groupKey}</h3>
        <ul class="team-list" data-group-list="${groupKey}">${items}</ul>
      </article>
    `;
  }).join("");

  groupsSection.innerHTML = `
    <h2>Lohkovaihe</h2>
    <p class="section-subtitle">Raahaa joukkueet lohkon sisalla haluttuun jarjestykseen (1-4).</p>
    <div class="group-grid">${groupCards}</div>
    <div class="actions-row">
      <button class="primary-btn" id="toThirdBtn" type="button">Seuraava: valitse 8 parasta kolmosta</button>
    </div>
  `;

  for (const item of groupsSection.querySelectorAll(".team-item")) {
    item.addEventListener("dragstart", onDragStart);
    item.addEventListener("dragend", onDragEnd);
    item.addEventListener("dragover", onDragOver);
    item.addEventListener("drop", onDrop);
  }

  groupsSection.querySelectorAll(".reorder-btn").forEach((btn) => {
    btn.addEventListener("click", onReorderButtonClick);
  });

  const toThirdBtn = document.getElementById("toThirdBtn");
  toThirdBtn.addEventListener("click", () => {
    state.phase = "third";
    state.thirdPlaceSelected = state.thirdPlaceSelected.filter((team) => getThirdPlaceTeams().includes(team));
    saveState();
    render();
  });
}

function onDragStart(event) {
  const item = event.currentTarget;
  dragState = {
    group: item.dataset.group,
    index: Number(item.dataset.index),
  };
  item.classList.add("dragging");
}

function onDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
}

function onDragOver(event) {
  event.preventDefault();
}

function onDrop(event) {
  event.preventDefault();
  if (!dragState) {
    return;
  }

  const target = event.currentTarget;
  const targetGroup = target.dataset.group;
  const targetIndex = Number(target.dataset.index);

  if (targetGroup !== dragState.group) {
    return;
  }

  if (targetIndex === dragState.index) {
    return;
  }

  const teams = state.groups[targetGroup];
  const [moved] = teams.splice(dragState.index, 1);
  teams.splice(targetIndex, 0, moved);

  dragState = null;
  saveState();
  render();
}

function onReorderButtonClick(event) {
  const btn = event.currentTarget;
  const groupKey = btn.dataset.group;
  const index = Number(btn.dataset.index);
  const direction = btn.dataset.move;
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (!groupKey || Number.isNaN(index) || targetIndex < 0) {
    return;
  }

  const teams = state.groups[groupKey];
  if (!teams || targetIndex >= teams.length) {
    return;
  }

  [teams[index], teams[targetIndex]] = [teams[targetIndex], teams[index]];
  saveState();
  render();
}

function getThirdPlaceTeams() {
  return GROUP_ORDER.map((groupKey) => state.groups[groupKey][2]);
}

function renderThirdPlace() {
  const thirdTeams = getThirdPlaceTeams();
  state.thirdPlaceSelected = state.thirdPlaceSelected.filter((team) => thirdTeams.includes(team));

  const cards = thirdTeams
    .map((team, index) => {
      const checked = state.thirdPlaceSelected.includes(team) ? "checked" : "";
      const group = GROUP_ORDER[index];

      return `
        <label class="third-card">
          <input type="checkbox" data-third-team="${team}" ${checked} />
          <span><strong>${teamLabel(team)}</strong><br />Lohko ${group} (3.)</span>
        </label>
      `;
    })
    .join("");

  const isValid = state.thirdPlaceSelected.length === 8;

  thirdSection.innerHTML = `
    <h2>Parhaat kolmossijaiset</h2>
    <p class="section-subtitle">Valitse tasan 8 joukkuetta, jotka menevat 32 parhaan joukkoon.</p>
    <p class="counter-pill">Valittu: ${state.thirdPlaceSelected.length} / 8</p>
    <div class="third-grid">${cards}</div>
    <div class="actions-row">
      <button class="ghost-btn" id="backToGroupsBtn" type="button">Takaisin lohkoihin</button>
      <button class="primary-btn" id="toKnockoutBtn" type="button" ${isValid ? "" : "disabled"}>Siirry pudotuspeleihin</button>
    </div>
  `;

  for (const input of thirdSection.querySelectorAll("input[data-third-team]")) {
    input.addEventListener("change", onThirdPlaceToggle);
  }

  document.getElementById("backToGroupsBtn").addEventListener("click", () => {
    state.phase = "groups";
    saveState();
    render();
  });

  document.getElementById("toKnockoutBtn").addEventListener("click", () => {
    if (state.thirdPlaceSelected.length !== 8) {
      return;
    }

    initializeKnockout();
    state.phase = "knockout";
    saveState();
    render();
  });
}

function onThirdPlaceToggle(event) {
  const team = event.currentTarget.dataset.thirdTeam;
  if (event.currentTarget.checked) {
    if (state.thirdPlaceSelected.length >= 8) {
      event.currentTarget.checked = false;
      window.alert("Voit valita enintaan 8 joukkuetta.");
      return;
    }

    state.thirdPlaceSelected.push(team);
  } else {
    state.thirdPlaceSelected = state.thirdPlaceSelected.filter((name) => name !== team);
  }

  saveState();
  render();
}

function initializeKnockout() {
  const qualifiers = buildQualifiers();
  const nextR32 = R32_PAIRINGS.map((pair, idx) => {
    return {
      id: `R32-${idx + 1}`,
      home: qualifiers[pair[0]] || null,
      away: qualifiers[pair[1]] || null,
      winner: null,
    };
  });

  state.knockout = {
    r32: nextR32,
    r16: buildEmptyRound("R16", 8),
    qf: buildEmptyRound("QF", 4),
    sf: buildEmptyRound("SF", 2),
    final: [{ id: "F-1", home: null, away: null, winner: null }],
    third: [{ id: "T-1", home: null, away: null, winner: null }],
  };
}

function buildQualifiers() {
  const winners = GROUP_ORDER.map((groupKey) => state.groups[groupKey][0]);
  const runners = GROUP_ORDER.map((groupKey) => state.groups[groupKey][1]);
  const thirds = [...state.thirdPlaceSelected];

  const seed24 = [
    winners[0],
    runners[1],
    winners[2],
    runners[3],
    winners[4],
    runners[5],
    winners[6],
    runners[7],
    winners[8],
    runners[9],
    winners[10],
    runners[11],
    winners[1],
    runners[0],
    winners[3],
    runners[2],
    winners[5],
    runners[4],
    winners[7],
    runners[6],
    winners[9],
    runners[8],
    winners[11],
    runners[10],
  ];

  return [...seed24, ...thirds];
}

function buildEmptyRound(prefix, count) {
  return Array.from({ length: count }, (_, index) => {
    return {
      id: `${prefix}-${index + 1}`,
      home: null,
      away: null,
      winner: null,
    };
  });
}

function setRoundFromWinners(targetRound, sourceRound) {
  for (let i = 0; i < targetRound.length; i += 1) {
    const left = sourceRound[i * 2];
    const right = sourceRound[i * 2 + 1];

    const home = left ? left.winner : null;
    const away = right ? right.winner : null;

    targetRound[i].home = home;
    targetRound[i].away = away;

    if (targetRound[i].winner !== home && targetRound[i].winner !== away) {
      targetRound[i].winner = null;
    }
  }
}

function recomputeKnockout() {
  const k = state.knockout;
  if (!k || !Array.isArray(k.r32) || k.r32.length === 0) {
    return;
  }

  for (const match of k.r32) {
    if (match.winner !== match.home && match.winner !== match.away) {
      match.winner = null;
    }
  }

  setRoundFromWinners(k.r16, k.r32);
  setRoundFromWinners(k.qf, k.r16);
  setRoundFromWinners(k.sf, k.qf);

  const final = k.final[0];
  final.home = k.sf[0].winner || null;
  final.away = k.sf[1].winner || null;
  if (final.winner !== final.home && final.winner !== final.away) {
    final.winner = null;
  }

  const third = k.third[0];
  third.home = getLoser(k.sf[0]);
  third.away = getLoser(k.sf[1]);
  if (third.winner !== third.home && third.winner !== third.away) {
    third.winner = null;
  }
}

function getLoser(match) {
  if (!match || !match.winner || !match.home || !match.away) {
    return null;
  }

  return match.winner === match.home ? match.away : match.home;
}

function renderRound(title, roundKey, matches) {
  const cards = matches
    .map((match) => {
      return `
        <article class="match" data-round="${roundKey}" data-match="${match.id}">
          <div class="match-label">${match.id}</div>
          ${renderPickButton(match.home, match.winner, true)}
          ${renderPickButton(match.away, match.winner, false)}
        </article>
      `;
    })
    .join("");

  return `
    <section class="round">
      <h3>${title}</h3>
      ${cards}
    </section>
  `;
}

function renderPickButton(team, winner, isHome) {
  if (!team) {
    return `<button class="pick-btn" type="button" disabled>Odottaa edellista kierrosta</button>`;
  }

  const winnerClass = winner === team ? "winner" : "";
  return `<button class="pick-btn ${winnerClass}" type="button" data-team="${team}" data-side="${isHome ? "home" : "away"}">${teamLabel(team)}</button>`;
}

function renderKnockout() {
  const k = state.knockout;
  knockoutSection.innerHTML = `
    <h2>Pudotuspelit</h2>
    <p class="section-subtitle">Valitse jokaisesta ottelusta jatkoon meneva joukkue klikkaamalla nimea.</p>
    <div class="bracket-wrap">
      <div class="bracket">
        ${renderRound("32 parasta", "r32", k.r32)}
        ${renderRound("16 parasta", "r16", k.r16)}
        ${renderRound("Puolierat", "qf", k.qf)}
        ${renderRound("Valierat", "sf", k.sf)}
        ${renderRound("Finaali", "final", k.final)}
        ${renderRound("Pronssiottelu", "third", k.third)}
      </div>
    </div>
    <div class="actions-row">
      <button id="backToThirdBtn" class="ghost-btn" type="button">Takaisin kolmossijoihin</button>
      <button id="finishBtn" class="soft-btn" type="button">Nayta lopputulos</button>
    </div>
  `;

  knockoutSection.querySelectorAll(".match .pick-btn[data-team]").forEach((btn) => {
    btn.addEventListener("click", onPickWinner);
  });

  document.getElementById("backToThirdBtn").addEventListener("click", () => {
    state.phase = "third";
    saveState();
    render();
  });

  const complete = isKnockoutComplete();
  const finishBtn = document.getElementById("finishBtn");
  finishBtn.disabled = !complete;
  finishBtn.addEventListener("click", () => {
    if (!isKnockoutComplete()) {
      return;
    }

    state.phase = "done";
    saveState();
    render();
  });
}

function onPickWinner(event) {
  const btn = event.currentTarget;
  const team = btn.dataset.team;
  const matchEl = btn.closest(".match");
  const roundKey = matchEl.dataset.round;
  const matchId = matchEl.dataset.match;
  const round = state.knockout[roundKey];
  const match = round.find((item) => item.id === matchId);

  if (!match || (team !== match.home && team !== match.away)) {
    return;
  }

  match.winner = team;
  recomputeKnockout();
  saveState();
  render();
}

function isKnockoutComplete() {
  const k = state.knockout;
  if (!k.r32.length) {
    return false;
  }

  const allRounds = [...k.r32, ...k.r16, ...k.qf, ...k.sf, ...k.final, ...k.third];
  return allRounds.every((match) => match.winner);
}

function renderDone() {
  const final = state.knockout.final[0];
  const third = state.knockout.third[0];
  const silver = getLoser(final);

  doneSection.innerHTML = `
    <h2>Lopputulos</h2>
    <p class="section-subtitle">Tassa on oma turnaussimulaatiosi lopputulos.</p>
    <div class="result-card">
      <div class="result-row"><strong>🥇 Mestari:</strong> ${teamLabel(final.winner)}</div>
      <div class="result-row"><strong>🥈 Hopea:</strong> ${teamLabel(silver)}</div>
      <div class="result-row"><strong>🥉 Pronssi:</strong> ${teamLabel(third.winner)}</div>
    </div>
    <div class="actions-row">
      <button id="editKnockoutBtn" class="ghost-btn" type="button">Muokkaa pudotuspeleja</button>
      <button id="restartBtn" class="primary-btn" type="button">Uusi simulaatio</button>
    </div>
  `;

  document.getElementById("editKnockoutBtn").addEventListener("click", () => {
    state.phase = "knockout";
    saveState();
    render();
  });

  document.getElementById("restartBtn").addEventListener("click", () => {
    state = createInitialState();
    saveState();
    render();
  });
}

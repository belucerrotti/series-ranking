/* ============================================================
   EPISODIOS
============================================================ */

const EPISODES = [
  {id:"s1e1",season:1,number:1,title:"Desmond's Big Day Out",img:"img/desmond.jpg"},
  {id:"s1e2",season:1,number:2,title:"Mr. Frog",img:"img/mr-frog.jpg"},
  {id:"s1e3",season:1,number:3,title:"Shrimp's Odyssey",img:"img/shrimp.png"},
  {id:"s1e4",season:1,number:4,title:"A Silly Halloween Special",img:"img/halloween.jpg"},
  {id:"s1e5",season:1,number:5,title:"Who Murdered Simon S. Salty?",img:"img/simon-salty.jpg"},
  {id:"s1e6",season:1,number:6,title:"Enchanted Forest",img:"img/forest.jpg"},
  {id:"s1e7",season:1,number:7,title:"Frowning Friends",img:"img/frowning.jpg"},
  {id:"s1e8",season:1,number:8,title:"Charlie Dies and Doesn't Come Back",img:"img/charlie-dies.jpg"},
  {id:"s1e9",season:1,number:9,title:"Smiling Friends Go to Brazil!",img:"img/brazil.jpg"},
  {id:"s2e1",season:2,number:1,title:"Gwimbly DX Remastered",img:"img/gwimbly.jpg"},
  {id:"s2e2",season:2,number:2,title:"Mr. President",img:"img/mr-president.png"},
  {id:"s2e3",season:2,number:3,title:"A Allan Adventure",img:"img/allan-adventure.jpg"},
  {id:"s2e4",season:2,number:4,title:"Boss Finds Love?",img:"img/boss-love.jpg"},
  {id:"s2e5",season:2,number:5,title:"Brother's Egg",img:"img/egg.png"},
  {id:"s2e6",season:2,number:6,title:"Charlie, Pim & Bill vs Alien",img:"img/alien.jpg"},
  {id:"s2e7",season:2,number:7,title:"The Magical Red Jewel",img:"img/jewel.webp"},
  {id:"s2e8",season:2,number:8,title:"Pim Finally Turns Green",img:"img/pim-green.jpg"},
  {id:"s3e1",season:3,number:1,title:"Silly Samuel",img:"img/silly-samuel.jpg"},
  {id:"s3e2",season:3,number:2,title:"Le Voyage Incroyable de Monsieur Grenouille",img:"img/mr-frog.webp"},
  {id:"s3e3",season:3,number:3,title:"Mole Man",img:"img/mole-man.jpg"},
  {id:"s3e4",season:3,number:4,title:"Curse of the Green Halloween Witch",img:"img/witch.webp"},
  {id:"s3e5",season:3,number:5,title:"Pim and Charlie Save Mother Nature",img:"img/mother-nature.webp"},
  {id:"s3e6",season:3,number:6,title:"Squim Returns",img:"img/squim-returns.webp"},
  {id:"s3e7",season:3,number:7,title:"Shmaloogles",img:"img/pitufos.webp"},
  {id:"s3e8",season:3,number:8,title:"The Glep Ep",img:"img/glep-ep.webp"}
];

/* ============================================================
   ESTADO GLOBAL
============================================================ */

let seasonFilter = "all";

let items = [];
let mergeStack = null;     // Árbol de merges
let currentCompare = null; // { node, leftItem, rightItem }

let history = [];          // snapshots para deshacer
let decisionCount = 0;
let totalComparisons = 0;

const leftCard = document.getElementById("leftCard");
const rightCard = document.getElementById("rightCard");

const leftImg = document.getElementById("leftImg");
const rightImg = document.getElementById("rightImg");

const leftTitle = document.getElementById("leftTitle");
const rightTitle = document.getElementById("rightTitle");

const leftMeta = document.getElementById("leftMeta");
const rightMeta = document.getElementById("rightMeta");

const progress = document.getElementById("progress");
const compareArea = document.getElementById("compareArea");
const finalRanking = document.getElementById("finalRanking");
const rankingList = document.getElementById("rankingList");

document.getElementById("seasonFilter").addEventListener("change", e => {
  seasonFilter = e.target.value;
  start();
});

document.getElementById("undoBtn").addEventListener("click", undoGlobal);
document.getElementById("undoFinal").addEventListener("click", undoGlobal);
document.getElementById("retryBtn").addEventListener("click", start);

/* ============================================================
   UTILIDADES
============================================================ */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function nodeSize(node) {
  if (node.type === "done") return node.result.length;
  return nodeSize(node.left) + nodeSize(node.right);
}

function expectedComparisons(node) {
  if (node.type === "done") return 0;
  const leftExp = expectedComparisons(node.left);
  const rightExp = expectedComparisons(node.right);
  const leftSize = nodeSize(node.left);
  const rightSize = nodeSize(node.right);
  return leftExp + rightExp + (leftSize + rightSize - 1);
}

function updateProgress() {
  if (!totalComparisons) {
    progress.textContent = "";
  } else {
    progress.textContent = `${decisionCount} / ${totalComparisons} comparaciones`;
  }
}

function cloneState() {
  // Usamos structuredClone si está disponible, si no, fallback a JSON
  if (typeof structuredClone === "function") {
    return structuredClone({ mergeStack, currentCompare, decisionCount });
  } else {
    return JSON.parse(JSON.stringify({ mergeStack, currentCompare, decisionCount }));
  }
}

/* ============================================================
   MERGE SORT INTERACTIVO
============================================================ */

function buildMergeTree(arr) {
  if (arr.length <= 1) {
    return { type: "done", result: arr };
  }
  const mid = Math.floor(arr.length / 2);
  const left = buildMergeTree(arr.slice(0, mid));
  const right = buildMergeTree(arr.slice(mid));
  return {
    type: "merge",
    left,
    right,
    i: 0,
    j: 0,
    merged: []
  };
}

// Busca el nodo de merge actualmente activo
function getActiveNode(node) {
  if (!node) return null;
  if (node.type === "done") return null;
  // node.type === "merge"
  const leftDone = node.left.type === "done";
  const rightDone = node.right.type === "done";

  if (!leftDone) {
    return getActiveNode(node.left) || node;
  }
  if (!rightDone) {
    return getActiveNode(node.right) || node;
  }
  return node;
}

function getNodeArray(node) {
  return node.type === "done" ? node.result : null;
}

/* ============================================================
   INICIO
============================================================ */

function start() {
  items = EPISODES.filter(ep =>
    seasonFilter === "all" ? true : ep.season == seasonFilter
  );

  // mezcla el orden inicial para que las comparaciones no sean siempre con la misma base
  shuffle(items);

  mergeStack = buildMergeTree(items);
  totalComparisons = expectedComparisons(mergeStack);
  decisionCount = 0;
  history = [];
  currentCompare = null;

  compareArea.style.display = "block";
  finalRanking.style.display = "none";

  nextComparison();
}

/* ============================================================
   FLUJO DE COMPARACIONES
============================================================ */

function nextComparison() {
  const node = getActiveNode(mergeStack);

  if (!node) {
    // Ya no quedan comparaciones → ranking final
    const finalArray = (mergeStack && mergeStack.type === "done")
      ? mergeStack.result
      : items;
    finishRanking(finalArray);
    return;
  }

  const L = getNodeArray(node.left);
  const R = getNodeArray(node.right);

  // Si se agotó la izquierda, añadimos resto de derecha
  if (node.i >= L.length) {
    node.merged.push(...R.slice(node.j));
    node.type = "done";
    node.result = node.merged;
    return nextComparison();
  }

  // Si se agotó la derecha, añadimos resto de izquierda
  if (node.j >= R.length) {
    node.merged.push(...L.slice(node.i));
    node.type = "done";
    node.result = node.merged;
    return nextComparison();
  }

  // Hay que comparar L[i] vs R[j]
  currentCompare = {
    node,
    leftItem: L[node.i],
    rightItem: R[node.j]
  };

  renderComparison();
}

/* ============================================================
   ELECCIÓN Y DESHACER
============================================================ */

function choose(side) {
  if (!currentCompare) return;

  // Guardamos snapshot ANTES de aplicar la elección
  history.push(cloneState());
  decisionCount++;

  const { node, leftItem, rightItem } = currentCompare;

  const winner = (side === "left") ? leftItem : rightItem;
  const loser  = (side === "left") ? rightItem : leftItem;

  if (!node.merged) node.merged = [];
  node.merged.push(winner);

  if (side === "left") {
    node.i++;
  } else {
    node.j++;
  }

  currentCompare = null;
  updateProgress();
  nextComparison();
}

function undoGlobal() {
  if (history.length === 0) return;

  const snap = history.pop();
  mergeStack = snap.mergeStack;
  currentCompare = snap.currentCompare;
  decisionCount = snap.decisionCount;

  compareArea.style.display = "block";
  finalRanking.style.display = "none";

  if (currentCompare) {
    renderComparison();
  } else {
    nextComparison();
  }
  updateProgress();
}

/* ============================================================
   RENDER
============================================================ */

function renderComparison() {
  const { leftItem, rightItem } = currentCompare;

  leftImg.src = leftItem.img;
  leftTitle.textContent = leftItem.title;
  leftMeta.textContent = `T${leftItem.season} · E${leftItem.number}`;

  rightImg.src = rightItem.img;
  rightTitle.textContent = rightItem.title;
  rightMeta.textContent = `T${rightItem.season} · E${rightItem.number}`;

  leftCard.onclick = () => choose("left");
  rightCard.onclick = () => choose("right");

  updateProgress();
}

/* ============================================================
   RANKING FINAL
============================================================ */

function finishRanking(arr) {
  compareArea.style.display = "none";
  finalRanking.style.display = "block";

  rankingList.innerHTML = "";
  arr.forEach((ep, i) => {
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${ep.title} (T${ep.season}E${ep.number})`;
    rankingList.appendChild(li);
  });

  updateProgress();
}

/* ============================================================
   ARRANQUE
============================================================ */

start();

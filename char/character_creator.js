// 全局状态
let races = [];
let occupations = [];
let rolledAbilities = []; // [15, 13, 12, ...]
let assigned = [null, null, null, null, null, null]; // 每个属性槽的值
let racialBonusApplied = false;

const abilityNames = ['力量', '敏捷', '体质', '智力', '感知', '魅力'];

// ------------------ 初始化 ------------------
window.onload = async () => {
  await loadRacesAndOccupations();
};

async function loadRacesAndOccupations() {
  try {
    const [raceRes, occRes] = await Promise.all([
      fetch('race.txt'),
      fetch('occ.txt')
    ]);
    const raceText = await raceRes.text();
    const occText = await occRes.text();

    races = raceText.trim().split('\n').map(line => {
      const [name, size, speed] = line.split(' ');
      return new Race(name, size, speed);
    });

    occupations = occText.trim().split('\n').map(line => {
      const [name, hp] = line.split(' ');
      return new Occupation(name, hp);
    });

    populateSelects();
  } catch (err) {
    alert('❌ 无法加载 race.txt 或 occ.txt 文件！');
    console.error(err);
  }
}

function populateSelects() {
  const raceSel = document.getElementById('raceSelect');
  const occSel = document.getElementById('occSelect');
  raceSel.innerHTML = '';
  occSel.innerHTML = '';

  races.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.name;
    opt.textContent = r.name;
    raceSel.appendChild(opt);
  });

  occupations.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.name;
    opt.textContent = o.name;
    occSel.appendChild(opt);
  });
}

// ------------------ 掷骰 ------------------
function roll4d6DropLowest() {
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  return rolls.sort((a, b) => a - b).slice(1).reduce((a, b) => a + b, 0);
}

function rollAbilities() {
  rolledAbilities = Array.from({ length: 6 }, roll4d6DropLowest);
  renderRolledAbilities();
  document.getElementById('abilitiesSection').style.display = 'block';
  assigned = [null, null, null, null, null, null];
  racialBonusApplied = false;
  updateAssignUI();
}

function renderRolledAbilities() {
  const container = document.getElementById('rolledContainer');
  container.innerHTML = '';
  rolledAbilities.forEach(val => {
    const token = document.createElement('div');
    token.className = 'ability-token';
    token.textContent = val;
    token.draggable = true;

    token.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', val);
      token.classList.add('dragging');
    });
    token.addEventListener('dragend', () => {
      token.classList.remove('dragging');
    });

    container.appendChild(token);
  });
}

// ------------------ 拖拽分配 ------------------
function setupDropZones() {
  const slots = document.querySelectorAll('.ability-slot');
  slots.forEach((slot, idx) => {
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      const value = e.dataTransfer.getData('text/plain');
      if (!value) return;

      // 检查是否已使用
      if (rolledAbilities.filter(v => v == value).length <= 
          assigned.filter(v => v == value).length) {
        alert('该数值已被使用！');
        return;
      }

      // 清除其他槽中相同值（防重复）
      for (let i = 0; i < 6; i++) {
        if (assigned[i] == value) assigned[i] = null;
      }

      assigned[idx] = parseInt(value);
      updateAssignUI();
    });
  });
}

// ------------------ UI 更新 ------------------
function updateAssignUI() {
  for (let i = 0; i < 6; i++) {
    const slot = document.getElementById(`slot-${i}`);
    const valueEl = slot.querySelector('.value');
    const modEl = slot.querySelector('.modifier');
    const btn = slot.querySelector('button');

    if (assigned[i] !== null) {
      valueEl.textContent = assigned[i];
      modEl.textContent = formatModifier(calcModifier(assigned[i]));
      slot.classList.add('filled');
    } else {
      valueEl.textContent = '?';
      modEl.textContent = '';
      slot.classList.remove('filled');
    }

    // 按钮状态
    const raceName = document.getElementById('raceSelect').value;
    const isHuman = raceName === '人类';
    if (racialBonusApplied || !assigned[i]) {
      btn.disabled = true;
    } else {
      btn.disabled = false;
    }
  }
}

function formatModifier(mod) {
  return mod >= 0 ? `(+${mod})` : `(${mod})`;
}

function calcModifier(score) {
  if (score >= 10) return Math.floor((score - 10) / 2);
  else return -Math.ceil((10 - score) / 2);
}

// ------------------ 种族加值 ------------------
function applyRacialBonus() {
  const raceName = document.getElementById('raceSelect').value;
  const race = races.find(r => r.name === raceName);
  if (!race) {
    alert('请选择有效种族！');
    return;
  }

  if (assigned.some(v => v === null)) {
    alert('请先完成所有属性分配！');
    return;
  }

  const isHuman = race.name === '人类';

  if (is-human) {
    for (let i = 0; i < 6; i++) {
      assigned[i] += 1;
    }
  } else {
    const plus2Idx = prompt(`请选择要+2的属性（0-5）:\n0=力量,1=敏捷,2=体质,3=智力,4=感知,5=魅力`);
    const plus1Idx = prompt(`请选择要+1的属性（0-5，不能与+2相同）`);

    if (plus2Idx === null || plus1Idx === null) return;

    const p2 = parseInt(plus2Idx);
    const p1 = parseInt(plus1Idx);

    if (isNaN(p2) || isNaN(p1) || p2 < 0 || p2 > 5 || p1 < 0 || p1 > 5 || p2 === p1) {
      alert('输入无效！');
      return;
    }

    assigned[p2] += 2;
    assigned[p1] += 1;
  }

  racialBonusApplied = true;
  updateAssignUI();
  alert('✅ 种族加值已应用！');
}

// ------------------ 生成角色 ------------------
function generateCharacter() {
  // 验证
  if (assigned.some(v => v === null)) {
    alert('请完成属性分配！');
    return;
  }
  if (!racialBonusApplied) {
    alert('请先应用种族加值！');
    return;
  }

  const name = document.getElementById('charName').value.trim();
  const playerName = document.getElementById('playerName').value.trim();
  const raceName = document.getElementById('raceSelect').value;
  const occName = document.getElementById('occSelect').value;
  const level = parseInt(document.getElementById('levelSelect').value);

  if (!name || !playerName) {
    alert('请输入角色名和玩家名！');
    return;
  }

  const race = races.find(r => r.name === raceName);
  const occ = occupations.find(o => o.name === occName);

  if (!race || !occ) {
    alert('种族或职业无效！');
    return;
  }

  const char = new Character(name, playerName, race, occ, level, assigned);

  // 显示结果
  const resultDiv = document.getElementById('result');
  const jsonStr = JSON.stringify(char, null, 2);
  document.getElementById('resultJson').textContent = jsonStr;
  resultDiv.style.display = 'block';

  // 滚动到结果
  resultDiv.scrollIntoView({ behavior: 'smooth' });
}

// ------------------ 导出 ------------------
function exportCharacter() {
  const json = document.getElementById('resultJson').textContent;
  if (!json) return;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${document.getElementById('charName').value || 'character'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ------------------ 类定义 ------------------
class Race {
  constructor(name, size, speed) {
    this.name = name;
    this.size = size;
    this.speed = parseInt(speed);
  }
}

class Occupation {
  constructor(name, hpPerLevel) {
    this.name = name;
    this.hpPerLevel = parseInt(hpPerLevel);
  }
}

class Character {
  constructor(name, playerName, race, occupation, level, abilityScores) {
    this.name = name;
    this.playerName = playerName;
    this.race = race.name;
    this.occupation = occupation.name;
    this.level = level;
    this.abilityScores = {
      力量: abilityScores[0],
      敏捷: abilityScores[1],
      体质: abilityScores[2],
      智力: abilityScores[3],
      感知: abilityScores[4],
      魅力: abilityScores[5]
    };
    this.abilityModifiers = {};
    for (const [key, val] of Object.entries(this.abilityScores)) {
      this.abilityModifiers[key] = this.calcModifier(val);
    }
    this.size = race.size;
    this.speed = race.speed;
    this.maxHP = occupation.hpPerLevel * level;
    this.currentHP = this.maxHP;
    this.tempHP = 0;
  }

  calcModifier(score) {
    if (score >= 10) return Math.floor((score - 10) / 2);
    else return -Math.ceil((10 - score) / 2);
  }
}

// 初始化拖拽区域（在 DOM 加载后）
document.addEventListener('DOMContentLoaded', () => {
  setupDropZones();
});
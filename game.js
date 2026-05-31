const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const healthFillP1 = document.getElementById("healthP1");
const healthFillP2 = document.getElementById("healthP2");
const healthTextP1 = document.getElementById("healthTextP1");
const healthTextP2 = document.getElementById("healthTextP2");
const turnLabel = document.getElementById("turnLabel");
const message = document.getElementById("message");
const powerFill = document.getElementById("powerFill");
const powerText = document.getElementById("powerText");
const resetButton = document.getElementById("resetButton");
const levelButton = document.getElementById("levelButton");
const levelLabel = document.getElementById("levelLabel");

const groundY = 530;
const gravity = 820;
const maxPower = 1;
const minShotSpeed = 260;
const maxShotSpeed = 850;
const wall = {
  x: 530,
  y: 150,
  width: 60,
  height: 200,
  minY: 80,
  maxY: 255,
  speed: 125,
  direction: 1,
};
const platforms = [
  {
    x: 88,
    y: groundY,
    width: 150,
    height: 18,
    minY: 315,
    maxY: groundY,
    speed: 92,
    direction: -1,
    color: "#387cc4",
  },
  {
    x: 888,
    y: groundY,
    width: 150,
    height: 18,
    minY: 315,
    maxY: groundY,
    speed: 92,
    direction: 1,
    color: "#c46a38",
  },
];

const players = [
  {
    name: "Josue",
    x: 160,
    y: groundY,
    facing: 1,
    color: "#56a5ff",
    health: 120,
  },
  {
    name: "Adriel",
    x: 960,
    y: groundY,
    facing: -1,
    color: "#ff9856",
    health: 150,
  },
];

let turn = 0;
let mouse = { x: 260, y: 340 };
let isCharging = false;
let chargePower = 0;
let chargeDirection = 1;
let arrow = null;
let gameOver = false;
let lastTime = performance.now();
let level = 1;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function getAim(player) {
  const origin = getBowPosition(player);
  const dx = mouse.x - origin.x;
  const dy = mouse.y - origin.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function getBowPosition(player) {
  return {
    x: player.x + player.facing * 23,
    y: player.y - 82,
  };
}

function getLevelName() {
  if (level === 3) return "Nivel 3: plataformas moviles";
  if (level === 2) return "Nivel 2: pared movil";
  return "Nivel 1: duelo libre";
}

function updateUi() {
  const hp1 = clamp(players[0].health, 0, 100);
  const hp2 = clamp(players[1].health, 0, 100);
  healthFillP1.style.width = `${hp1}%`;
  healthFillP2.style.width = `${hp2}%`;
  healthTextP1.textContent = hp1;
  healthTextP2.textContent = hp2;
  healthFillP1.style.background = healthColor(hp1);
  healthFillP2.style.background = healthColor(hp2);
  powerFill.style.width = `${Math.round(chargePower * 100)}%`;
  powerText.textContent = `${Math.round(chargePower * 100)}%`;
  turnLabel.textContent = gameOver ? "Partida terminada" : `Turno: ${players[turn].name}`;
  levelLabel.textContent = getLevelName();

  if (level === 1 && !gameOver) {
    levelButton.textContent = "Nivel 2 bloqueado";
    levelButton.disabled = true;
  } else if (level === 1 && gameOver) {
    levelButton.textContent = "Avanzar al nivel 2";
    levelButton.disabled = false;
  } else if (level === 2 && !gameOver) {
    levelButton.textContent = "Nivel 3 bloqueado";
    levelButton.disabled = true;
  } else if (level === 2 && gameOver) {
    levelButton.textContent = "Avanzar al nivel 3";
    levelButton.disabled = false;
  } else {
    levelButton.textContent = "Volver al nivel 1";
    levelButton.disabled = false;
  }
}

function healthColor(health) {
  if (health <= 30) return "linear-gradient(90deg, #f05f5f, #ff9856)";
  if (health <= 60) return "linear-gradient(90deg, #f1c94c, #ff9856)";
  return "linear-gradient(90deg, #3bd17f, #98f06a)";
}

function startCharge() {
  if (gameOver || arrow) return;
  isCharging = true;
  chargePower = 0;
  chargeDirection = 1;
  message.textContent = "Cargando tiro...";
}

function releaseShot() {
  if (!isCharging || gameOver || arrow) return;
  const shooter = players[turn];
  const bow = getBowPosition(shooter);
  const aim = getAim(shooter);
  const speed = minShotSpeed + chargePower * (maxShotSpeed - minShotSpeed);
  arrow = {
    x: bow.x,
    y: bow.y,
    vx: aim.x * speed,
    vy: aim.y * speed,
    angle: Math.atan2(aim.y, aim.x),
    shooter: turn,
  };
  isCharging = false;
  message.textContent = "Flecha en vuelo...";
}

function nextTurn() {
  chargePower = 0;
  turn = turn === 0 ? 1 : 0;
  const active = players[turn];
  mouse = { x: active.x + active.facing * 130, y: active.y - 120 };
  message.textContent = "Apunta con el mouse. Mantené click para cargar y soltá para disparar.";
}

function applyDamage(target, zone) {
  const damageByZone = { foot: 20, body: 40, head: 80 };
  const labelByZone = { foot: "pie", body: "cuerpo", head: "cabeza" };
  const damage = damageByZone[zone];
  target.health = clamp(target.health - damage, 0, 100);
  message.textContent = `${target.name} recibió un flechazo en ${labelByZone[zone]}: -${damage}.`;
  if (target.health <= 0) {
    gameOver = true;
    if (level === 1) {
      message.textContent = `${players[turn].name} ganó. Ahora podés avanzar al nivel 2.`;
    } else if (level === 2) {
      message.textContent = `${players[turn].name} ganó. Ahora podés avanzar al nivel 3.`;
    } else {
      message.textContent = `${players[turn].name} ganó el nivel 3.`;
    }
  }
}

function detectHit(target, point) {
  const localX = Math.abs(point.x - target.x);
  const top = target.y - 150;
  const headBottom = target.y - 108;
  const bodyBottom = target.y - 36;
  const footBottom = target.y + 6;

  if (localX <= 21 && point.y >= top && point.y <= headBottom) return "head";
  if (localX <= 28 && point.y > headBottom && point.y <= bodyBottom) return "body";
  if (localX <= 34 && point.y > bodyBottom && point.y <= footBottom) return "foot";
  return null;
}

function updateWall(delta) {
  if (level !== 2 || gameOver) return;
  wall.y += wall.direction * wall.speed * delta;
  if (wall.y >= wall.maxY) {
    wall.y = wall.maxY;
    wall.direction = -1;
  } else if (wall.y <= wall.minY) {
    wall.y = wall.minY;
    wall.direction = 1;
  }
}

function resetPlatforms() {
  platforms[0].y = groundY;
  platforms[0].direction = -1;
  platforms[1].y = groundY;
  platforms[1].direction = 1;
  players[0].y = groundY;
  players[1].y = groundY;
}

function updatePlatforms(delta) {
  if (level !== 3) {
    players[0].y = groundY;
    players[1].y = groundY;
    return;
  }

  platforms.forEach((platform, index) => {
    platform.y += platform.direction * platform.speed * delta;
    if (platform.y <= platform.minY) {
      platform.y = platform.minY;
      platform.direction = 1;
    } else if (platform.y >= platform.maxY) {
      platform.y = platform.maxY;
      platform.direction = -1;
    }
    players[index].y = platform.y;
  });
}

function getWallRect() {
  return {
    left: wall.x,
    right: wall.x + wall.width,
    top: wall.y,
    bottom: wall.y + wall.height,
  };
}

function pointInsideRect(point, rect) {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

function segmentHitsWall(from, to) {
  if (level !== 2) return false;
  const rect = getWallRect();
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const point = {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    };
    if (pointInsideRect(point, rect)) return true;
  }
  return false;
}

function update(delta) {
  updateWall(delta);
  updatePlatforms(delta);

  if (isCharging) {
    chargePower += chargeDirection * delta * 1.45;
    if (chargePower >= maxPower) {
      chargePower = maxPower;
      chargeDirection = -1;
    } else if (chargePower <= 0) {
      chargePower = 0;
      chargeDirection = 1;
    }
  }

  if (!arrow) return;

  const previousArrow = { x: arrow.x, y: arrow.y };
  arrow.vy += gravity * delta;
  arrow.x += arrow.vx * delta;
  arrow.y += arrow.vy * delta;
  arrow.angle = Math.atan2(arrow.vy, arrow.vx);

  if (segmentHitsWall(previousArrow, arrow)) {
    arrow = null;
    message.textContent = "La flecha chocó contra la pared del nivel 2.";
    setTimeout(nextTurn, 700);
    return;
  }

  const target = players[arrow.shooter === 0 ? 1 : 0];
  const zone = detectHit(target, arrow);
  if (zone) {
    applyDamage(target, zone);
    arrow = null;
    if (!gameOver) setTimeout(nextTurn, 850);
    return;
  }

  if (arrow.y >= groundY || arrow.x < -80 || arrow.x > canvas.width + 80 || arrow.y > canvas.height + 80) {
    arrow = null;
    message.textContent = "La flecha cayó sin impactar.";
    setTimeout(nextTurn, 700);
  }
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1a2b3e");
  gradient.addColorStop(0.62, "#20384b");
  gradient.addColorStop(1, "#162129");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(885, 88, 34, 0, Math.PI * 2);
  ctx.fill();

  drawHills();
}

function drawHills() {
  ctx.fillStyle = "#263f35";
  ctx.beginPath();
  ctx.moveTo(0, groundY - 80);
  ctx.quadraticCurveTo(190, 380, 390, groundY - 58);
  ctx.quadraticCurveTo(610, 452, 780, groundY - 88);
  ctx.quadraticCurveTo(945, 404, canvas.width, groundY - 65);
  ctx.lineTo(canvas.width, groundY);
  ctx.lineTo(0, groundY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#304f39";
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  ctx.fillStyle = "#233729";
  ctx.fillRect(0, groundY + 16, canvas.width, canvas.height - groundY - 16);
}

function drawWall() {
  if (level !== 2) return;
  const rect = getWallRect();

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fillRect(rect.left + 8, rect.top + 8, wall.width, wall.height);

  const gradient = ctx.createLinearGradient(rect.left, rect.top, rect.right, rect.top);
  gradient.addColorStop(0, "#6b737d");
  gradient.addColorStop(0.5, "#d5dde5");
  gradient.addColorStop(1, "#535c66");
  ctx.fillStyle = gradient;
  ctx.fillRect(rect.left, rect.top, wall.width, wall.height);

  ctx.strokeStyle = "#f1c94c";
  ctx.lineWidth = 5;
  ctx.strokeRect(rect.left, rect.top, wall.width, wall.height);

  ctx.strokeStyle = "rgba(20,25,30,0.45)";
  ctx.lineWidth = 2;
  for (let y = rect.top + 24; y < rect.bottom; y += 34) {
    ctx.beginPath();
    ctx.moveTo(rect.left + 8, y);
    ctx.lineTo(rect.right - 8, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "800 18px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PARED", rect.left + wall.width / 2, rect.top - 12);
  ctx.restore();
}

function drawPlatforms() {
  if (level !== 3) return;

  platforms.forEach((platform) => {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(platform.x + 8, platform.y + 14, platform.width, platform.height + 14);
    ctx.fillStyle = platform.color;
    ctx.fillRect(platform.x, platform.y + 6, platform.width, platform.height);
    ctx.strokeStyle = "#f1c94c";
    ctx.lineWidth = 4;
    ctx.strokeRect(platform.x, platform.y + 6, platform.width, platform.height);
    ctx.strokeStyle = "rgba(255,255,255,0.36)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(platform.x + 14, platform.minY - 22);
    ctx.lineTo(platform.x + 14, platform.maxY + 32);
    ctx.moveTo(platform.x + platform.width - 14, platform.minY - 22);
    ctx.lineTo(platform.x + platform.width - 14, platform.maxY + 32);
    ctx.stroke();
    ctx.restore();
  });
}

function drawPlayer(player, isActive) {
  const bow = getBowPosition(player);
  const aim = player === players[turn] ? getAim(player) : { x: player.facing, y: -0.15 };
  const armEnd = { x: bow.x + aim.x * 30, y: bow.y + aim.y * 30 };

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = isActive ? "#f1c94c" : "rgba(255,255,255,0.28)";
  ctx.lineWidth = isActive ? 4 : 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y - 72, 52, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#161b20";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 104);
  ctx.lineTo(player.x, player.y - 44);
  ctx.moveTo(player.x, player.y - 48);
  ctx.lineTo(player.x - 22, player.y - 4);
  ctx.moveTo(player.x, player.y - 48);
  ctx.lineTo(player.x + 22, player.y - 4);
  ctx.stroke();

  ctx.strokeStyle = player.color;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 92);
  ctx.lineTo(armEnd.x, armEnd.y);
  ctx.moveTo(player.x, player.y - 88);
  ctx.lineTo(player.x - player.facing * 18, player.y - 68);
  ctx.stroke();

  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y - 128, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#101317";
  ctx.beginPath();
  ctx.arc(player.x + player.facing * 8, player.y - 132, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7b5030";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(bow.x + player.facing * 8, bow.y, 32, -Math.PI / 2, Math.PI / 2, player.facing < 0);
  ctx.stroke();
  ctx.strokeStyle = "#e7d7b6";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bow.x + player.facing * 8, bow.y - 32);
  ctx.lineTo(bow.x - aim.x * (isCharging && isActive ? 18 * chargePower : 0), bow.y - aim.y * (isCharging && isActive ? 18 * chargePower : 0));
  ctx.lineTo(bow.x + player.facing * 8, bow.y + 32);
  ctx.stroke();

  if (isActive && !arrow && !gameOver) {
    drawAimGuide(bow, aim);
  }

  ctx.restore();
}

function drawAimGuide(origin, aim) {
  const speed = minShotSpeed + chargePower * (maxShotSpeed - minShotSpeed);
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  for (let i = 1; i <= 8; i++) {
    const t = i * 0.13;
    const x = origin.x + aim.x * speed * t;
    const y = origin.y + aim.y * speed * t + 0.5 * gravity * t * t;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawArrow() {
  if (!arrow) return;
  ctx.save();
  ctx.translate(arrow.x, arrow.y);
  ctx.rotate(arrow.angle);
  ctx.strokeStyle = "#e7d7b6";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.lineTo(22, 0);
  ctx.stroke();
  ctx.fillStyle = "#dfe9f3";
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(14, -6);
  ctx.lineTo(17, 0);
  ctx.lineTo(14, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#56a5ff";
  ctx.beginPath();
  ctx.moveTo(-24, 0);
  ctx.lineTo(-36, -7);
  ctx.lineTo(-31, 0);
  ctx.lineTo(-36, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHitZones() {
  const target = players[turn === 0 ? 1 : 0];
  if (arrow || gameOver) return;
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = "#f05f5f";
  ctx.fillRect(target.x - 21, target.y - 150, 42, 42);
  ctx.fillStyle = "#f1c94c";
  ctx.fillRect(target.x - 28, target.y - 108, 56, 72);
  ctx.fillStyle = "#56a5ff";
  ctx.fillRect(target.x - 34, target.y - 36, 68, 42);
  ctx.restore();
}

function draw() {
  drawSky();
  drawWall();
  drawPlatforms();
  drawHitZones();
  drawPlayer(players[0], turn === 0);
  drawPlayer(players[1], turn === 1);
  drawArrow();

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 54px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${players[turn].name} gana`, canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "600 22px Segoe UI, sans-serif";
    const nextText = level === 1 ? "Tocá Avanzar al nivel 2" : level === 2 ? "Tocá Avanzar al nivel 3" : "Tocá Reiniciar para jugar otra vez";
    ctx.fillText(nextText, canvas.width / 2, canvas.height / 2 + 34);
  }
}

function loop(time) {
  const delta = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  update(delta);
  updateUi();
  draw();
  requestAnimationFrame(loop);
}

function resetGame() {
  players[0].health = 100;
  players[1].health = 100;
  turn = 0;
  mouse = { x: 300, y: 350 };
  isCharging = false;
  chargePower = 0;
  chargeDirection = 1;
  arrow = null;
  gameOver = false;
  wall.y = 150;
  wall.direction = 1;
  resetPlatforms();
  message.textContent = level === 3
    ? "Nivel 3: las plataformas suben y bajan. La flecha sale desde tu arco actual."
    : level === 2
      ? "Nivel 2: la pared móvil bloquea las flechas."
      : "Apunta con el mouse. Mantené click para cargar y soltá para disparar.";
  updateUi();
}

function changeLevel() {
  if (level < 3 && !gameOver) return;
  if (level === 1) {
    level = 2;
  } else if (level === 2) {
    level = 3;
  } else {
    level = 1;
  }
  resetGame();
}

canvas.addEventListener("mousemove", (event) => {
  mouse = getCanvasPoint(event);
});

canvas.addEventListener("mousedown", (event) => {
  if (event.button === 0) startCharge();
});

window.addEventListener("mouseup", releaseShot);

canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  mouse = getCanvasPoint(event.touches[0]);
  startCharge();
});

canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  mouse = getCanvasPoint(event.touches[0]);
});

canvas.addEventListener("touchend", (event) => {
  event.preventDefault();
  releaseShot();
});

resetButton.addEventListener("click", resetGame);
levelButton.addEventListener("click", changeLevel);

resetGame();
requestAnimationFrame(loop);

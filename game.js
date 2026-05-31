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

const groundY = 530;
const gravity = 820;
const maxPower = 1;
const minShotSpeed = 260;
const maxShotSpeed = 850;

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
    name: "Pauli",
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
    settled: false,
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
    message.textContent = `${players[turn].name} ganó la partida.`;
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

function update(delta) {
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

  arrow.vy += gravity * delta;
  arrow.x += arrow.vx * delta;
  arrow.y += arrow.vy * delta;
  arrow.angle = Math.atan2(arrow.vy, arrow.vx);

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
    ctx.fillText("Tocá Reiniciar para jugar otra vez", canvas.width / 2, canvas.height / 2 + 34);
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
  message.textContent = "Apunta con el mouse. Mantené click para cargar y soltá para disparar.";
  updateUi();
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

resetGame();
requestAnimationFrame(loop);

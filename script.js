const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const DIFF_CONFIG = {
  easy: { ai: 2.2, gk: 2.1, shot: 8.5 },
  normal: { ai: 3.3, gk: 3.4, shot: 11.5 },
  hard: { ai: 4.4, gk: 4.6, shot: 14.5 }
};

let diff = "normal";
let playerCount = 6;
let matchSeconds = 90;

let isPlaying = false;
let isGoalPause = false;
let blueScore = 0;
let redScore = 0;
let timeLeft = 90;
let clockInterval = null;
let animFrame = null;
let shakeCount = 0;

const ball = { x: 500, y: 300, vx: 0, vy: 0, r: 13, angle: 0 };
let blueTeam = [];
let redTeam = [];
let activeIdx = 0;

const keys = {};
const stick = { x: 0, y: 0 };
let sprintOn = false;
let chargeOn = false;
let chargeVal = 0;

function formatTime(sec) {
  const s = Math.max(0, sec);
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
}

function setupTeams() {
  const cfg = DIFF_CONFIG[diff];
  const fieldPerTeam = Math.max(1, playerCount / 2 - 1);
  const blueSpots = [
    { x: 360, y: 300, num: "10" },
    { x: 330, y: 185, num: "7" },
    { x: 330, y: 415, num: "8" }
  ];
  const redSpots = [
    { x: 640, y: 300, num: "9" },
    { x: 670, y: 185, num: "11" },
    { x: 670, y: 415, num: "6" }
  ];
  const skins = ["#f1c27d", "#8d5524", "#e0ac69"];
  const hairs = ["#212121", "#111111", "#4e342e"];

  blueTeam = [];
  redTeam = [];

  for (let i = 0; i < fieldPerTeam; i++) {
    blueTeam.push({
      x: blueSpots[i].x, y: blueSpots[i].y, r: 19, spd: 4.2, role: "field",
      num: blueSpots[i].num, hx: blueSpots[i].x, hy: blueSpots[i].y,
      dir: 0, step: i, skin: skins[i], hair: hairs[i]
    });
    redTeam.push({
      x: redSpots[i].x, y: redSpots[i].y, r: 19, spd: cfg.ai, role: "field",
      num: redSpots[i].num, hx: redSpots[i].x, hy: redSpots[i].y,
      dir: Math.PI, step: i, skin: skins[(i + 1) % 3], hair: hairs[(i + 2) % 3]
    });
  }

  blueTeam.push({
    x: 85, y: 300, r: 20, spd: 3.5, role: "gk",
    num: "1", hx: 85, hy: 300, dir: 0, step: 0, skin: "#e0ac69", hair: "#4e342e"
  });

  redTeam.push({
    x: 915, y: 300, r: 20, spd: cfg.gk, role: "gk",
    num: "1", hx: 915, hy: 300, dir: Math.PI, step: 0, skin: "#f1c27d", hair: "#5d4037"
  });

  activeIdx = 0;
}

function resetPositions() {
  ball.x = 500;
  ball.y = 300;
  ball.vx = 0;
  ball.vy = 0;
  setupTeams();
}

function stopMatchLoops() {
  isPlaying = false;
  isGoalPause = false;
  sprintOn = false;
  chargeOn = false;
  chargeVal = 0;
  clearInterval(clockInterval);
  cancelAnimationFrame(animFrame);
}

function startMatch() {
  stopMatchLoops();
  blueScore = 0;
  redScore = 0;
  timeLeft = matchSeconds;

  document.getElementById("scoreBlue").textContent = "0";
  document.getElementById("scoreRed").textContent = "0";
  document.getElementById("timerText").textContent = formatTime(timeLeft);
  document.getElementById("metaText").textContent = `${diff.toUpperCase()} • ${playerCount}P`;

  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById("goalBanner").classList.remove("show");

  resetPositions();
  isPlaying = true;

  clockInterval = setInterval(() => {
    if (!isPlaying || isGoalPause) return;
    timeLeft--;
    document.getElementById("timerText").textContent = formatTime(timeLeft);
    if (timeLeft <= 0) finishMatch();
  }, 1000);

  animFrame = requestAnimationFrame(gameLoop);
}

function finishMatch() {
  stopMatchLoops();
  const text = `النتيجة النهائية: ${blueScore} - ${redScore}`;
  if (blueScore >= redScore) {
    document.getElementById("winSummary").textContent = text;
    document.getElementById("winScreen").classList.add("active");
  } else {
    document.getElementById("loseSummary").textContent = text;
    document.getElementById("loseScreen").classList.add("active");
  }
}

function showStartScreen() {
  stopMatchLoops();
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  resetPositions();
  drawField();
  document.getElementById("startScreen").classList.add("active");
}

function attachGroup(groupId, onSelect) {
  const buttons = document.querySelectorAll(`#${groupId} button`);
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      onSelect(btn.dataset.val);
    });
  });
}

attachGroup("diffOpts", (v) => { diff = v; });
attachGroup("countOpts", (v) => { playerCount = Number(v); setupTeams(); drawField(); });
attachGroup("timeOpts", (v) => { matchSeconds = Number(v); document.getElementById("timerText").textContent = formatTime(matchSeconds); });

document.getElementById("btnStart").addEventListener("click", startMatch);
document.getElementById("btnAgainWin").addEventListener("click", showStartScreen);
document.getElementById("btnAgainLose").addEventListener("click", showStartScreen);

function switchActive() {
  const fields = blueTeam.map((p, i) => (p.role === "field" ? i : -1)).filter((i) => i !== -1);
  if (fields.length > 1) {
    activeIdx = fields[(fields.indexOf(activeIdx) + 1) % fields.length];
  }
}

function passBall() {
  const passer = blueTeam[activeIdx];
  const mates = blueTeam.map((m, i) => (m.role === "field" && i !== activeIdx ? i : -1)).filter((i) => i !== -1);
  if (!mates.length) return;

  let targetIdx = mates[0];
  let bestDist = Infinity;
  mates.forEach((i) => {
    const d = Math.hypot(blueTeam[i].x - passer.x, blueTeam[i].y - passer.y);
    if (d < bestDist) {
      bestDist = d;
      targetIdx = i;
    }
  });

  if (Math.hypot(ball.x - passer.x, ball.y - passer.y) <= passer.r + ball.r + 26) {
    const mate = blueTeam[targetIdx];
    const ang = Math.atan2(mate.y - ball.y, mate.x - ball.x);
    passer.dir = ang;
    passer.step += 1.2;
    ball.vx = Math.cos(ang) * 9.5;
    ball.vy = Math.sin(ang) * 9.5;
    activeIdx = targetIdx;
  }
}

function shootBall() {
  const shooter = blueTeam[activeIdx];
  if (Math.hypot(ball.x - shooter.x, ball.y - shooter.y) <= shooter.r + ball.r + 26) {
    const ang = Math.atan2(ball.y - shooter.y, ball.x - shooter.x);
    const power = 9.5 + chargeVal * 8.5;
    shooter.dir = ang;
    shooter.step += 1.4;
    ball.vx = Math.cos(ang) * power;
    ball.vy = Math.sin(ang) * power;
  }
  chargeOn = false;
  chargeVal = 0;
}

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (!isPlaying || isGoalPause) return;
  if (e.code === "Space") chargeOn = true;
  if (e.code === "KeyQ") switchActive();
  if (e.code === "KeyE") passBall();
  if (e.code === "KeyF") sprintOn = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
  if (e.code === "Space" && chargeOn && isPlaying && !isGoalPause) shootBall();
  if (e.code === "KeyF") sprintOn = false;
});

const stickBox = document.getElementById("stickBox");
const stickKnob = document.getElementById("stickKnob");
let activeTouchId = null;

function applyStick(touch) {
  const rect = stickBox.getBoundingClientRect();
  let dx = touch.clientX - (rect.left + rect.width / 2);
  let dy = touch.clientY - (rect.top + rect.height / 2);
  const dist = Math.hypot(dx, dy);
  if (dist > 34) {
    dx = (dx / dist) * 34;
    dy = (dy / dist) * 34;
  }
  stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  stick.x = dx / 34;
  stick.y = dy / 34;
}

stickBox.addEventListener("touchstart", (e) => {
  e.preventDefault();
  activeTouchId = e.changedTouches[0].identifier;
  applyStick(e.changedTouches[0]);
}, { passive: false });

stickBox.addEventListener("touchmove", (e) => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === activeTouchId) applyStick(t);
  }
}, { passive: false });

stickBox.addEventListener("touchend", (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === activeTouchId) {
      activeTouchId = null;
      stick.x = 0;
      stick.y = 0;
      stickKnob.style.transform = "translate(0px, 0px)";
    }
  }
});

function bindTouchAction(id, onPress, onRelease) {
  const el = document.getElementById(id);
  el.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (isPlaying && !isGoalPause && onPress) onPress();
  }, { passive: false });
  el.addEventListener("touchend", (e) => {
    e.preventDefault();
    if (onRelease) onRelease();
  }, { passive: false });
}

bindTouchAction("btnShoot", () => { chargeOn = true; }, () => { if (chargeOn && isPlaying && !isGoalPause) shootBall(); });
bindTouchAction("btnPass", passBall);
bindTouchAction("btnSprint", () => { sprintOn = true; }, () => { sprintOn = false; });
bindTouchAction("btnSwitch", switchActive);

function steerEntity(ent, tx, ty, speed) {
  const dx = tx - ent.x;
  const dy = ty - ent.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 3) {
    ent.x += (dx / dist) * speed;
    ent.y += (dy / dist) * speed;
    ent.dir = Math.atan2(dy, dx);
    ent.step += 0.22;
  }
}

function handleGoal(side) {
  if (isGoalPause) return;
  isGoalPause = true;
  shakeCount = 15;

  if (side === "blue") {
    blueScore++;
    document.getElementById("scoreBlue").textContent = String(blueScore);
  } else {
    redScore++;
    document.getElementById("scoreRed").textContent = String(redScore);
  }

  const banner = document.getElementById("goalBanner");
  banner.classList.add("show");

  setTimeout(() => {
    banner.classList.remove("show");
    resetPositions();
    isGoalPause = false;
  }, 1300);
}

function stepGame() {
  if (isGoalPause) return;
  if (chargeOn && chargeVal < 1) chargeVal += 0.045;

  const p1 = blueTeam[activeIdx];
  const speed = sprintOn ? p1.spd * 1.42 : p1.spd;
  let mx = stick.x + (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  let my = stick.y + (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
  const mag = Math.hypot(mx, my);

  if (mag > 0.1) {
    const scale = mag > 1 ? 1 / mag : 1;
    p1.x += mx * scale * speed;
    p1.y += my * scale * speed;
    p1.dir = Math.atan2(my, mx);
    p1.step += sprintOn ? 0.4 : 0.27;
  }

  blueTeam.forEach((p, i) => {
    if (i === activeIdx) return;
    if (p.role === "gk") {
      steerEntity(p, p.hx, Math.max(226, Math.min(374, ball.y)), p.spd);
    } else {
      steerEntity(
        p,
        Math.max(140, Math.min(780, ball.x - 110 + (i % 2) * 50)),
        Math.max(80, Math.min(520, p.hy + (ball.y - 300) * 0.42)),
        p.spd * 0.74
      );
    }
  });

  const cfg = DIFF_CONFIG[diff];
  const redFields = redTeam.filter((p) => p.role === "field");
  let chaser = redFields[0];
  redFields.forEach((rf) => {
    if (Math.hypot(rf.x - ball.x, rf.y - ball.y) < Math.hypot(chaser.x - ball.x, chaser.y - ball.y)) {
      chaser = rf;
    }
  });

  redTeam.forEach((p) => {
    if (p.role === "gk") {
      steerEntity(p, p.hx, Math.max(226, Math.min(374, ball.y)), p.spd);
    } else if (p === chaser) {
      steerEntity(p, ball.x + 8, ball.y, p.spd);
    } else {
      steerEntity(
        p,
        Math.max(260, Math.min(860, ball.x + 120)),
        Math.max(80, Math.min(520, p.hy + (ball.y - 300) * 0.45)),
        p.spd * 0.8
      );
    }

    if (p.role === "field" && Math.hypot(p.x - ball.x, p.y - ball.y) < p.r + ball.r + 8) {
      const aim = Math.atan2(300 - ball.y + (Math.random() - 0.5) * 90, 50 - ball.x);
      p.dir = aim;
      p.step += 1.2;
      ball.vx = Math.cos(aim) * cfg.shot;
      ball.vy = Math.sin(aim) * cfg.shot;
    }
  });

  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.vx *= 0.986;
  ball.vy *= 0.986;
  ball.angle += Math.hypot(ball.vx, ball.vy) * 0.06;

  if (ball.y - ball.r < 35) { ball.y = 35 + ball.r; ball.vy *= -0.8; }
  if (ball.y + ball.r > 565) { ball.y = 565 - ball.r; ball.vy *= -0.8; }

  if (ball.x - ball.r < 45) {
    if (ball.y > 222 && ball.y < 378) return handleGoal("red");
    ball.x = 45 + ball.r;
    ball.vx *= -0.8;
  }

  if (ball.x + ball.r > 955) {
    if (ball.y > 222 && ball.y < 378) return handleGoal("blue");
    ball.x = 955 - ball.r;
    ball.vx *= -0.8;
  }

  blueTeam.concat(redTeam).forEach((p) => {
    p.x = Math.max(55, Math.min(945, p.x));
    p.y = Math.max(45, Math.min(555, p.y));
    const dx = ball.x - p.x;
    const dy = ball.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < p.r + ball.r && dist > 0) {
      ball.x = p.x + (dx / dist) * (p.r + ball.r);
      ball.y = p.y + (dy / dist) * (p.r + ball.r);
      ball.vx = (dx / dist) * 5.8;
      ball.vy = (dy / dist) * 5.8;
      p.step += 0.5;
    }
  });
}

function drawNet(x, y, w, h, leftSide) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.2;
  for (let gx = x; gx <= x + w; gx += 7) {
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke();
  }
  for (let gy = y; gy <= y + h; gy += 8) {
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke();
  }
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  const postX = leftSide ? x + w : x;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(postX, y, 5, 0, Math.PI * 2); ctx.arc(postX, y + h, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawAthlete(p, c1, c2, selected) {
  ctx.save();
  if (selected) {
    ctx.strokeStyle = sprintOn ? "#ff9800" : "#ffeb3b";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 9, 0, Math.PI * 2); ctx.stroke();
    if (chargeOn) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(p.x - 24, p.y - 42, 48, 7);
      ctx.fillStyle = chargeVal > 0.7 ? "#ff1744" : "#00e676";
      ctx.fillRect(p.x - 24, p.y - 42, 48 * chargeVal, 7);
    }
  }

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(p.x + 3, p.y + 13, p.r, p.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();

  ctx.translate(p.x, p.y);
  ctx.rotate(p.dir);
  const sw = Math.sin(p.step) * 6;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.ellipse(sw, -9, 7, 4.5, 0, 0, Math.PI * 2); ctx.ellipse(-sw, 9, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = p.skin;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-2, -13); ctx.lineTo(-sw * 0.8, -17); ctx.moveTo(-2, 13); ctx.lineTo(sw * 0.8, 17); ctx.stroke();

  const bodyGrad = ctx.createLinearGradient(-12, -16, 12, 16);
  bodyGrad.addColorStop(0, p.role === "gk" ? "#ffd54f" : c2);
  bodyGrad.addColorStop(1, p.role === "gk" ? "#ff8f00" : c1);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = p.skin;
  ctx.beginPath(); ctx.arc(1, 0, 9.5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = p.hair;
  ctx.beginPath(); ctx.arc(-1, 0, 9.2, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();

  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.num, p.x, p.y);
}

function drawField() {
  ctx.save();
  if (shakeCount > 0) {
    ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    shakeCount--;
  }

  for (let x = 0; x < 1000; x += 80) {
    ctx.fillStyle = (x / 80) % 2 === 0 ? "#1e8449" : "#239b56";
    ctx.fillRect(x, 0, 80, 600);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.88)";
  ctx.lineWidth = 3;
  ctx.strokeRect(45, 35, 910, 530);
  ctx.beginPath();
  ctx.moveTo(500, 35);
  ctx.lineTo(500, 565);
  ctx.moveTo(575, 300);
  ctx.arc(500, 300, 75, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(45, 165, 130, 270);
  ctx.strokeRect(825, 165, 130, 270);

  drawNet(12, 220, 33, 160, true);
  drawNet(955, 220, 33, 160, false);

  blueTeam.forEach((p, i) => drawAthlete(p, "#1565c0", "#64b5f6", i === activeIdx));
  redTeam.forEach((p) => drawAthlete(p, "#c62828", "#ef5350", false));

  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.angle);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.restore();
}

function gameLoop() {
  if (!isPlaying) return;
  stepGame();
  drawField();
  animFrame = requestAnimationFrame(gameLoop);
}

setupTeams();
drawField();

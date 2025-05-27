document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("wfgCanvas");
  if (!canvas) {
    console.error("Canvas element with id 'wfgCanvas' not found.");
    return;
  }
  const ctx = canvas.getContext("2d");

  const logEl = document.getElementById("log");
  const resetBtn = document.getElementById("resetBtn");
  const stateTableBody = document.getElementById("stateTableBody");

  if (!logEl || !resetBtn || !stateTableBody) {
    console.error("Log, Reset button, or State table body not found.");
    return;
  }

  let holds = {};
  let waits = {};
  let resourceOwners = {};
  let waitQueues = {};
  let positions = {};
  let deadlockedProcs = new Set();

  function log(msg) {
    logEl.textContent += msg + "\n";
    logEl.scrollTop = logEl.scrollHeight;
  }

  function updateStateTable() {
    stateTableBody.innerHTML = "";
    const processes = Object.keys({ ...holds, ...waits });
    if (processes.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="3">No processes active.</td>`;
      stateTableBody.appendChild(row);
      return;
    }
    processes.forEach(p => {
      const row = document.createElement("tr");
      const held = holds[p]?.length ? holds[p].join(", ") : "-";
      const waiting = waits[p]?.length ? waits[p].join(", ") : "-";
      row.innerHTML = `<td>${p}</td><td>${held}</td><td>${waiting}</td>`;
      stateTableBody.appendChild(row);
    });
  }

  function request() {
    const p = document.getElementById("processInput").value.trim();
    const r = document.getElementById("resourceInput").value.trim();
    if (!p.match(/^P\d+$/) || !r.match(/^R\d+$/)) {
      log("❌ Invalid input: Use P1, P2, etc., for processes and R1, R2, etc., for resources.");
      return;
    }
    if (!p || !r) return;

    holds[p] = holds[p] || [];
    waits[p] = waits[p] || [];
    waitQueues[r] = waitQueues[r] || [];

    if (!resourceOwners[r]) {
      resourceOwners[r] = p;
      holds[p].push(r);
      log(`✅ ${p} acquired ${r}`);
    } else {
      if (!waits[p].includes(r)) {
        waits[p].push(r);
        waitQueues[r].push(p);
        log(`⏳ ${p} is waiting for ${r}`);
      }
    }
    drawGraph();
    updateStateTable();
    detectDeadlock();
  }

  function release() {
    const p = document.getElementById("processInput").value.trim();
    const r = document.getElementById("resourceInput").value.trim();
    if (!p.match(/^P\d+$/) || !r.match(/^R\d+$/)) {
      log("❌ Invalid input: Use P1, P2, etc., for processes and R1, R2, etc., for resources.");
      return;
    }
    if (!p || !r) return;

    if (resourceOwners[r] === p) {
      resourceOwners[r] = null;
      holds[p] = holds[p].filter(x => x !== r);
      log(`🔓 ${p} released ${r}`);

      if (waitQueues[r]?.length) {
        const q = waitQueues[r].shift();
        waits[q] = waits[q].filter(x => x !== r);
        resourceOwners[r] = q;
        holds[q] = holds[q] || [];
        holds[q].push(r);
        log(`✅ ${q} acquired ${r} after waiting`);
      }
    }
    drawGraph();
    updateStateTable();
    detectDeadlock();
  }

  function detectDeadlock() {
    const wfg = buildWaitForGraph();
    const visited = new Set();
    const recStack = new Set();
    deadlockedProcs.clear();

    function dfs(p) {
      if (!visited.has(p)) {
        visited.add(p);
        recStack.add(p);

        for (let neighbor of (wfg[p] || [])) {
          if (!visited.has(neighbor) && dfs(neighbor)) {
            deadlockedProcs.add(p);
            return true;
          }
          if (recStack.has(neighbor)) {
            deadlockedProcs.add(p);
            deadlockedProcs.add(neighbor);
            return true;
          }
        }
      }
      recStack.delete(p);
      return false;
    }

    for (let p in wfg) {
      if (dfs(p)) {
        log(`❌ Deadlock detected involving ${[...deadlockedProcs].join(", ")}`);
        alert("❌ Deadlock Detected!");
        drawGraph();
        updateStateTable();
        resetBtn.style.display = "inline-block";
        return;
      }
    }

    log("✔ No deadlock detected.");
    drawGraph();
    updateStateTable();
    resetBtn.style.display = "none";
  }

  function buildWaitForGraph() {
    const wfg = {};
    for (let p in waits) {
      for (let r of waits[p]) {
        const owner = resourceOwners[r];
        if (owner && owner !== p) {
          if (!wfg[p]) wfg[p] = [];
          wfg[p].push(owner);
        }
      }
    }
    return wfg;
  }

  function drawGraph() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const processes = Array.from(new Set(Object.keys({ ...holds, ...waits })));
    const resources = new Set();
    processes.forEach(p => {
      (holds[p] || []).forEach(r => resources.add(r));
      (waits[p] || []).forEach(r => resources.add(r));
    });

    positions = {};
    const nodeCount = Math.max(processes.length, resources.size);
    const spacingX = Math.min(100, (canvas.width - 160) / (nodeCount + 1));

    processes.forEach((p, i) => {
      const x = 80 + i * spacingX;
      const y = 100;
      positions[p] = { x, y };
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, 2 * Math.PI);
      ctx.fillStyle = "#add8e6";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "black";
      ctx.fillText(p, x - 10, y + 5);
    });

    Array.from(resources).forEach((r, i) => {
      const x = 80 + i * spacingX;
      const y = 300;
      positions[r] = { x, y };
      ctx.fillStyle = "#f9d967";
      ctx.fillRect(x - 20, y - 20, 40, 40);
      ctx.strokeRect(x - 20, y - 20, 40, 40);
      ctx.fillStyle = "black";
      ctx.fillText(r, x - 10, y + 5);
    });

    for (let p in waits) {
      waits[p].forEach(r => drawArrow(positions[p], positions[r], "blue"));
    }

    for (let r in resourceOwners) {
      const p = resourceOwners[r];
      if (p && positions[r] && positions[p]) {
        const color = deadlockedProcs.has(p) ? "red" : "green";
        drawArrow(positions[r], positions[p], color);
      }
    }
  }

  function drawArrow(from, to, color = "black") {
    const headlen = 10;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const tx = to.x - 20 * Math.cos(angle);
    const ty = to.y - 20 * Math.sin(angle);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - headlen * Math.cos(angle - Math.PI / 6), ty - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tx - headlen * Math.cos(angle + Math.PI / 6), ty - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  function resetSystem() {
    holds = {};
    waits = {};
    resourceOwners = {};
    waitQueues = {};
    positions = {};
    deadlockedProcs.clear();
    log("🔄 System reset.");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGraph();
    updateStateTable();
    resetBtn.style.display = "none";
    logEl.textContent = "📝 Log:\n";
  }

  function fixDeadlock() {
    let wfg = buildWaitForGraph();
    let cycle = [];

    function detectCycle() {
      const visited = new Set();
      const recStack = new Set();
      cycle = [];

      function dfs(p) {
        if (!visited.has(p)) {
          visited.add(p);
          recStack.add(p);

          for (let neighbor of (wfg[p] || [])) {
            if (!visited.has(neighbor) && dfs(neighbor)) {
              if (!cycle.includes(p)) cycle.push(p);
              return true;
            }
            if (recStack.has(neighbor)) {
              cycle.push(neighbor);
              cycle.push(p);
              return true;
            }
          }
        }
        recStack.delete(p);
        return false;
      }

      for (let p in wfg) {
        if (dfs(p)) return true;
      }
      return false;
    }

    while (detectCycle()) {
      let deadlockCycle = [...new Set(cycle.reverse())];
      log(`❌ Deadlock detected involving: ${deadlockCycle.join(", ")}`);
      log(`🔧 Starting deadlock resolution steps...`);

      let victim = deadlockCycle.reduce((minP, p) =>
        (holds[p]?.length || 0) < (holds[minP]?.length || 0) ? p : minP, deadlockCycle[0]);

      let victimResources = holds[victim] || [];

      if (victimResources.length === 0) {
        log(`⚠ Process ${victim} holds no resources, cannot release any. Trying next process...`);
        let found = false;
        for (let proc of deadlockCycle) {
          if ((holds[proc] || []).length > 0) {
            victim = proc;
            victimResources = holds[proc];
            found = true;
            break;
          }
        }
        if (!found) {
          log("❌ Cannot fix deadlock automatically: no resources held by deadlocked processes.");
          alert("❌ Cannot fix deadlock automatically.");
          drawGraph();
          updateStateTable();
          resetBtn.style.display = "inline-block";
          return;
        }
      }

      const resourceToRelease = victimResources[0];
      log(`Step 1: Select process ${victim} as victim to release resource '${resourceToRelease}'.`);
      log(`Step 2: Releasing resource '${resourceToRelease}' held by '${victim}'`);
      resourceOwners[resourceToRelease] = null;
      holds[victim] = holds[victim].filter(r => r !== resourceToRelease);

      if (waitQueues[resourceToRelease]?.length) {
        const p = waitQueues[resourceToRelease].shift();
        waits[p] = waits[p].filter(r => r !== resourceToRelease);
        resourceOwners[resourceToRelease] = p;
        holds[p] = holds[p] || [];
        holds[p].push(resourceToRelease);
        log(`Step 3: Process '${p}' acquired '${resourceToRelease}'`);
      }

      log(`Step 4: Rechecking for deadlock...`);
      wfg = buildWaitForGraph();
    }

    log("✔ Deadlock resolved or no deadlock detected.");
    alert("✔ Deadlock resolved.");
    drawGraph();
    updateStateTable();
    resetBtn.style.display = "inline-block";
  }

  // Attach button listeners
  document.getElementById("requestBtn")?.addEventListener("click", request);
  document.getElementById("releaseBtn")?.addEventListener("click", release);
  document.getElementById("detectBtn")?.addEventListener("click", detectDeadlock);
  document.getElementById("fixBtn")?.addEventListener("click", fixDeadlock);
  resetBtn.addEventListener("click", resetSystem);

  // Expose functions globally
  window.request = request;
  window.release = release;
  window.detectDeadlock = detectDeadlock;
  window.fixDeadlock = fixDeadlock;
  window.resetSystem = resetSystem;
});

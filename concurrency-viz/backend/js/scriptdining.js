
let philosophers = [];
let chopsticks = [];
let locks = [];
let states = [];
let waitCounts = [];
let infoBox, errorBox, logBox;
let automationInterval = null;
let starvationDetected = false;
let actionCount = 0;
const maxActions = 50;

function logEvent(message) {
  logBox.innerHTML += `${message}<br>`;
  logBox.scrollTop = logBox.scrollHeight;
}

function createCircle(count) {
  const circle = document.getElementById('circle');
  circle.innerHTML = '';
  philosophers = [];
  chopsticks = [];
  locks = Array(count).fill(false);
  states = Array(count).fill('thinking');
  waitCounts = Array(count).fill(0);
  infoBox = document.getElementById('infoBox');
  errorBox = document.getElementById('errorBox');
  logBox = document.getElementById('logBox');
  logBox.innerHTML = '';
  starvationDetected = false;
  actionCount = 0;
  if (automationInterval) clearInterval(automationInterval);

  const angleStep = 360 / count;
  const radius = 200;

  for (let i = 0; i < count; i++) {
    const angle = angleStep * i;
    const x = radius * Math.cos((angle * Math.PI) / 180);
    const y = radius * Math.sin((angle * Math.PI) / 180);

    const img = document.createElement('img');
    img.src = `assets/p${i + 1}.png`;
    img.className = 'philosopher';
    img.style.left = `${250 + x}px`;
    img.style.top = `${250 + y}px`;
    img.id = `P${i}`;
    img.alt = `Philosopher ${i + 1}`;
    img.onclick = () => handlePhilosopherClick(i);
    circle.appendChild(img);
    philosophers.push(img);

    const status = document.createElement('div');
    status.className = 'status';
    status.id = `status${i}`;
    status.style.left = `${250 + x}px`;
    status.style.top = `${250 + y + 50}px`;
    status.innerText = `P${i + 1}: Thinking 💭`;
    circle.appendChild(status);

    const bowl = document.createElement('img');
    bowl.src = 'assets/bowl.jpg';
    bowl.className = 'bowl';
    bowl.style.left = `${250 + x + 40}px`;
    bowl.style.top = `${250 + y}px`;
    circle.appendChild(bowl);

    const chop = document.createElement('img');
    chop.src = 'assets/chopstick.jpg';
    chop.className = 'chopstick';
    chop.id = `C${i}`;
    const chopRadius = radius - 40;
    const cx = chopRadius * Math.cos(((angle + angleStep / 2) * Math.PI) / 180);
    const cy = chopRadius * Math.sin(((angle + angleStep / 2) * Math.PI) / 180);
    chop.style.left = `${250 + cx}px`;
    chop.style.top = `${250 + cy}px`;
    circle.appendChild(chop);
    chopsticks.push(chop);

    const lockIconContainer = document.createElement('div');
    lockIconContainer.className = 'lock-icon';
    const lockRadius = radius + 70;
    const lockX = lockRadius * Math.cos(((angle + angleStep / 2) * Math.PI) / 180);
    const lockY = lockRadius * Math.sin(((angle + angleStep / 2) * Math.PI) / 180);
    lockIconContainer.style.left = `${250 + lockX}px`;
    lockIconContainer.style.top = `${250 + lockY}px`;

    const lockImg = document.createElement('img');
    lockImg.src = 'assets/lock.png';
    lockImg.className = 'lock';
    lockImg.id = `lock${i}`;

    const lockText = document.createElement('div');
    lockText.className = 'lock-text';
    lockText.id = `lockText${i}`;
    lockText.innerText = 'Mutex: Unlocked';
    lockText.style.marginLeft = '8px';

    lockIconContainer.appendChild(lockImg);
    lockIconContainer.appendChild(lockText);
    circle.appendChild(lockIconContainer);
  }

  updateStatusTable();
  errorBox.innerText = '';
  infoBox.innerText = 'Click on a philosopher to start or stop eating or press Automate';
  logEvent(`Simulation started with ${count} philosophers.`);
}

function handlePhilosopherClick(i) {
  const count = philosophers.length;
  const left = (i + count - 1) % count; // Left chopstick
  const right = i;                      // Right chopstick

  if (states[i] === 'eating') {
    locks[left] = false;
    locks[right] = false;
    updateChopstick(left, false);
    updateChopstick(right, false);
    updateState(i, 'thinking');
    updateStatus(i, `P${i + 1}: Thinking 💭`);
    states[i] = 'thinking';
    waitCounts[i] = 0;
    infoBox.innerText = `Philosopher ${i + 1} stopped eating and is thinking.`;
    logEvent(`Philosopher ${i + 1} stopped eating, released chopsticks C${left} and C${right}.`);
  } else {
    // Try to acquire left chopstick first
    if (!locks[left]) {
      locks[left] = true;
      updateChopstick(left, true);
      // Try to acquire right chopstick
      if (!locks[right]) {
        locks[right] = true;
        updateChopstick(right, true);
        updateState(i, 'eating');
        updateStatus(i, `P${i + 1}: Eating 🍜`);
        states[i] = 'eating';
        waitCounts[i] = 0;
        infoBox.innerText = `Philosopher ${i + 1} is eating.`;
        logEvent(`Philosopher ${i + 1} started eating, acquired chopsticks C${left} and C${right}.`);
      } else {
        // Release left chopstick if right is unavailable
        locks[left] = false;
        updateChopstick(left, false);
        updateState(i, 'waiting');
        updateStatus(i, `P${i + 1}: Waiting 🕓`);
        states[i] = 'waiting';
        waitCounts[i]++;
        infoBox.innerText = `Philosopher ${i + 1} is waiting for chopsticks.`;
        logEvent(`Philosopher ${i + 1} released C${left} and is waiting for C${right}.`);
      }
    } else {
      updateState(i, 'waiting');
      updateStatus(i, `P${i + 1}: Waiting 🕓`);
      states[i] = 'waiting';
      waitCounts[i]++;
      infoBox.innerText = `Philosopher ${i + 1} is waiting for chopsticks.`;
      logEvent(`Philosopher ${i + 1} is waiting for chopsticks C${left} and/or C${right}.`);
    }
  }

  updateStatusTable();
  detectStarvation();
}

function detectStarvation() {
  const starved = waitCounts.findIndex(count => count >= 5);
  if (starved !== -1) {
    errorBox.innerText = `⚠️ STARVATION: Philosopher ${starved + 1} has been waiting too long!`;
    logEvent(`STARVATION detected: Philosopher ${starved + 1} has waited ${waitCounts[starved]} times.`);
    starvationDetected = true;
  } else {
    errorBox.innerText = '';
  }
}

function detectDeadlock() {
  const allWaiting = states.every(state => state === 'waiting');
  const noChopsticksFree = locks.every(lock => lock);
  return allWaiting && noChopsticksFree;
}

function updateState(index, state) {
  const p = document.getElementById(`P${index}`);
  p.style.borderColor = {
    'thinking': '#0d6efd',
    'eating': '#198754',
    'waiting': '#fd7e14'
  }[state] || 'transparent';
}

function updateStatus(index, text) {
  const status = document.getElementById(`status${index}`);
  if (status) status.innerText = text;
}

function updateChopstick(index, taken) {
  const c = document.getElementById(`C${index}`);
  const lockIcon = document.getElementById(`lock${index}`);
  const lockText = document.getElementById(`lockText${index}`);

  if (c) c.classList.toggle('taken', taken);
  if (lockIcon && lockText) {
    lockIcon.src = taken ? 'assets/unlock.png' : 'assets/lock.png';
    lockText.innerText = taken ? 'Mutex: Locked' : 'Mutex: Unlocked';
  }
}

function updateStatusTable() {
  const tableBody = document.getElementById('statusTableBody');
  tableBody.innerHTML = '';
  const count = philosophers.length;

  for (let i = 0; i < count; i++) {
    const left = (i + count - 1) % count; // Left chopstick index
    const right = i;                      // Right chopstick index
    let leftStatus = '';
    let rightStatus = '';

    if (states[i] === 'eating') {
      // Eating philosophers have both chopsticks
      leftStatus = 'Taken';
      rightStatus = 'Taken';
    } else {
      // For waiting or thinking, check who holds the chopsticks
      if (locks[left]) {
        // Find which philosopher is holding the left chopstick
        const holder = philosophers.findIndex((_, j) => {
          const jLeft = (j + count - 1) % count;
          const jRight = j;
          return states[j] === 'eating' && (jLeft === left || jRight === left);
        });
        leftStatus = holder !== -1 ? `Taken by P${holder + 1}` : 'Taken';
      } else {
        leftStatus = 'Free';
      }

      if (locks[right]) {
        // Find which philosopher is holding the right chopstick
        const holder = philosophers.findIndex((_, j) => {
          const jLeft = (j + count - 1) % count;
          const jRight = j;
          return states[j] === 'eating' && (jLeft === right || jRight === right);
        });
        rightStatus = holder !== -1 ? `Taken by P${holder + 1}` : 'Taken';
      } else {
        rightStatus = 'Free';
      }
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>P${i + 1}</td>
      <td>${states[i].charAt(0).toUpperCase() + states[i].slice(1)}</td>
      <td>${leftStatus}</td>
      <td>${rightStatus}</td>
      <td>${waitCounts[i]}</td>
    `;
    tableBody.appendChild(row);
  }
}

function startSimulation() {
  const count = parseInt(document.getElementById('philosopherCount').value);
  if (count < 1 || count > 5) {
    alert("Please enter a number between 1 and 5.");
    return;
  }
  createCircle(count);
}

function resetSimulation() {
  if (automationInterval) clearInterval(automationInterval);
  const count = philosophers.length || parseInt(document.getElementById('philosopherCount').value);
  if (count < 1 || count > 5) {
    alert("Please create a table first or enter a valid number of philosophers.");
    return;
  }
  createCircle(count);
  infoBox.innerText = 'Simulation reset. Click on a philosopher or press Automate.';
  logEvent('Simulation reset.');
}

function startAutomation() {
  const count = parseInt(document.getElementById('philosopherCount').value);
  if (count < 1 || count > 5) {
    alert("Please enter a number between 1 and 5.");
    return;
  }
  if (philosophers.length === 0) {
    createCircle(count);
  }
  if (automationInterval) clearInterval(automationInterval);

  infoBox.innerText = 'Automation running: Simulating philosopher actions...';
  logEvent('Automation started.');

  let step = 0;

  automationInterval = setInterval(() => {
    actionCount++;
    if (actionCount >= maxActions || starvationDetected) {
      clearInterval(automationInterval);
      infoBox.innerText = 'Automation complete. Click philosophers or restart to continue.';
      logEvent('Automation stopped.');
      return;
    }

    // Favor P1 and P2 to trigger starvation for others
    const target = step % 3 === 2 ? 2 : step % 2;
    if (states[target] === 'eating') {
      handlePhilosopherClick(target);
    } else {
      handlePhilosopherClick(target);
    }
    step++;

    if (starvationDetected) {
      clearInterval(automationInterval);
      setTimeout(() => {
        automationInterval = setInterval(arguments.callee, 1000);
      }, 2000);
    }
  }, 1000);
}

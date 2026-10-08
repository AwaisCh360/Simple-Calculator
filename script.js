class AudioClick {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('calc-sound') !== 'muted';
  }

  init() {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, this.ctx.currentTime + 0.025);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.025);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.025);
    } catch {
      // Audio not permitted or supported
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('calc-sound', this.enabled ? 'on' : 'muted');
    return this.enabled;
  }
}

class Calculator {
  constructor(previousOperandEl, currentOperandEl, angleBadgeEl, angleToggleBtnEl, memoryBadgeEl, audioClick) {
    this.previousOperandEl = previousOperandEl;
    this.currentOperandEl = currentOperandEl;
    this.angleBadgeEl = angleBadgeEl;
    this.angleToggleBtnEl = angleToggleBtnEl;
    this.memoryBadgeEl = memoryBadgeEl;
    this.audioClick = audioClick;

    this.angleMode = 'DEG';
    this.memoryValue = 0;
    this.history = JSON.parse(localStorage.getItem('calc-history') || '[]');

    this.clear();
    this.updateMemoryUI();
    this.renderHistory();
  }

  clear() {
    if (this.currentOperand !== '0' && !this.shouldResetScreen && this.previousOperand !== '') {
      this.currentOperand = '0';
    } else {
      this.currentOperand = '0';
      this.previousOperand = '';
      this.operation = undefined;
      this.shouldResetScreen = false;
      this.hasError = false;
    }
    this.updateDisplay();
  }

  delete() {
    if (this.hasError) {
      this.clear();
      return;
    }
    if (this.shouldResetScreen) return;
    if (this.currentOperand === '0') return;

    if (this.currentOperand.length === 1 || (this.currentOperand.length === 2 && this.currentOperand.startsWith('-'))) {
      this.currentOperand = '0';
    } else {
      this.currentOperand = this.currentOperand.slice(0, -1);
    }
    this.updateDisplay();
  }

  appendNumber(number) {
    if (this.hasError || this.shouldResetScreen) {
      this.currentOperand = '';
      this.shouldResetScreen = false;
      this.hasError = false;
    }

    if (number === '.' && this.currentOperand.includes('.')) return;
    if (number === '.' && (this.currentOperand === '' || this.currentOperand === '0')) {
      this.currentOperand = '0.';
      this.updateDisplay();
      return;
    }

    if (this.currentOperand.replace(/[^0-9]/g, '').length >= 15) return;

    if (this.currentOperand === '0' && number !== '.') {
      this.currentOperand = number.toString();
    } else {
      this.currentOperand = this.currentOperand.toString() + number.toString();
    }
    this.updateDisplay();
  }

  toggleSign() {
    if (this.hasError) return;
    if (this.currentOperand === '0' || this.currentOperand === '') return;

    if (this.currentOperand.startsWith('-')) {
      this.currentOperand = this.currentOperand.substring(1);
    } else {
      this.currentOperand = '-' + this.currentOperand;
    }
    this.updateDisplay();
  }

  computePercent() {
    if (this.hasError) return;
    const current = parseFloat(this.currentOperand);
    if (isNaN(current)) return;

    if (this.operation && this.previousOperand !== '') {
      const prev = parseFloat(this.previousOperand);
      if (!isNaN(prev)) {
        const percentVal = (prev * current) / 100;
        this.currentOperand = this.roundAccurate(percentVal).toString();
        this.updateDisplay();
        return;
      }
    }

    const res = current / 100;
    this.currentOperand = this.roundAccurate(res).toString();
    this.updateDisplay();
  }

  chooseOperation(operation) {
    if (this.hasError) return;
    if (this.currentOperand === '' && this.previousOperand === '') return;

    if (this.previousOperand !== '' && !this.shouldResetScreen) {
      this.compute();
    }

    this.operation = operation;
    this.previousOperand = this.currentOperand;
    this.shouldResetScreen = true;
    this.updateDisplay();
  }

  compute() {
    if (this.hasError) return;
    let computation;
    const prev = parseFloat(this.previousOperand);
    const current = parseFloat(this.currentOperand);

    if (isNaN(prev) || isNaN(current)) return;

    let opSymbol = this.operation;

    switch (this.operation) {
      case '+':
      case 'add':
        computation = prev + current;
        opSymbol = '+';
        break;
      case '−':
      case '-':
      case 'subtract':
        computation = prev - current;
        opSymbol = '−';
        break;
      case '×':
      case '*':
      case 'multiply':
        computation = prev * current;
        opSymbol = '×';
        break;
      case '÷':
      case '/':
      case 'divide':
        if (current === 0) {
          this.setError();
          return;
        }
        computation = prev / current;
        opSymbol = '÷';
        break;
      case '^':
      case 'power':
        computation = Math.pow(prev, current);
        opSymbol = '^';
        if (!isFinite(computation) || isNaN(computation)) {
          this.setError();
          return;
        }
        break;
      default:
        return;
    }

    computation = this.roundAccurate(computation);

    // Save calculation to history
    this.addHistory(`${this.formatDisplayNumber(prev)} ${opSymbol} ${this.formatDisplayNumber(current)}`, computation.toString());

    this.currentOperand = computation.toString();
    this.operation = undefined;
    this.previousOperand = '';
    this.shouldResetScreen = true;
    this.updateDisplay();
  }

  // --- Scientific Operations ---

  toggleAngleMode() {
    this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
    if (this.angleBadgeEl) this.angleBadgeEl.innerText = this.angleMode;
    if (this.angleToggleBtnEl) this.angleToggleBtnEl.innerText = this.angleMode;
  }

  applyScientificUnary(type) {
    if (this.hasError) return;
    const val = parseFloat(this.currentOperand);
    if (isNaN(val)) return;

    let result;
    let exprLabel = '';

    switch (type) {
      case 'sci-sq':
        result = val * val;
        exprLabel = `sqr(${val})`;
        break;
      case 'sci-cube':
        result = val * val * val;
        exprLabel = `cube(${val})`;
        break;
      case 'sci-sqrt':
        if (val < 0) {
          this.setError();
          return;
        }
        result = Math.sqrt(val);
        exprLabel = `√(${val})`;
        break;
      case 'sci-recip':
        if (val === 0) {
          this.setError();
          return;
        }
        result = 1 / val;
        exprLabel = `1/(${val})`;
        break;
      case 'sci-abs':
        result = Math.abs(val);
        exprLabel = `|${val}|`;
        break;
      case 'sci-sin':
        {
          const rad = this.angleMode === 'DEG' ? (val * Math.PI) / 180 : val;
          result = Math.sin(rad);
          if (Math.abs(result) < 1e-15) result = 0;
          exprLabel = `sin(${val})`;
        }
        break;
      case 'sci-cos':
        {
          const rad = this.angleMode === 'DEG' ? (val * Math.PI) / 180 : val;
          result = Math.cos(rad);
          if (Math.abs(result) < 1e-15) result = 0;
          exprLabel = `cos(${val})`;
        }
        break;
      case 'sci-tan':
        {
          if (this.angleMode === 'DEG' && Math.abs(val % 180) === 90) {
            this.setError();
            return;
          }
          const rad = this.angleMode === 'DEG' ? (val * Math.PI) / 180 : val;
          result = Math.tan(rad);
          if (!isFinite(result)) {
            this.setError();
            return;
          }
          if (Math.abs(result) < 1e-15) result = 0;
          exprLabel = `tan(${val})`;
        }
        break;
      case 'sci-ln':
        if (val <= 0) {
          this.setError();
          return;
        }
        result = Math.log(val);
        exprLabel = `ln(${val})`;
        break;
      case 'sci-log':
        if (val <= 0) {
          this.setError();
          return;
        }
        result = Math.log10(val);
        exprLabel = `log(${val})`;
        break;
      case 'sci-fact':
        if (val < 0 || !Number.isInteger(val) || val > 170) {
          this.setError();
          return;
        }
        result = this.factorial(val);
        exprLabel = `${val}!`;
        break;
      default:
        return;
    }

    result = this.roundAccurate(result);
    this.addHistory(exprLabel, result.toString());

    this.currentOperand = result.toString();
    this.shouldResetScreen = true;
    this.updateDisplay();
  }

  insertConstant(constant) {
    if (this.hasError || this.shouldResetScreen) {
      this.currentOperand = '';
      this.shouldResetScreen = false;
      this.hasError = false;
    }

    let val;
    if (constant === 'pi') {
      val = Math.PI;
    } else if (constant === 'e') {
      val = Math.E;
    }

    if (val != null) {
      this.currentOperand = this.roundAccurate(val).toString();
      this.shouldResetScreen = true;
      this.updateDisplay();
    }
  }

  // --- Memory Operations ---

  memClear() {
    this.memoryValue = 0;
    this.updateMemoryUI();
  }

  memRecall() {
    if (this.memoryValue === 0) return;
    this.currentOperand = this.memoryValue.toString();
    this.shouldResetScreen = true;
    this.updateDisplay();
  }

  memAdd() {
    const val = parseFloat(this.currentOperand);
    if (!isNaN(val)) {
      this.memoryValue = this.roundAccurate(this.memoryValue + val);
      this.shouldResetScreen = true;
      this.updateMemoryUI();
    }
  }

  memSub() {
    const val = parseFloat(this.currentOperand);
    if (!isNaN(val)) {
      this.memoryValue = this.roundAccurate(this.memoryValue - val);
      this.shouldResetScreen = true;
      this.updateMemoryUI();
    }
  }

  memStore() {
    const val = parseFloat(this.currentOperand);
    if (!isNaN(val)) {
      this.memoryValue = val;
      this.shouldResetScreen = true;
      this.updateMemoryUI();
    }
  }

  updateMemoryUI() {
    const isStored = this.memoryValue !== 0;
    if (this.memoryBadgeEl) {
      if (isStored) {
        this.memoryBadgeEl.classList.add('active');
      } else {
        this.memoryBadgeEl.classList.remove('active');
      }
    }

    const btnMC = document.getElementById('btnMemClear');
    const btnMR = document.getElementById('btnMemRecall');
    if (btnMC) btnMC.disabled = !isStored;
    if (btnMR) btnMR.disabled = !isStored;
  }

  // --- History Management ---

  addHistory(expression, result) {
    this.history.unshift({ expression, result, id: Date.now() });
    if (this.history.length > 25) {
      this.history.pop();
    }
    localStorage.setItem('calc-history', JSON.stringify(this.history));
    this.renderHistory();
  }

  clearHistory() {
    this.history = [];
    localStorage.removeItem('calc-history');
    this.renderHistory();
  }

  renderHistory() {
    const listEl = document.getElementById('historyList');
    if (!listEl) return;

    if (this.history.length === 0) {
      listEl.innerHTML = '<div class="history-empty">No calculations yet</div>';
      return;
    }

    listEl.innerHTML = '';
    this.history.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'history-item';
      itemEl.innerHTML = `
        <span class="history-expr">${item.expression} =</span>
        <span class="history-result">${this.formatDisplayNumber(item.result)}</span>
      `;
      itemEl.addEventListener('click', () => {
        this.currentOperand = item.result;
        this.shouldResetScreen = true;
        this.updateDisplay();
      });
      listEl.appendChild(itemEl);
    });
  }

  // --- Helpers ---

  factorial(n) {
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) {
      res *= i;
    }
    return res;
  }

  setError() {
    this.currentOperand = 'Error';
    this.previousOperand = '';
    this.operation = undefined;
    this.hasError = true;
    this.shouldResetScreen = true;
    this.updateDisplay();
  }

  roundAccurate(num) {
    if (isNaN(num)) return 0;
    if (!isFinite(num)) return num;

    if (Math.abs(num) > 1e14 || (Math.abs(num) < 1e-6 && num !== 0)) {
      return parseFloat(num.toPrecision(10));
    }
    return Math.round((num + Number.EPSILON) * 1e12) / 1e12;
  }

  formatDisplayNumber(numberStr) {
    if (numberStr === 'Error') return 'Error';
    if (!numberStr && numberStr !== 0) return '';

    const stringNumber = numberStr.toString();
    const isNegative = stringNumber.startsWith('-');
    const cleanNumber = isNegative ? stringNumber.substring(1) : stringNumber;

    if (cleanNumber.includes('e') || cleanNumber.includes('E')) {
      return numberStr;
    }

    const parts = cleanNumber.split('.');
    const integerDigits = parseFloat(parts[0]);
    const decimalDigits = parts[1];

    let integerDisplay = '';
    if (isNaN(integerDigits)) {
      integerDisplay = '0';
    } else {
      integerDisplay = integerDigits.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    let result = isNegative ? '-' + integerDisplay : integerDisplay;
    if (decimalDigits != null) {
      result += `.${decimalDigits}`;
    }
    return result;
  }

  updateDisplay() {
    if (this.hasError) {
      this.currentOperandEl.innerText = 'Error';
      this.previousOperandEl.innerText = '';
      return;
    }

    this.currentOperandEl.innerText = this.formatDisplayNumber(this.currentOperand);

    // Font resizing for long outputs
    const len = this.currentOperandEl.innerText.length;
    if (len > 14) {
      this.currentOperandEl.style.fontSize = '1.25rem';
    } else if (len > 10) {
      this.currentOperandEl.style.fontSize = '1.65rem';
    } else {
      this.currentOperandEl.style.fontSize = '2.25rem';
    }

    // Format previous operand display
    if (this.operation != null && this.previousOperand !== '') {
      let opSymbol = this.operation;
      if (opSymbol === 'add') opSymbol = '+';
      if (opSymbol === 'subtract') opSymbol = '−';
      if (opSymbol === 'multiply') opSymbol = '×';
      if (opSymbol === 'divide') opSymbol = '÷';
      if (opSymbol === 'power') opSymbol = '^';
      this.previousOperandEl.innerText = `${this.formatDisplayNumber(this.previousOperand)} ${opSymbol}`;
    } else {
      this.previousOperandEl.innerText = '';
    }

    // Toggle AC vs C text
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
      if (this.currentOperand !== '0' && !this.shouldResetScreen) {
        clearBtn.innerText = 'C';
      } else {
        clearBtn.innerText = 'AC';
      }
    }
  }
}

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  const previousOperandEl = document.getElementById('previousOperand');
  const currentOperandEl = document.getElementById('currentOperand');
  const angleBadgeEl = document.getElementById('angleModeBadge');
  const angleToggleBtnEl = document.getElementById('angleToggleBtn');
  const memoryBadgeEl = document.getElementById('memoryBadge');
  const calculatorWrapper = document.getElementById('calculatorWrapper');
  const scientificPanel = document.getElementById('scientificPanel');
  const copyTooltip = document.getElementById('copyTooltip');
  const displayContainer = document.getElementById('displayContainer');

  const audioClick = new AudioClick();
  const calculator = new Calculator(
    previousOperandEl,
    currentOperandEl,
    angleBadgeEl,
    angleToggleBtnEl,
    memoryBadgeEl,
    audioClick
  );

  function triggerActionSound() {
    audioClick.play();
  }

  // Number Buttons
  const numberButtons = document.querySelectorAll('[data-number]');
  numberButtons.forEach(button => {
    button.addEventListener('click', () => {
      triggerActionSound();
      calculator.appendNumber(button.getAttribute('data-number'));
    });
  });

  // Action, Operator, Scientific & Memory Buttons
  const actionButtons = document.querySelectorAll('[data-action]');
  actionButtons.forEach(button => {
    button.addEventListener('click', () => {
      triggerActionSound();
      const action = button.getAttribute('data-action');

      switch (action) {
        case 'clear':
          calculator.clear();
          break;
        case 'delete':
          calculator.delete();
          break;
        case 'toggle-sign':
          calculator.toggleSign();
          break;
        case 'percent':
          calculator.computePercent();
          break;
        case 'add':
        case 'subtract':
        case 'multiply':
        case 'divide':
        case 'power':
          calculator.chooseOperation(action);
          break;
        case 'equals':
          calculator.compute();
          break;
        case 'toggle-angle':
          calculator.toggleAngleMode();
          break;
        case 'sci-pi':
          calculator.insertConstant('pi');
          break;
        case 'sci-e-const':
          calculator.insertConstant('e');
          break;
        case 'mem-clear':
          calculator.memClear();
          break;
        case 'mem-recall':
          calculator.memRecall();
          break;
        case 'mem-add':
          calculator.memAdd();
          break;
        case 'mem-sub':
          calculator.memSub();
          break;
        case 'mem-store':
          calculator.memStore();
          break;
        default:
          if (action.startsWith('sci-')) {
            calculator.applyScientificUnary(action);
          }
          break;
      }
    });
  });

  // Mode Switcher (Standard vs Scientific)
  const modeStandardBtn = document.getElementById('modeStandard');
  const modeScientificBtn = document.getElementById('modeScientific');

  function setMode(mode) {
    if (mode === 'scientific') {
      calculatorWrapper.classList.add('scientific-mode');
      scientificPanel.setAttribute('aria-hidden', 'false');
      modeScientificBtn.classList.add('active');
      modeScientificBtn.setAttribute('aria-selected', 'true');
      modeStandardBtn.classList.remove('active');
      modeStandardBtn.setAttribute('aria-selected', 'false');
      localStorage.setItem('calc-mode', 'scientific');
    } else {
      calculatorWrapper.classList.remove('scientific-mode');
      scientificPanel.setAttribute('aria-hidden', 'true');
      modeStandardBtn.classList.add('active');
      modeStandardBtn.setAttribute('aria-selected', 'true');
      modeScientificBtn.classList.remove('active');
      modeScientificBtn.setAttribute('aria-selected', 'false');
      localStorage.setItem('calc-mode', 'standard');
    }
  }

  modeStandardBtn.addEventListener('click', () => {
    triggerActionSound();
    setMode('standard');
  });
  modeScientificBtn.addEventListener('click', () => {
    triggerActionSound();
    setMode('scientific');
  });

  const savedMode = localStorage.getItem('calc-mode') || 'standard';
  setMode(savedMode);

  // Sound Feedback Toggle
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  if (!audioClick.enabled) {
    soundToggleBtn.classList.add('muted');
  }

  soundToggleBtn.addEventListener('click', () => {
    const isNowEnabled = audioClick.toggle();
    if (isNowEnabled) {
      soundToggleBtn.classList.remove('muted');
      audioClick.play();
    } else {
      soundToggleBtn.classList.add('muted');
    }
  });

  // History Drawer Toggle
  const historyToggleBtn = document.getElementById('historyToggleBtn');
  const historyPanel = document.getElementById('historyPanel');
  const historyCloseBtn = document.getElementById('historyCloseBtn');
  const historyClearBtn = document.getElementById('historyClearBtn');

  function toggleHistory() {
    const isOpen = historyPanel.classList.toggle('open');
    historyToggleBtn.classList.toggle('active', isOpen);
    historyPanel.setAttribute('aria-hidden', !isOpen);
  }

  historyToggleBtn.addEventListener('click', toggleHistory);
  historyCloseBtn.addEventListener('click', toggleHistory);
  historyClearBtn.addEventListener('click', () => calculator.clearHistory());

  // Shortcuts Modal
  const shortcutsToggleBtn = document.getElementById('shortcutsToggleBtn');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const shortcutsCloseBtn = document.getElementById('shortcutsCloseBtn');

  function toggleShortcuts(show) {
    shortcutsModal.classList.toggle('open', show);
    shortcutsModal.setAttribute('aria-hidden', !show);
  }

  shortcutsToggleBtn.addEventListener('click', () => toggleShortcuts(true));
  shortcutsCloseBtn.addEventListener('click', () => toggleShortcuts(false));
  shortcutsModal.addEventListener('click', (e) => {
    if (e.target === shortcutsModal) toggleShortcuts(false);
  });

  // Display Click to Copy
  displayContainer.addEventListener('click', () => {
    if (calculator.currentOperand === 'Error' || !calculator.currentOperand) return;
    navigator.clipboard.writeText(calculator.currentOperand).then(() => {
      copyTooltip.classList.add('visible');
      setTimeout(() => copyTooltip.classList.remove('visible'), 1200);
    }).catch(() => {});
  });

  // Paste Event Support
  window.addEventListener('paste', (e) => {
    const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
    if (/^-?\d+(\.\d+)?$/.test(pasteData)) {
      calculator.currentOperand = pasteData;
      calculator.shouldResetScreen = true;
      calculator.updateDisplay();
    }
  });

  // Keyboard Support
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (shortcutsModal.classList.contains('open')) {
        toggleShortcuts(false);
        return;
      }
      if (historyPanel.classList.contains('open')) {
        toggleHistory();
        return;
      }
    }

    if (['/', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
    }

    let targetSelector = null;

    if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
      calculator.appendNumber(e.key);
      targetSelector = `[data-number="${e.key}"]`;
    } else if (e.key === '+') {
      calculator.chooseOperation('add');
      targetSelector = `[data-action="add"]`;
    } else if (e.key === '-') {
      calculator.chooseOperation('subtract');
      targetSelector = `[data-action="subtract"]`;
    } else if (e.key === '*') {
      calculator.chooseOperation('multiply');
      targetSelector = `[data-action="multiply"]`;
    } else if (e.key === '/') {
      calculator.chooseOperation('divide');
      targetSelector = `[data-action="divide"]`;
    } else if (e.key === '^') {
      calculator.chooseOperation('power');
      targetSelector = `[data-action="power"]`;
    } else if (e.key === '!') {
      calculator.applyScientificUnary('sci-fact');
      targetSelector = `[data-action="sci-fact"]`;
    } else if (e.key === 'Enter' || e.key === '=') {
      calculator.compute();
      targetSelector = `[data-action="equals"]`;
    } else if (e.key === 'Backspace') {
      calculator.delete();
      targetSelector = `[data-action="delete"]`;
    } else if (e.key === 'Escape') {
      calculator.clear();
      targetSelector = `[data-action="clear"]`;
    } else if (e.key === '%') {
      calculator.computePercent();
      targetSelector = `[data-action="percent"]`;
    }

    if (targetSelector) {
      triggerActionSound();
      const btn = document.querySelector(targetSelector);
      if (btn) {
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 120);
      }
    }
  });

  // Theme Toggle Support (Clean Dark / Clean Light)
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('calc-theme') ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';

      if (newTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      localStorage.setItem('calc-theme', newTheme);
    });
  }
});

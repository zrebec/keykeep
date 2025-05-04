// define custom charsets
import { deriveKeyPBKDF2, exportKey, getSalt, generatePasswordOld, generatePassword } from './crypto.js';

const charsetArr = ['bcdfghjklmnpqrstvwxz', 'aeiou'].map((set) => Array.from(set));
const numberArr = Array.from('0123456789');
const emojiArr = Array.from('💚👍🦊🐴🦄🐰🐷');
const specialsArr = [',.', '/*-'].map((set) => Array.from(set));

const debug = true; // Set to true for debugging

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then((reg) => {
        if (debug) console.log('ServiceWorker registered');
      })
      .catch((err) => {
        if (debug) console.error('ServiceWorker registration failed:', err);
      });
  });
}

const passwordForm = document.getElementById('password-form');

const seedInputEl = document.getElementById('seed-input');
const domainInputEl = document.getElementById('domain-input');
const usernameEl = document.getElementById('username-input');
const passwordVariationEl = document.getElementById('variation-select');
const passwordLengthEl = document.getElementById('length-select');

const passwordOutputEl = document.getElementById('password-output');

const togglePasswordBtn = document.getElementById('toggle-password');
const copyPasswordBtn = document.getElementById('copy-password');
const copyUsernameBtn = document.getElementById('copy-username');
const clearFormBtn = document.getElementById('clear-form');

window.onload = function () {
  seedInputEl.focus();
};

async function yieldToUI() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function copyToClipboard(inputEl, btnEl) {
  if (!inputEl.value) return;
  navigator.clipboard
    .writeText(inputEl.value)
    .then(() => {
      btnEl.textContent = '✅';
      setTimeout(() => (btnEl.textContent = '📋'), 1500);
    })
    .catch((err) => console.error('Copy failed:', err));
}

clearFormBtn.addEventListener('click', () => passwordForm.reset());

passwordForm.addEventListener('submit', async function (event) {
  event.preventDefault(); // Prevent form submission

  // get the selected options
  const seed = seedInputEl.value.trim();
  const domain = domainInputEl.value.trim();
  const login = usernameEl.value.trim();
  const variation = parseInt(passwordVariationEl.value);
  const length = parseInt(passwordLengthEl.value);

  // derive the key using PBKDF2
  toggleForm(true);
  if (debug) console.log('Deriving key...');

  await yieldToUI(); // Yield to the UI to allow the form to update

  const salt = getSalt(domain, login, variation);

  const key = await deriveKeyPBKDF2(seed, salt, 10_000_000, 256);
  if (debug) console.log('Key derived...');
  toggleForm(false);

  const keyBytes = await exportKey(key);
  const hashBytes = new Uint8Array(keyBytes.buffer);

  if (variation === 0) {
    passwordOutputEl.value = await generatePasswordOld(hashBytes, length, charsetArr, numberArr, specialsArr[0]);
  } else if (variation === 1) {
    passwordOutputEl.value = await generatePasswordOld(hashBytes, length, charsetArr, numberArr, specialsArr.flat());
  } else if (variation === 10) {
    passwordOutputEl.value = await generatePassword(hashBytes, length, charsetArr, numberArr, emojiArr, domain, login);
  } else {
    passwordOutputEl.value = await generatePassword(
      hashBytes,
      length,
      charsetArr,
      numberArr,
      specialsArr.flat(),
      domain,
      login,
      variation,
    );
  }
  copyPasswordBtn.focus();
});

// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
  const isHidden = passwordOutputEl.type === 'password';
  if (isHidden) {
    passwordOutputEl.type = 'text';
    togglePasswordBtn.style.backgroundColor = 'green';
    togglePasswordBtn.setAttribute('aria-label', 'Hide password');
    setTimeout(() => {
      passwordOutputEl.type = 'password';
      togglePasswordBtn.textContent = '👁️';
      togglePasswordBtn.style.backgroundColor = 'grey';
      togglePasswordBtn.setAttribute('aria-label', 'Show password');
    }, 2500);
  } else {
    passwordOutputEl.type = 'password';
    togglePasswordBtn.textContent = '👁️';
    togglePasswordBtn.style.backgroundColor = 'grey';
    togglePasswordBtn.setAttribute('aria-label', 'Show password');
  }
});

// Add copy password button functionality
copyPasswordBtn.addEventListener('click', function () {
  copyToClipboard(passwordOutputEl, copyPasswordBtn);
});

// Add copy userLogin button functionality
copyUsernameBtn.addEventListener('click', function () {
  copyToClipboard(usernameEl, copyUsernameBtn);
});

function toggleForm(disabled = true) {
  const formElements = document.querySelectorAll('#password-form input, #password-form select, #password-form button');
  formElements.forEach((el) => {
    el.disabled = disabled;
  });
}

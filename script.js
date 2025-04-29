import { deriveKeyPBKDF2, exportKey, SPECIALS, NUMBERS, CHARSET } from './crypto.js';

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
  const seed = seedInputEl.value;
  const domain = domainInputEl.value;
  const login = usernameEl.value;
  const variation = parseInt(passwordVariationEl.value);
  const length = parseInt(passwordLengthEl.value);

  // derive the key using PBKDF2
  toggleForm(true);
  if (debug) console.log('Deriving key...');

  await yieldToUI(); // Yield to the UI to allow the form to update

  // Declare the charset based on the selected options
  let specials = SPECIALS[0]; // Compatibility: prvá sada
  if (variation === 1) {
    specials += SPECIALS[1] || ''; // Standard: prvé dve sady
  } else if (variation === 10) {
    specials = SPECIALS.join(''); // Extended: všetky sady
  }

  let salt = `${domain.toLowerCase()}::${login.toLowerCase()}`;
  if (variation === 2) {
    salt += `::${variation}`;
  }

  const key = await deriveKeyPBKDF2(seed, salt, 10_000_000, 256);
  if (debug) console.log('Key derived...');
  toggleForm(false);
  const keyBytes = await exportKey(key);

  // Convert the key to a byte array
  const hashBytes = new Uint8Array(keyBytes.buffer);

  // pattern for the password
  let passwordParts = [];
  let currentLength = 0;
  let hashIndex = 3;

  while (currentLength < length - 2) {
    const dynamicLength = 3 + (hashBytes[hashIndex] % 3); // 3–5 znakov
    const word = generateWord(hashBytes, hashIndex, dynamicLength);

    passwordParts.push(word);
    currentLength += Array.from(word).length;
    hashIndex += dynamicLength;

    if (hashIndex < hashBytes.length) {
      const special = specials[hashBytes[hashIndex++] % specials.length];
      passwordParts.push(special);
      currentLength += 1;
    }
  }

  // Spojíme a skrátime heslo s rešpektovaním Unicode znakov
  let password = passwordParts.join('');
  const passwordArray = Array.from(password);
  password = passwordArray.slice(0, length - 2).join('');

  // Add numbers to the end of the password
  const numberSet = NUMBERS[0]; // Použijeme prvú sadu číslic
  const number1 = numberSet[hashBytes[1] % numberSet.length];
  const number2 = numberSet[hashBytes[2] % numberSet.length];
  password += `${number1}${number2}`;

  passwordOutputEl.value = password;
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

async function generateSHA256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray;
}

// Univerzálna funkcia na generovanie slov
function generateWord(hashBytes, startIndex, wordLength = 4) {
  let word = '';
  let setIndex = 0;

  for (let i = 0; i < wordLength; i++) {
    const currentSet = CHARSET[setIndex % CHARSET.length];
    const charArray = Array.from(currentSet);
    const c = charArray[hashBytes[startIndex + i] % charArray.length];
    word += c;

    if (CHARSET.length > 1) {
      setIndex = (setIndex + 1) % CHARSET.length;
    }
  }

  // Ak je prvý znak písmeno, transformuj na veľké; inak ho nechaj nezmenený
  if (word && /[a-zA-Z]/.test(word.charAt(0))) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  return word;
}

function toggleForm(disabled = true) {
  const formElements = document.querySelectorAll('#password-form input, #password-form select, #password-form button');
  formElements.forEach((el) => {
    el.disabled = disabled;
  });
}

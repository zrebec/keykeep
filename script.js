import { deriveKeyPBKDF2, exportKey, BASE_SPECIALS, EXTENDED_SPECIALS, NUMBERS, VOWELS, CONSONANTS } from './crypto.js';

const debug = true; // Set to true for debugging

// Register service worker for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => { if (debug) console.log('ServiceWorker registered') })
            .catch(err => { if (debug) console.error('ServiceWorker registration failed:', err) });
    });
}

// Vysvetlenie:
// Rozdelenie konstant pre chars alebo okomentovanie, pripadne "rozbitie funckie" pre generovanie heslo na viac blokov
// Web workeer vlakno - Bolo mi doporucene, ze je to lepsie riesenie pre generovanie hesla, ale neviem ako to spravit


const passwordForm = document.getElementById('password-form');

const seedInputEl = document.getElementById('seed-input');
const domainInputEl = document.getElementById('domain-input');
const usernameEl = document.getElementById('username-input');
const passwordVariationEl = document.getElementById('variation-select');
const passwordLengthEl = document.getElementById("length-select");

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
    navigator.clipboard.writeText(inputEl.value)
        .then(() => {
            btnEl.textContent = '✅';
            setTimeout(() => btnEl.textContent = '📋', 1500);
        })
        .catch(err => console.error('Copy failed:', err));
}

clearFormBtn.addEventListener('click', () => passwordForm.reset());

passwordForm.addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent form submission

    // get the selected options
    const seed = seedInputEl.value;
    const domain = domainInputEl.value;
    const login = usernameEl.value;
    // prettier-ignore
    const variation = parseInt(passwordVariationEl.value);
    // prettier-ignore
    const length = parseInt(passwordLengthEl.value);

    // generate SHA256 hash
    //const hashBytes = await generateSHA256(`${seed}::${domain}::${login}`);

    // derive the key using PBKDF2
    toggleForm(true);
    if (debug) console.log('Deriving key...');

    await yieldToUI(); // Yield to the UI to allow the form to update

    // Declare the charset based on the selected options
    let specials = BASE_SPECIALS;

    let salt = `${domain.toLowerCase()}::${login.toLowerCase()}`;
    if (variation !== 0) specials += EXTENDED_SPECIALS;

    if (variation === 2) {
        salt += `::${variation}`;
    }

    const key = await deriveKeyPBKDF2(seed, salt, 10_000_000, 256);
    if (debug) console.log('Key derived...');
    toggleForm(false);
    const keyBytes = await exportKey(key);

    // Convert the key to a byte array
    const hashBytes = new Uint8Array(keyBytes.buffer); // Convert ArrayBuffer to Uint8Array

    // pattern for the password
    let passwordParts = [];
    let currentLength = 0;
    let hashIndex = 3;

    while (currentLength < length - 2) {
        // 3 - 5 characters long word
        const dynamicLength = 3 + (hashBytes[hashIndex] % 3); // 3–5 znakov
        const word = generateWord(hashBytes, hashIndex, dynamicLength);

        // add a word to the password even if we have to exceed the required password length (more rather than less)
        passwordParts.push(word);
        currentLength += word.length;
        hashIndex += dynamicLength;

        // Always add a special character if the password hasn't been significantly exceeded yet
        // We don't test exactly at the boundary - we don't mind exceeding the length
        if (hashIndex < hashBytes.length) {
            const special = specials[hashBytes[hashIndex++] % specials.length];
            passwordParts.push(special);
            currentLength += 1;
        }
    }

    let password = passwordParts.join('').slice(0, length - 2);

    // Add numbers to the end of the password
    const number1 = NUMBERS[hashBytes[1] % NUMBERS.length];
    const number2 = NUMBERS[hashBytes[2] % NUMBERS.length];
    password += `${number1}${number2}`;
    currentLength += 2;

    passwordOutputEl.value = password;
    copyPasswordBtn.focus();
});



// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
    const isHidden = passwordOutputEl.type === 'password';
    if (isHidden) {
        // Zobraziť heslo
        passwordOutputEl.type = 'text';
        togglePasswordBtn.style.backgroundColor = 'green';
        togglePasswordBtn.setAttribute('aria-label', 'Hide password');
        // Automatické skrytie po 2.5s
        setTimeout(() => {
            passwordOutputEl.type = 'password';
            togglePasswordBtn.textContent = '👁️';
            togglePasswordBtn.style.backgroundColor = 'grey';
            togglePasswordBtn.setAttribute('aria-label', 'Show password');
        }, 2500);
    } else {
        // Okamžite skryť heslo (pred uplynutím timeoutu)
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

// pseudo-word generator
function generateWord(hashBytes, startIndex, wordLength = 4) {
    let word = '';
    let useVowel = false;

    for (let i = 0; i < wordLength; i++) {
        const set = useVowel ? VOWELS : CONSONANTS;
        const c = set[hashBytes[startIndex + i] % set.length];
        word += c;
        const lastTwo = word.slice(-2).split('');
        const onlyConsonants = lastTwo.every((ch) => CONSONANTS.includes(ch));
        useVowel = !useVowel || onlyConsonants;
    }

    return word.charAt(0).toUpperCase() + word.slice(1); // začína veľkým písmenom
}

function toggleForm(disabled = true) {
    const formElements = document.querySelectorAll('#password-form input, #password-form select, #password-form button');
    formElements.forEach((el) => {
        el.disabled = disabled;
    });
}

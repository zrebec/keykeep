// Register service worker for offline support
/*
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js');
}
*/

document.addEventListener('DOMContentLoaded', function () {
    const passwordForm = document.getElementById('password-form');

    const userSeedInput = document.getElementById('userSeed');
    const userLoginInput = document.getElementById('userLogin');
    const passwordDomainInput = document.getElementById('passwordDomain');
    const generatedPasswordInput = document.getElementById('generatedPassword');

    const toggleBtn = document.getElementById('togglePasswordBtn');
    const copyPasswordBtn = document.getElementById('copyPasswordBtn');
    const copyUserLoginBtn = document.getElementById('copyUserLoginBtn');
    const clearFormBtn = document.getElementById('clearFormBtn');

    window.onload = function () {
        userSeedInput.focus();
    };

    async function yieldToUI() {
        return new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Add keyboard accessibility for the password copy button
    copyPasswordBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });

    // Add keyboard accessibility for the user login copy button
    copyUserLoginBtn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });

    clearFormBtn.addEventListener('click', () => {
        passwordForm.reset();
        generatedPasswordInput.value = '';
    });

    passwordForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent form submission

        // get the selected options
        const seed = userSeed.value;
        const domain = passwordDomainInput.value;
        const login = userLoginInput.value;
        // prettier-ignore
        const variation = parseInt(document.getElementById('passwordVariation').value);
        // prettier-ignore
        const length = parseInt(document.getElementById("passwordLength").value);

        // generate SHA256 hash
        //const hashBytes = await generateSHA256(`${seed}::${domain}::${login}`);

        // derive the key using PBKDF2
        toggleForm(true);
        console.log('Deriving key...');

        await yieldToUI(); // Yield to the UI to allow the form to update

        // Declare the charset based on the selected options
        let specials = '.,/*-';
        const numbers = '0123456789';

        let salt = `${domain.toLowerCase()}::${login.toLowerCase()}`;
        if (variation == 0) {
            specials = '.,';
        } else if (variation == 2) {
            salt += `::${variation}`;
        }

        const key = await deriveKeyPBKDF2(seed, salt, 10000000, 256);
        console.log('Key derivated...');
        toggleForm(false);
        userSeedInput.disabled = false;
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
        const number1 = numbers[hashBytes[1] % numbers.length];
        const number2 = numbers[hashBytes[2] % numbers.length];
        password += `${number1}${number2}`;
        currentLength += 2;

        generatedPasswordInput.value = password;
        copyPasswordBtn.focus();
    });



    // Toggle password visibility
    toggleBtn.addEventListener('click', () => {
        const isPassword = generatedPasswordInput.type === 'password';
        generatedPasswordInput.type = isPassword ? 'text' : 'password';
        toggleBtn.style.backgroundColor = 'green';
        if (isPassword) {
            setTimeout(() => {
                generatedPasswordInput.type = 'password';
                toggleBtn.textContent = '👁️';
                toggleBtn.style.backgroundColor = 'grey';
                toggleBtn.setAttribute('aria-label', 'Show password');
            }, 2500);
        }
    });

    // Add copy password button functionality
    copyPasswordBtn.addEventListener('click', function () {
        if (!generatedPasswordInput.value) return;

        navigator.clipboard
            .writeText(generatedPasswordInput.value)
            .then(() => {
                this.textContent = '✅'; // feedback
                setTimeout(() => (this.textContent = '📋'), 1500);
            })
            .catch((err) => {
                console.error('Copy failed:', err);
            });
    });

    // Add copy userLogin button functionality
    copyUserLoginBtn.addEventListener('click', function () {
        if (!userLoginInput.value) return;

        navigator.clipboard
            .writeText(userLoginInput.value)
            .then(() => {
                this.textContent = '✅'; // feedback
                setTimeout(() => (this.textContent = '📋'), 1500);
            })
            .catch((err) => {
                console.error('Copy failed:', err);
            });
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
        const vowels = 'aeiou';
        const consonants = 'bcdfghjklmnpqrstvwxz';
        let word = '';
        let useVowel = false;

        for (let i = 0; i < wordLength; i++) {
            const set = useVowel ? vowels : consonants;
            const c = set[hashBytes[startIndex + i] % set.length];
            word += c;
            const lastTwo = word.slice(-2).split('');
            const onlyConsonants = lastTwo.every((ch) => consonants.includes(ch));
            useVowel = !useVowel || onlyConsonants;
        }

        return word.charAt(0).toUpperCase() + word.slice(1); // začína veľkým písmenom
    }

    // better deriveKey function using PBKDF2
    async function deriveKeyPBKDF2(password, salt, iterations = 100000, keyLength = 256) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, [
            'deriveBits',
            'deriveKey',
        ]);
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: enc.encode(salt),
                iterations: iterations,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: keyLength },
            true,
            ['encrypt', 'decrypt'],
        );
        return key;
    }

    async function exportKey(key) {
        // Exportuje kľúč vo formáte "raw" (ArrayBuffer)
        const rawKey = await crypto.subtle.exportKey('raw', key);
        // Prekonvertujeme ArrayBuffer na Uint8Array pre jednoduchšie spracovanie
        const keyBytes = new Uint8Array(rawKey);
        return keyBytes;
    }

    function toggleForm(disabled = true) {
        const formElements = document.querySelectorAll('#password-form input, #password-form select, #password-form button');
        formElements.forEach((el) => {
            el.disabled = disabled;
        });
    }
});
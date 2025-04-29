// better deriveKey function using PBKDF2
export async function deriveKeyPBKDF2(password, salt, iterations = 500000, keyLength = 256) {
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

export function getSalt(domain, login, variation) {
  let salt = `${domain.toLowerCase()}::${login.toLowerCase()}`;
  if (variation > 1) salt += `::${variation}`;
  return salt;
}

export async function exportKey(key) {
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const keyBytes = new Uint8Array(rawKey);
  return keyBytes;
}

export async function generatePasswordOld(hashBytes, length, charsetArr, numbersArr, specialsArr) {
  let passwordParts = [];
  let currentLength = 0;
  let hashIndex = 3;

  while (currentLength < length - 2) {
    const dynamicLength = 3 + (hashBytes[hashIndex] % 3); // 3–5 znakov
    const word = generateWord(hashBytes, hashIndex, dynamicLength, charsetArr);
    passwordParts.push(word);
    currentLength += Array.from(word).length;
    hashIndex += dynamicLength;

    if (hashIndex < hashBytes.length) {
      const special = specialsArr[hashBytes[hashIndex++] % specialsArr.length];
      passwordParts.push(special);
      currentLength += 1;
    }
  }

  let password = passwordParts.join('');
  const passwordArray = Array.from(password);
  password = passwordArray.slice(0, length - 2).join('');

  const number1 = numbersArr[hashBytes[1] % numbersArr.length];
  const number2 = numbersArr[hashBytes[2] % numbersArr.length];
  password += `${number1}${number2}`;
  return password;
}

export async function generatePassword(hashBytes, length, charsetArr, numbersArr, specialsArr, domain, login, variation = 1) {
  let passwordParts = [];
  let currentLength = 0;
  let hashIndex = 3;

  const configHash = await generateSHA256(getSalt(domain, login, variation));
  const numPosition = configHash[0] % length;
  const addSpecialChance = configHash[1] % 100 < 50;

  while (currentLength < length - 2) {
    const dynamicLength = 3 + (hashBytes[hashIndex] % 5); // 3–7 znakov
    const word = generateWord(hashBytes, hashIndex, dynamicLength, charsetArr);
    passwordParts.push(word);
    currentLength += Array.from(word).length;
    hashIndex += dynamicLength;

    if (currentLength < length - 2 && addSpecialChance && hashIndex < hashBytes.length) {
      const special = specialsArr[hashBytes[hashIndex++] % specialsArr.length];
      passwordParts.push(special);
      currentLength += 1;
    }
  }

  let password = passwordParts.join('');
  const passwordArray = Array.from(password);

  const number1 = numbersArr[hashBytes[1] % numbersArr.length];
  const number2 = numbersArr[hashBytes[2] % numbersArr.length];
  passwordArray.splice(numPosition, 0, number1, number2);
  password = passwordArray.join('');

  password = passwordArray.slice(0, length).join('');
  return password;
}

function generateWord(hashBytes, startIndex, wordLength = 4, charsetArr) {
  let word = '';
  let setIndex = 0;

  for (let i = 0; i < wordLength; i++) {
    const currentSet = charsetArr[setIndex % charsetArr.length];
    const c = currentSet[hashBytes[startIndex + i] % currentSet.length];
    word += c;
    if (charsetArr.length > 1) {
      setIndex = (setIndex + 1) % charsetArr.length;
    }
  }

  if (word && /[a-zA-Z]/.test(word.charAt(0))) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  return word;
}

async function generateSHA256(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray;
}

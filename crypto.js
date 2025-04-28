// define custom charsets
export const BASE_SPECIALS = ',.';
export const EXTENDED_SPECIALS = '/*-';
export const NUMBERS = '0123456789';
export const VOWELS = 'aeiou';
export const CONSONANTS = 'bcdfghjklmnpqrstvwxz';

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

export async function exportKey(key) {
    // Exportuje kľúč vo formáte "raw" (ArrayBuffer)
    const rawKey = await crypto.subtle.exportKey('raw', key);
    // Prekonvertujeme ArrayBuffer na Uint8Array pre jednoduchšie spracovanie
    const keyBytes = new Uint8Array(rawKey);
    return keyBytes;
}
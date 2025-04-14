# KeyKeep 🔐

**KeyKeep** is a lightweight, deterministic password generator that never stores your secrets and requires nothing more than your brain and a browser.

---

## ✨ Features

- 🔒 Deterministic password generation (same input = same output)
- 🧠 Works fully offline – client-side only
- 🧩 User-controlled seed, domain, and optional login
- 🧠 Generates readable pseudo-words based on consonant/vowel patterns
- 📏 Supports fixed lengths: 8, 12, 16, 24 characters
- 🔐 Password format includes:
  - One or more words
  - Optional special characters between them
  - Ends with at least 2 digits
- 📋 Copy to clipboard button
- 📱 Fully responsive and mobile-friendly

---

## 🌍 Live demo

➡️ [Open KeyKeep on GitHub Pages](https://zrebec.github.io/keykeep/)

---

## 🚀 Getting Started

1. Clone this repo:

```bash
git clone https://github.com/zrebec/keykeep.git
```

2. Open `index.html` in your browser

> Works fully offline – no dependencies required.

---

## ⚙️ How it works (Technical Overview)

### Input

The password is generated from 3 user inputs:

- `seed`: something you remember, acting like a master key
- `domain`: usually the website (e.g., `github.com`)
- `login`: optional field, e.g., your username for that domain

These three values are combined into one string:

```
seed::domain::login
```

### Hashing

This input is hashed using **SHA-256** via the browser's native `crypto.subtle.digest`. This results in a deterministic array of 32 bytes, called `hashBytes`.

### Password Generation Logic

Based on the selected length (8, 12, 16, 24), the password generator:

- Builds **pseudo-words** from the hash using consonant/vowel alternation
- Inserts **special characters** between words (based on more bytes from the hash)
- Appends at least **two digits** at the end

Each pseudo-word:

- Has 4 letters by default
- Starts with a capital letter
- Uses strict consonant-vowel alternation (currently no more than one consonant in a row)

The total number of components is derived from the selected password length. No filler characters are added yet – the output is simply trimmed to match the exact length, if necessary.

### Example flow

For a length of 16, it might generate:

```
Loma?Fres,98
```

Where:

- `Loma` and `Fres` are generated words
- `?` and `,` are special characters
- `98` is a number generated from the hash

---

## 📦 Deploy on GitHub Pages

1. Go to your repository's **Settings → Pages**
2. Under **Source**, choose `main` branch and `/root` folder
3. Hit **Save** and wait a few seconds
4. Your site will be published at:
   `https://yourusername.github.io/keykeep/`

---

## 💡 Future ideas

- [ ] Light/dark mode
- [ ] Theming: Technocratic / Happy Corals / Standard
- [ ] Password strength indicator
- [ ] Algorithm versioning (v1, v2...) for compatibility with older passwords
- [ ] Optional keyboard shortcuts (e.g. Alt+S to focus seed)
- [ ] Lock file export for settings/usage context
- [ ] Plugin system for custom word generators (e.g. phonetic)
- [ ] Offline ZIP export (if multiple files)
- [x] PWA installable mode

---

## 🤝 Contributions

Contributions welcome! Please fork, tweak, and open a pull request.

---

## 📜 License

MIT © zrebec

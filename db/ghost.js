const SYMBOLS = ["◈","⊛","⟁","⌘","⊕","◉","※","⌬","⊞","⟐","⌖","⌑","⊗","⊘","⊙","⋈"];

function generateGhostId() {
  const a = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const b = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  return `${a}${b}`;
}

module.exports = { generateGhostId };

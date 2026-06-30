const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /bg-\[\#0F1218\]/g, replacement: 'bg-sleek-panel' },
  { regex: /bg-\[\#0f1218\]/g, replacement: 'bg-sleek-panel' },
  { regex: /bg-\[\#14181F\]/g, replacement: 'bg-sleek-card' },
  { regex: /bg-\[\#14181f\]/g, replacement: 'bg-sleek-card' },
  { regex: /bg-\[\#1A1E26\]/g, replacement: 'bg-sleek-lightcard' },
  { regex: /bg-\[\#1a1e26\]/g, replacement: 'bg-sleek-lightcard' },
  { regex: /text-\[\#A3FF12\]/g, replacement: 'text-sleek-accent' },
  { regex: /text-\[\#a3ff12\]/g, replacement: 'text-sleek-accent' },
  { regex: /bg-\[\#A3FF12\]\/10/g, replacement: 'bg-sleek-accent/10' },
  { regex: /bg-\[\#a3ff12\]\/10/g, replacement: 'bg-sleek-accent/10' },
  { regex: /bg-\[\#A3FF12\]\/5/g, replacement: 'bg-sleek-accent/5' },
  { regex: /bg-\[\#a3ff12\]\/5/g, replacement: 'bg-sleek-accent/5' },
  { regex: /bg-\[\#A3FF12\]/g, replacement: 'bg-sleek-accent' },
  { regex: /bg-\[\#a3ff12\]/g, replacement: 'bg-sleek-accent' },
  { regex: /border-\[\#A3FF12\]\/20/g, replacement: 'border-sleek-accent/20' },
  { regex: /border-\[\#a3ff12\]\/20/g, replacement: 'border-sleek-accent/20' },
  { regex: /border-\[\#A3FF12\]/g, replacement: 'border-sleek-accent' },
  { regex: /border-\[\#a3ff12\]/g, replacement: 'border-sleek-accent' },
  { regex: /hover:text-\[\#A3FF12\]/g, replacement: 'hover:text-sleek-accent' },
  { regex: /hover:text-\[\#a3ff12\]/g, replacement: 'hover:text-sleek-accent' },
  { regex: /hover:bg-\[\#A3FF12\]/g, replacement: 'hover:bg-sleek-accent' },
  { regex: /hover:bg-\[\#a3ff12\]/g, replacement: 'hover:bg-sleek-accent' },
  { regex: /bg-white\/5/g, replacement: 'bg-sleek-overlay' },
  { regex: /bg-white\/10/g, replacement: 'bg-sleek-overlay-hover' },
  { regex: /hover:bg-white\/5/g, replacement: 'hover:bg-sleek-overlay' },
  { regex: /hover:bg-white\/10/g, replacement: 'hover:bg-sleek-overlay-hover' },
  { regex: /border-white\/5/g, replacement: 'border-sleek-border' },
  { regex: /border-white\/10/g, replacement: 'border-sleek-border' },
  { regex: /text-white\/30/g, replacement: 'text-sleek-text-muted' },
  { regex: /text-white\/40/g, replacement: 'text-sleek-text-muted' },
  { regex: /text-white\/45/g, replacement: 'text-sleek-text-muted' },
  { regex: /text-white\/50/g, replacement: 'text-sleek-text-muted' },
  { regex: /text-white\/60/g, replacement: 'text-sleek-text-muted' },
  { regex: /text-white\/70/g, replacement: 'text-sleek-text-muted' },
  { regex: /text-white\/80/g, replacement: 'text-sleek-text-muted' },
  { regex: /shadow-xl/g, replacement: 'shadow-sleek-xl' },
  { regex: /shadow-2xl/g, replacement: 'shadow-sleek-2xl' },
  { regex: /text-\[10px\]/g, replacement: 'text-xs' },
  { regex: /text-\[11px\]/g, replacement: 'text-xs' },
  { regex: /focus:ring-\[\#A3FF12\]/g, replacement: 'focus:ring-sleek-accent' },
  { regex: /shadow-\[\#A3FF12\]/g, replacement: 'shadow-sleek-accent' },
  { regex: /ring-\[\#A3FF12\]/g, replacement: 'ring-sleek-accent' },
  { regex: /bg-\[\#0A0C10\]/g, replacement: 'bg-sleek-bg' },
  { regex: /bg-\[\#0A0D14\]/g, replacement: 'bg-sleek-bg' },
  { regex: /bg-\[\#11141D\]/g, replacement: 'bg-sleek-lightcard' },
  { regex: /from-\[\#0F1218\]/g, replacement: 'from-sleek-panel' },
  { regex: /to-\[\#141824\]/g, replacement: 'to-sleek-card' },
  { regex: /bg-\[\#161B26\]/g, replacement: 'bg-sleek-card' },
  { regex: /bg-\[\#1A1E29\]/g, replacement: 'bg-sleek-lightcard' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      for (const rep of replacements) {
        content = content.replace(rep.regex, rep.replacement);
      }
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
      }
    }
  }
}

processDirectory(directoryPath);
console.log("Done");

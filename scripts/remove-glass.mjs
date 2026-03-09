import fs from 'fs';
import path from 'path';

// Target directory
const targetDir = path.resolve('./src');

// Glassmorphism classes to replace and their solid design equivalents
const replacements = [
    // Floating / Panels (need to stay floating, but using solid semantic tokens)
    { regex: /\bglass-overlay\b/g, replacement: 'bg-popover/95 backdrop-blur-md border-border shadow-lg' },
    { regex: /\bglass-sidebar\b/g, replacement: 'bg-popover/95 backdrop-blur-md border-border shadow-lg' },
    { regex: /\bglass-modal\b/g, replacement: 'bg-popover/95 backdrop-blur-md border-border shadow-xl rounded-2xl' },
    { regex: /\bglass-floating\b/g, replacement: 'bg-popover/95 backdrop-blur-md border-border shadow-lg' },

    // Standard Surfaces / Cards
    { regex: /\bglass-surface\b/g, replacement: 'bg-card border-border shadow-sm' },
    { regex: /\bglass-panel\b/g, replacement: 'bg-card border-border shadow-sm' },
    { regex: /\bglass-card\b/g, replacement: 'bg-card border-border shadow-sm rounded-2xl p-6 hover:shadow-md transition-all' },
    { regex: /\bglass-base\b/g, replacement: 'bg-card border-border shadow-sm' },

    // Buttons and Inputs
    { regex: /\bglass-input\b/g, replacement: 'bg-background border-input focus:ring-2 focus:ring-ring focus:border-input' },
    { regex: /\bglass-btn-primary\b/g, replacement: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors rounded-xl px-6 py-2.5 font-medium' },
    { regex: /\bglass-btn\b/g, replacement: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm transition-colors rounded-xl px-6 py-2.5 font-medium' },

    // Base glass class
    { regex: /\bglass\b(?!\-)/g, replacement: 'bg-card border-border shadow-sm' },
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    let totalModifications = 0;

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            totalModifications += processDirectory(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            let fileModifications = 0;
            for (const { regex, replacement } of replacements) {
                const matches = content.match(regex);
                if (matches) {
                    fileModifications += matches.length;
                    content = content.replace(regex, replacement);
                }
            }

            if (fileModifications > 0) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Modified: ${fullPath} (${fileModifications} replacements)`);
                totalModifications += fileModifications;
            }
        }
    }

    return totalModifications;
}

console.log('Starting glassmorphism removal...');
const modifiedCount = processDirectory(targetDir);
console.log(`\nDone! Total replacements made: ${modifiedCount}`);

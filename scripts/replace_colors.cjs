const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('c:/Users/ariaz/OneDrive/Documents/GitHub/state-track/src');
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content
        // Convert primary UI blues
        .replace(/\bbg-blue-(?:500|600|700|800|900)\b/g, 'bg-primary')
        .replace(/\btext-blue-(?:500|600|700|800|900)\b/g, 'text-primary')
        .replace(/\bborder-blue-(?:500|600|700|800|900)\b/g, 'border-primary')

        // Convert neutral grays
        .replace(/\btext-gray-(?:400|500|600)\b/g, 'text-muted-foreground')
        .replace(/\btext-gray-(?:700|800|900)\b/g, 'text-foreground')
        .replace(/\bbg-gray-(?:50|100|200|800|900)\b/g, 'bg-muted')
        .replace(/\bborder-gray-(?:200|300|700|800)\b/g, 'border-border')

        // Convert random opacities from old hardcoded classes
        .replace(/\bbg-blue-[0-9]{3}\/[0-9]+\b/g, 'bg-primary/20')
        .replace(/\btext-blue-[0-9]{3}\/[0-9]+\b/g, 'text-primary')
        .replace(/\bborder-blue-[0-9]{3}\/[0-9]+\b/g, 'border-primary/30')

        .replace(/\bbg-gray-[0-9]{3}\/[0-9]+\b/g, 'bg-muted/50')
        .replace(/\bborder-gray-[0-9]{3}\/[0-9]+\b/g, 'border-border/50');

    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        changedFiles++;
    }
});

console.log(`Successfully updated ${changedFiles} files with semantic theme classes.`);

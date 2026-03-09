import fs from 'fs';
import path from 'path';

// Target directory
const targetDir = path.resolve('./src/features/map');

// Border classes to replace
const replacements = [
    { regex: /\bborder-white\/[0-9]+\b/g, replacement: 'border-border' },
    { regex: /\bborder-black\/[0-9]+\b/g, replacement: 'border-border' },
    { regex: /\bshadow-2xl\b/g, replacement: 'shadow-lg' },
    { regex: /\bshadow-xl\b/g, replacement: 'shadow-md' },
    { regex: /\bbackdrop-blur-(sm|md|lg|xl)\b/g, replacement: '' }
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    let totalModifications = 0;

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            totalModifications += processDirectory(fullPath);
        } else if (file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            let fileModifications = 0;
            for (const { regex, replacement } of replacements) {
                const matches = content.match(regex);
                if (matches) {
                    fileModifications += matches.length;
                    content = content.replace(regex, replacement);
                }
            }

            // Cleanup double border-border if it accidentally happened or excessive spaces
            content = content.replace(/\bborder-border border-border\b/g, 'border-border');
            content = content.replace(/ \s+/g, ' ');
            content = content.replace(/ className=" "/g, '');

            if (fileModifications > 0) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Modified borders/shadows: ${file} (${fileModifications} replacements)`);
                totalModifications += fileModifications;
            }
        }
    }

    return totalModifications;
}

console.log('Starting border and shadow simplification...');
const modifiedCount = processDirectory(targetDir);
console.log(`\nDone! Total replacements made: ${modifiedCount}`);

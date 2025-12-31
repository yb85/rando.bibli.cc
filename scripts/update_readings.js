
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import biblePlan. Since it's an ES export, we can import it directly if we set type: module, 
// or read it as text and evaluate/parse. Since it's a simple array, let's try dynamic import? 
// Actually, data.js might have other dependencies or just raw data. 
// Let's rely on reading the file and extracting the JSON-like structure or importing it if allow.
// The easiest way for a script in the same project is to just import it.
import { biblePlan } from '../src/lib/data.js';

const READINGS_DIR = path.resolve(__dirname, '../public/readings');
const PSALMS_DIR = path.resolve(__dirname, '../Psalms_Hebrew');

// Hebrew -> Greek Mapping for Display
// Logic:
// 1-8 -> 1-8
// 9, 10 -> 9
// 11-113 -> 10-112 (-1)
// 114, 115 -> 113
// 116 -> 114, 115 (This is tricky for display. If it's 116:1-9 -> 114, 116:10-19 -> 115. But user said "put in parenthesis within the chnum span the greek psalm numbering after the hebrew one")
// 117-146 -> 116-145 (-1)
// 147 -> 146, 147
// 148-150 -> 148-150

function getGreekNumber(hebrewNum, verseNum = 1) {
    const n = parseInt(hebrewNum);
    if (n >= 1 && n <= 8) return n.toString();
    if (n === 9 || n === 10) return "9";
    if (n >= 11 && n <= 113) return (n - 1).toString();
    if (n === 114 || n === 115) return "113";
    if (n === 116) {
        // This depends on the verse. But usually the header applies to the whole block.
        // If we are printing the header for Ps 116, it effectively covers Greek 114 & 115.
        // Let's return "114-115" or just handle it based on verse context if needed.
        // However, the request says "put in parenthesis ... greek psalm numbering".
        // For Ps 116, it might be 114 if v1-9, 115 if v10+.
        // But the header usually appears once. Check if data.js splits them.
        return "114-115";
    }
    if (n >= 117 && n <= 146) return (n - 1).toString();
    if (n === 147) return "146-147";
    if (n >= 148 && n <= 150) return n.toString();
    return "";
}

// Function to refine greek number if we know verses
function getGreekNumberForRange(hebrewNum, startVerse, endVerse) {
    const n = parseInt(hebrewNum);
    if (n === 116) {
        if (endVerse <= 9) return "114";
        if (startVerse >= 10) return "115";
        return "114-115";
    }
    if (n === 147) {
        if (endVerse <= 11) return "146";
        if (startVerse >= 12) return "147";
        return "146-147";
    }
    return getGreekNumber(hebrewNum);
}


async function processDay(dayPlan) {
    const dayId = dayPlan.day.toString().padStart(3, '0');
    const filename = `day${dayId}.html`;
    const filePath = path.join(READINGS_DIR, filename);

    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filename}`);
        return;
    }

    let htmlContent = fs.readFileSync(filePath, 'utf8');

    // Find Psalm reading in plan
    // Format in data.js: "Psaumes 19", "Psaumes 119:1-56"
    const psalmEntry = dayPlan.readings.find(r => r.startsWith('Psaumes'));
    if (!psalmEntry) return;

    // Parse Psalm Entry
    // "Psaumes 19" -> num: 19, start: null, end: null
    // "Psaumes 119:1-56" -> num: 119, start: 1, end: 56
    const match = psalmEntry.match(/Psaumes\s+(\d+)(?::\s*(\d+)-(\d+))?/);
    if (!match) {
        console.warn(`Could not parse psalm entry: ${psalmEntry}`);
        return;
    }

    const psalmNum = parseInt(match[1]);
    const startVerse = match[2] ? parseInt(match[2]) : 1;
    const endVerse = match[3] ? parseInt(match[3]) : 9999; // 9999 as effectively end

    // Read Psalm File
    const psalmFile = `Ps_${psalmNum}.tsv`;
    const psalmPath = path.join(PSALMS_DIR, psalmFile);

    if (!fs.existsSync(psalmPath)) {
        console.warn(`Psalm file missing: ${psalmPath}`);
        return;
    }

    const tsvContent = fs.readFileSync(psalmPath, 'utf8');
    const lines = tsvContent.split('\n').filter(l => l.trim() !== '');

    let newHtml = `<section class="psalm">\n<h3>${psalmEntry}</h3>\n`;

    let isFirst = true;

    for (const line of lines) {
        // Line format: "	<span class="text-danger">01</span> Text..."
        // We need to extract verse number and text.
        // Regex to extract verse number from the span
        const vMatch = line.match(/class="text-danger">(\d+)<\/span>\s*(.*)/);
        if (!vMatch) continue;

        const vNum = parseInt(vMatch[1]);
        const text = vMatch[2].trim();

        if (vNum >= startVerse && vNum <= endVerse) {

            // Format: <span class="verse"><span class="chnum">Ps 19</span><span class="vnum">2</span> Text...</span>
            // Actually, usually chnum is only on the first verse shown?
            // Looking at day001.html:
            // <span class="verse"><span class="chnum">Gn 1</span><span class="vnum">1</span> Text</span>
            // <span class="verse"><span class="vnum">2</span> Text</span>

            // Wait, for Psalm 19 in day001.html:
            // <span class="verse"><span class="chnum">Ps 19</span><span class="vnum">2</span> Que le Seigneur...</span>

            // User requirement: "put in parenthesis within the chnum span the greek psalm numbering after the hebrew one"
            // So: <span class="chnum">Ps 19 (18)</span>

            let spanContent = '';
            if (isFirst) {
                const greekNum = getGreekNumberForRange(psalmNum, startVerse, endVerse);
                const label = greekNum ? `Ps ${psalmNum} (${greekNum})` : `Ps ${psalmNum}`;
                spanContent += `<span class="chnum">${label}</span>`;
                isFirst = false;
            }

            spanContent += `<span class="vnum">${vNum}</span> ${text}`;
            newHtml += `<span class="verse">${spanContent}</span>\n`;
        }
    }

    newHtml += `</section>`;

    // Replace in file
    // Regex to find <section class="psalm"> ... </section>
    // Note: parsed html might be safer but regex is okay if structure is consistent.
    // The structure is <section class="psalm"> ... </section>

    const sectionRegex = /<section class="psalm">[\s\S]*?<\/section>/;
    if (htmlContent.match(sectionRegex)) {
        const updatedHtml = htmlContent.replace(sectionRegex, newHtml);
        fs.writeFileSync(filePath, updatedHtml);
        console.log(`Updated ${filename}`);
    } else {
        console.warn(`No psalm section found in ${filename}`);
    }
}

async function run() {
    for (const day of biblePlan) {
        await processDay(day);
    }
}

run();


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '../Psalms');
const DEST_DIR = path.resolve(__dirname, '../Psalms_Hebrew');

if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR);
}

// Ensure source exists
if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
}

// Logic Mapping (Greek -> Hebrew)
// 1-8 -> 1-8 (Copy)
// 9A -> 9 (Rename)
// 9B -> 10 (Rename)
// 10-112 -> 11-113 (Shift +1)
// 113A -> 114 (Rename)
// 113B -> 115 (Rename)
// 114 + 115 -> 116 (Merge)
// 116-145 -> 117-146 (Shift +1)
// 146 + 147 -> 147 (Merge)
// 148-150 -> 148-150 (Copy)

const jobs = [];

// 1-8 -> 1-8
for (let i = 1; i <= 8; i++) {
    jobs.push({ op: 'copy', src: `Ps_${i}.tsv`, dest: `Ps_${i}.tsv` });
}

// 9A -> 9, 9B -> 10
jobs.push({ op: 'copy', src: 'Ps_9A.tsv', dest: 'Ps_9.tsv' });
jobs.push({ op: 'copy', src: 'Ps_9B.tsv', dest: 'Ps_10.tsv' });

// 10-112 -> 11-113
for (let i = 10; i <= 112; i++) {
    jobs.push({ op: 'copy', src: `Ps_${i}.tsv`, dest: `Ps_${i + 1}.tsv` });
}

// 113A -> 114, 113B -> 115
jobs.push({ op: 'copy', src: 'Ps_113A.tsv', dest: 'Ps_114.tsv' });
jobs.push({ op: 'copy', src: 'Ps_113B.tsv', dest: 'Ps_115.tsv' });

// 114 + 115 -> 116
jobs.push({ op: 'merge', src: ['Ps_114.tsv', 'Ps_115.tsv'], dest: 'Ps_116.tsv' });

// 116-145 -> 117-146
for (let i = 116; i <= 145; i++) {
    jobs.push({ op: 'copy', src: `Ps_${i}.tsv`, dest: `Ps_${i + 1}.tsv` });
}

// 146 + 147 -> 147
// Wait, Hebrew 147 is composed of Greek 146 and 147.
// The table said: 147:1-11 (Greek 146), 147:12-29 (Greek 147)
// So we merge Greek 146 and 147 into Hebrew 147.
jobs.push({ op: 'merge', src: ['Ps_146.tsv', 'Ps_147.tsv'], dest: 'Ps_147.tsv' });

// 148-150 -> 148-150
for (let i = 148; i <= 150; i++) {
    jobs.push({ op: 'copy', src: `Ps_${i}.tsv`, dest: `Ps_${i}.tsv` });
}

// Execution
async function run() {
    console.log(`Processing ${jobs.length} jobs...`);

    for (const job of jobs) {
        try {
            if (job.op === 'copy') {
                const srcPath = path.join(SOURCE_DIR, job.src);
                const destPath = path.join(DEST_DIR, job.dest);

                if (!fs.existsSync(srcPath)) {
                    console.warn(`Warning: Source file missing ${job.src}`);
                    continue;
                }

                const content = fs.readFileSync(srcPath, 'utf8');
                fs.writeFileSync(destPath, content);
                console.log(`Copied ${job.src} -> ${job.dest}`);
            }
            else if (job.op === 'merge') {
                const destPath = path.join(DEST_DIR, job.dest);
                let mergedContent = '';

                for (const srcFile of job.src) {
                    const srcPath = path.join(SOURCE_DIR, srcFile);
                    if (!fs.existsSync(srcPath)) {
                        console.warn(`Warning: Source file for merge missing ${srcFile}`);
                        continue;
                    }
                    const content = fs.readFileSync(srcPath, 'utf8');
                    // Ensure newline between files if missing
                    mergedContent += content;
                    if (!content.endsWith('\n')) {
                        mergedContent += '\n';
                    }
                }

                fs.writeFileSync(destPath, mergedContent);
                console.log(`Merged [${job.src.join(', ')}] -> ${job.dest}`);
            }
        } catch (err) {
            console.error(`Error processing job ${JSON.stringify(job)}:`, err);
        }
    }
    console.log('Transformation complete.');
}

run();

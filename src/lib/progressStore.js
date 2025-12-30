
import { writable } from 'svelte/store';
import { openDB } from 'idb';

const DB_NAME = 'BiblePlanDB';
const STORE_NAME = 'readings';

function createProgressStore() {
    const { subscribe, set, update } = writable({});

    async function initDB() {
        const db = await openDB(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            },
        });

        const allKeys = await db.getAllKeys(STORE_NAME);
        const allValues = await db.getAll(STORE_NAME);

        const state = {};
        allKeys.forEach((key, index) => {
            state[key] = allValues[index]; // value is status string: "todo", "inprogress", "done"
        });
        set(state);
        return db;
    }

    const dbPromise = initDB();

    async function updateStatus(dayId, status) {
        // Optimistic UI update
        update(n => {
            if (n[dayId] === status) return n; // No change
            return { ...n, [dayId]: status };
        });

        const db = await dbPromise;
        await db.put(STORE_NAME, status, dayId);
    }

    async function markAllReadUntil(dayId) {
        // dayId format "Day 1", "Day 365" etc. Need to parse number.
        const currentDayNum = parseInt(dayId.replace('Day ', ''));

        update(n => {
            const newState = { ...n };
            for (let i = 1; i <= currentDayNum; i++) {
                newState[`Day ${i}`] = 'done';
            }
            return newState;
        });

        const db = await dbPromise;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        for (let i = 1; i <= currentDayNum; i++) {
            store.put('done', `Day ${i}`);
        }
        await tx.done;
    }

    async function resetProgress() {
        set({});
        const db = await dbPromise;
        await db.clear(STORE_NAME);
    }

    return {
        subscribe,
        updateStatus,
        markAllReadUntil,
        resetProgress
    };
}

export const progress = createProgressStore();

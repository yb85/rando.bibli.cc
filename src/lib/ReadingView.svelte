<script>
    import { fly } from "svelte/transition";
    import { createEventDispatcher } from "svelte";
    import { onMount } from "svelte";
    import { biblePlan } from "./data.js";
    import PodcastPlayer from "./PodcastPlayer.svelte";

    import { progress } from "./progressStore.js";
    import { onDestroy } from "svelte";
    import confetti from "canvas-confetti";

    export let day;
    // day is passed as prop, e.g. 1


    export let showPodcast = true;

    const dispatch = createEventDispatcher();

    let htmlContent = "";
    let loading = true;
    let error = false;
    let currentDayData;

    // Confetti logic
    const defaults = {
        spread: 360,
        ticks: 100,
        gravity: 0,
        decay: 0.94,
        startVelocity: 30,
    };

    function shoot() {
        confetti({
            ...defaults,
            particleCount: 30,
            scalar: 1.2,
            shapes: ["circle", "square"],
            colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"],
        });

        confetti({
            ...defaults,
            particleCount: 20,
            scalar: 2,
            shapes: ["emoji"],
            shapeOptions: {
                emoji: {
                    value: ["✝️", "📖", "🙏", "🕊️", "❤️"],
                },
            },
        });
    }

    function celebrate() {
        setTimeout(shoot, 0);
        setTimeout(shoot, 100);
        setTimeout(shoot, 200);
    }

    // Fetch content on mount or when day changes
    $: if (day) {
        loadContent(day);
        currentDayData = biblePlan.find((item) => item.day === day);
    }

    async function loadContent(d) {
        loading = true;
        error = false;
        try {
            // pad day to 3 digits
            const padded = d.toString().padStart(3, "0");
            const res = await fetch(`/readings/day${padded}.html`);
            if (!res.ok) throw new Error("Not found");
            htmlContent = await res.text();

            // Clean up: html contains <h2>Jour X</h2> which we can keep or style
            // The user wanted a "<--" on top.
        } catch (e) {
            console.error(e);
            error = true;
        } finally {
            loading = false;
        }
    }

    function close() {
        dispatch("close");
    }

    let searchTimer;

    // Timer logic
    // If a day has been opened for more than a minute and is not done, mark as inprogress
    function startTimer() {
        clearTimer();
        const currentStatus = $progress[`Day ${day}`];
        if (currentStatus !== "done") {
            searchTimer = setTimeout(() => {
                if ($progress[`Day ${day}`] !== "done") {
                    progress.updateStatus(`Day ${day}`, "inprogress");
                }
            }, 60000); // 1 minute
        }
    }

    function clearTimer() {
        if (searchTimer) clearTimeout(searchTimer);
    }

    // React to day change to restart timer
    $: if (day) {
        startTimer();
    }

    // Also restart if status changes back to todo/inprogress from done?
    // The requirement says "If a day has been opened for more than a minute".
    // So if I open it, timer starts.

    onDestroy(() => {
        clearTimer();
    });

    function markAsRead() {
        progress.updateStatus(`Day ${day}`, "done");
        clearTimer(); // No need to auto-set inprogress if done
        celebrate();
    }

    function markAsUnread() {
        progress.updateStatus(`Day ${day}`, "todo");
        startTimer(); // Restart timer if we go back to unread
    }
</script>

<div
    class="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto"
    transition:fly={{ y: 500, duration: 400 }}
>
    <div
        class="sticky top-0 bg-white dark:bg-gray-900 border-b dark:border-gray-700 p-4 flex items-center z-10 shadow-sm"
    >
        <button
            on:click={close}
            class="text-xl font-bold p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600"
        >
            &larr; Retour
        </button>
        <span class="ml-4 text-sm text-gray-400 font-medium">Jour {day}</span>
    </div>

    <div class="p-4 max-w-3xl mx-auto pb-20 reading-content">
        {#if loading}
            <div class="flex justify-center p-10">
                <div
                    class="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent"
                ></div>
            </div>
        {:else if error}
            <div class="text-center text-red-500 p-10">
                Erreur de chargement des lectures.
            </div>
        {:else}
            {#if showPodcast && currentDayData?.podcast}
                <div class="mb-8">
                    {#each currentDayData.podcast as pod}
                        <PodcastPlayer podcast={pod} />
                    {/each}
                </div>
            {/if}

            {@html htmlContent}

            <div class="mt-12 flex justify-center gap-4">
                {#if $progress[`Day ${day}`] !== "done"}
                    <button
                        class="text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none dark:focus:ring-green-800"
                        on:click={markAsRead}
                    >
                        Lu !
                    </button>
                {/if}

                {#if $progress[`Day ${day}`] !== "todo" && $progress[`Day ${day}`]}
                    <button
                        class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
                        on:click={markAsUnread}
                    >
                        Marquer comme non lu
                    </button>
                {/if}
            </div>

            <div
                class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center text-sm text-gray-400"
            >
                &copy; AELF 2013-{new Date().getFullYear()}
            </div>
        {/if}
    </div>
</div>

<style>
    /* Styles moved to app.css to ensure global application */
</style>

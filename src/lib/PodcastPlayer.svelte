<script>
    import { onMount } from "svelte";

    export let podcast = {};

    let audio;
    let playbackRate = 1.0;
    const speeds = [1.0, 1.25, 1.5, 2.0];

    onMount(() => {
        const storedSpeed = localStorage.getItem("bible-app-playback-speed");
        if (storedSpeed) {
            playbackRate = parseFloat(storedSpeed);
        }
    });

    function setSpeed(speed) {
        playbackRate = speed;
        if (audio) {
            audio.playbackRate = speed;
        }
        localStorage.setItem("bible-app-playback-speed", speed.toString());
    }

    function seek(seconds) {
        if (audio) {
            audio.currentTime += seconds;
        }
    }

    // Ensure speed is applied when metadata loads or source changes
    function onLoadedMetadata() {
        if (audio) {
            audio.playbackRate = playbackRate;
        }
    }
</script>

<div
    class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6 border border-gray-200 dark:border-gray-700"
>
    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">
        🇺🇸 {podcast.title}
    </h3>

    {#if podcast.description}
        <p
            class="text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-line"
        >
            {podcast.description}
        </p>
    {/if}

    <div class="flex flex-col gap-3">
        <audio
            bind:this={audio}
            controls
            class="w-full"
            src={podcast.url}
            on:loadedmetadata={onLoadedMetadata}
        >
            Your browser does not support the audio element.
        </audio>

        <div class="flex flex-wrap items-center justify-between gap-2">
            <!-- Seek Controls -->
            <div class="flex gap-2">
                <button
                    class="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    on:click={() => seek(-30)}
                    title="Reculer de 30 secondes"
                >
                    -30s
                </button>
                <button
                    class="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    on:click={() => seek(30)}
                    title="Avancer de 30 secondes"
                >
                    +30s
                </button>
            </div>

            <!-- Speed Controls -->
            <div class="flex items-center gap-2">
                <span
                    class="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide"
                    >Vitesse :</span
                >
                <div class="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    {#each speeds as speed}
                        <button
                            class="px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200
            {playbackRate === speed
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
                            on:click={() => setSpeed(speed)}
                        >
                            {speed}x
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</div>

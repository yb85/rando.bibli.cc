<script>
  import { onMount } from "svelte";
  import { biblePlan } from "./lib/data.js";
  import ReadingView from "./lib/ReadingView.svelte";
  import { DarkMode, Button, Badge, Modal } from "flowbite-svelte";
  import { sineIn } from "svelte/easing";
  import { fly, fade } from "svelte/transition";
  import { progress } from "./lib/progressStore.js";

  // State
  let selectedDay = null; // number | null
  let listContainer;
  let todayItem;
  let isDarkMode = false;

  // Date Logic
  // Assumption: Day 1 = Jan 1 of Current Year
  const currentYear = new Date().getFullYear();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper to get date object for a plan day
  function getDateForDay(dayNum) {
    // Jan 1 is day 1
    const d = new Date(currentYear, 0, 1);
    d.setDate(dayNum); // setDate handles overflow correctly (e.g. Jan 32 -> Feb 1)
    return d;
  }

  function formatDateLabel(date) {
    // Compare with today
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === -1) return "Hier";
    if (diffDays === 1) return "Demain";

    // Otherwise: formatted
    // short weekday, day, short month
    // e.g. "lun. 1 janv."
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(date);
  }

  // Pre-calculate display data? Or just do it in template
  // Adding dateObj to items
  const items = biblePlan.map((item) => {
    const date = getDateForDay(item.day);
    return {
      ...item,
      dateObj: date,
      label: formatDateLabel(date),
      isToday: date.getTime() === today.getTime(),
    };
  });

  onMount(() => {
    // Scroll to today
    if (todayItem) {
      setTimeout(() => {
        todayItem.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 100);
    }

    // Auto-detect
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      document.documentElement.classList.add("dark");
      isDarkMode = true;
    }
  });

  function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function captureToday(node, isToday) {
    if (isToday) todayItem = node;
  }

  function openDay(day) {
    selectedDay = day;
  }

  function closeView() {
    selectedDay = null;
  }
  let transitionParams = {
    x: -320,
    duration: 200,
    easing: sineIn,
  };
  let isDrawerHidden = true;
  let showAllReadModal = false;
  let showResetModal = false;

  function scrollToToday() {
    isDrawerHidden = true;
    if (todayItem) {
      setTimeout(() => {
        todayItem.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 100);
    }
  }

  function confirmMarkAllRead() {
    showAllReadModal = false;
    // Calculate which "Day X" corresponds to today
    // This assumes items array is sorted and reliable.
    // We need "Day X" string.
    const todayPlanDay = items.find((i) => i.isToday);
    if (todayPlanDay) {
      progress.markAllReadUntil(`Day ${todayPlanDay.day}`);
    } else {
      // If today is not in plan (e.g. searching next year?), fallback to last available or something?
      // For now, let's just find the last day that is <= today
      const lastPastDay = items
        .slice()
        .reverse()
        .find((i) => i.dateObj <= today);
      if (lastPastDay) {
        progress.markAllReadUntil(`Day ${lastPastDay.day}`);
      }
    }
    isDrawerHidden = true;
  }

  function confirmReset() {
    showResetModal = false;
    progress.resetProgress();
    isDrawerHidden = true;
  }
</script>

{#if !isDrawerHidden}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-40 bg-gray-900/50 dark:bg-gray-900/80"
    on:click={() => (isDrawerHidden = true)}
    on:keydown={(e) => e.key === "Escape" && (isDrawerHidden = true)}
    role="button"
    tabindex="0"
    transition:fade
  ></div>

  <!-- Drawer -->
  <div
    class="fixed top-0 left-0 z-50 w-64 h-screen p-4 overflow-y-auto transition-transform bg-white dark:bg-gray-800 shadow-lg"
    transition:fly={{ x: -200, duration: 200 }}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex flex-col h-full">
      <div class="flex justify-end mb-4">
        <button
          on:click={() => (isDrawerHidden = true)}
          class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
          aria-label="Close menu"
        >
          <svg
            aria-hidden="true"
            class="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            ></path>
          </svg>
        </button>
      </div>

      <ul class="space-y-2 font-medium">
        <li>
          <button
            on:click={scrollToToday}
            class="flex items-center w-full p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
          >
            <span class="ml-3">Aller à aujourd'hui ...</span>
          </button>
        </li>
      </ul>

      <div class="mt-auto pt-4 border-t dark:border-gray-700">
        <div
          class="px-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"
        >
          Zone Danger
        </div>
        <ul class="space-y-2 font-medium">
          <li>
            <button
              on:click={() => (showAllReadModal = true)}
              class="flex items-center w-full p-2 text-red-600 rounded-lg dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 group"
            >
              <span class="ml-3">Marquer "lu" jusqu'à aujourd'hui</span>
            </button>
          </li>
          <li>
            <button
              on:click={() => (showResetModal = true)}
              class="flex items-center w-full p-2 text-red-600 rounded-lg dark:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 group"
            >
              <span class="ml-3">Réinitialiser la progression</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
{/if}

<Modal bind:open={showAllReadModal} size="xs" autoclose={false} class="w-full">
  <div class="text-center">
    <svg
      aria-hidden="true"
      class="mx-auto mb-4 text-gray-400 w-14 h-14 dark:text-gray-200"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      ><path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      ></path></svg
    >
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
      Marquer tout comme lu jusqu'à aujourd'hui ?
    </h3>
    <button
      class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center me-2"
      on:click={confirmMarkAllRead}
    >
      Oui, je confirme
    </button>
    <button
      class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
      on:click={() => (showAllReadModal = false)}
    >
      Non, annuler
    </button>
  </div>
</Modal>

<Modal bind:open={showResetModal} size="xs" autoclose={false} class="w-full">
  <div class="text-center">
    <svg
      aria-hidden="true"
      class="mx-auto mb-4 text-gray-400 w-14 h-14 dark:text-gray-200"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      ><path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      ></path></svg
    >
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
      Êtes-vous sûr de vouloir tout réinitialiser ?
    </h3>
    <button
      class="text-white bg-red-600 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center me-2"
      on:click={confirmReset}
    >
      Oui, réinitialiser
    </button>
    <button
      class="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-600"
      on:click={() => (showResetModal = false)}
    >
      Non, annuler
    </button>
  </div>
</Modal>

<main
  class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col font-sans"
>
  <!-- Header -->
  <header
    class="sticky top-0 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b dark:border-gray-700 p-4 shadow-sm flex justify-between items-center"
  >
    <div class="w-8">
      <button
        aria-label="Menu"
        on:click={() => (isDrawerHidden = false)}
        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-700"
      >
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          ></path></svg
        >
      </button>
    </div>

    <h1
      class="text-xl font-bold text-center text-gray-800 dark:text-white tracking-tight"
    >
      La Bible en {currentYear}
    </h1>
    <button
      on:click={toggleDarkMode}
      class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-700 w-8 h-8 flex items-center justify-center transition-colors"
    >
      {#if isDarkMode}
        <svg
          class="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          ><path
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            fill-rule="evenodd"
            clip-rule="evenodd"
          ></path></svg
        >
      {:else}
        <svg
          class="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          ><path
            d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"
          ></path></svg
        >
      {/if}
    </button>
  </header>

  <!-- List -->
  <div
    class="flex-1 max-w-2xl mx-auto w-full p-4 space-y-3"
    bind:this={listContainer}
  >
    {#each items as item (item.day)}
      <!-- List Item -->
      <button
        class="w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md hover:border-primary-200 transition-all active:scale-[0.99] text-left group relative overflow-hidden"
        class:ring-2={item.isToday}
        class:ring-primary-500={item.isToday}
        on:click={() => openDay(item.day)}
        use:captureToday={item.isToday}
      >
        <!-- Day Number Avatar -->
        <div
          class="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300 font-bold text-sm tracking-tighter group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors"
        >
          #{item.day}
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div
            class="text-base font-semibold text-gray-900 dark:text-gray-100 truncate"
          >
            {item.readings[0]}
          </div>
          {#if item.readings.length > 1}
            <div
              class="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate font-medium"
            >
              {item.readings.slice(1).join(" • ")}
            </div>
          {/if}
        </div>

        <!-- Date Label + Badge -->
        <div class="flex-shrink-0 text-right flex flex-col items-end gap-1">
          <span
            class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide group-hover:text-primary-500 transition-colors"
          >
            {item.label}
          </span>

          {#if $progress[`Day ${item.day}`] === "done"}
            <Badge color="green" rounded class="px-2.5 py-0.5">Lu !</Badge>
          {:else if $progress[`Day ${item.day}`] === "inprogress"}
            <Badge color="yellow" rounded class="px-2.5 py-0.5">En cours</Badge>
          {:else}
            <!-- Todo state -->
            {#if item.dateObj < today}
              <Badge color="red" rounded class="px-2.5 py-0.5">À lire...</Badge>
            {/if}
          {/if}
        </div>
      </button>
    {/each}
  </div>

  <!-- Overlay -->
  {#if selectedDay !== null}
    <ReadingView day={selectedDay} on:close={closeView} />
  {/if}
</main>

<style>
  /* Global scrollbar styling if desired */
  /* Mobile standard */
</style>

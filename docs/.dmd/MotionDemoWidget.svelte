<svelte:options customElement={{ tag: "dmd-motion-demo" }} />
<script lang="ts">
  import { motion, fade, slide, scale, prefersReducedMotion } from "docmedown/motion";

  let activePreset = $state("slide");
  let count = $state(1);

  function restart() {
    count++;
  }
</script>

<div class="motion-demo-box">
  <div class="motion-demo-header">
    <strong>🎬 Live Animation Playground</strong>
    <span class="motion-demo-pill">DocMeDown Motion</span>
  </div>
  <p class="motion-demo-sub">
    Hardware-accelerated WAAPI animations with automatic prefers-reduced-motion compliance.
  </p>

  <div class="motion-demo-controls">
    <button
      type="button"
      class="preset-btn{activePreset === 'slide' ? ' active' : ''}"
      onclick={() => { activePreset = 'slide'; restart(); }}
    >
      Slide In
    </button>
    <button
      type="button"
      class="preset-btn{activePreset === 'fade' ? ' active' : ''}"
      onclick={() => { activePreset = 'fade'; restart(); }}
    >
      Fade In
    </button>
    <button
      type="button"
      class="preset-btn{activePreset === 'scale' ? ' active' : ''}"
      onclick={() => { activePreset = 'scale'; restart(); }}
    >
      Scale In
    </button>
    <button type="button" class="replay-btn" onclick={restart}>
      Replay ↻
    </button>
  </div>

  <div class="motion-stage">
    {#key count}
      {#if activePreset === 'slide'}
        <div use:slide={{ direction: "up", distance: 24, duration: 0.4 }} class="motion-card">
          <div class="card-icon">⚡</div>
          <div>
            <strong>use:slide</strong>
            <p>Smooth translate3d + opacity transition</p>
          </div>
        </div>
      {:else if activePreset === 'fade'}
        <div use:fade={{ duration: 0.45 }} class="motion-card">
          <div class="card-icon">✨</div>
          <div>
            <strong>use:fade</strong>
            <p>Buttery smooth opacity curve</p>
          </div>
        </div>
      {:else}
        <div use:scale={{ from: 0.88, duration: 0.35 }} class="motion-card">
          <div class="card-icon">🎯</div>
          <div>
            <strong>use:scale</strong>
            <p>Springy transform scale-in</p>
          </div>
        </div>
      {/if}
    {/key}
  </div>
</div>

<style>
  .motion-demo-box {
    margin: 1.5rem 0;
    padding: 1.25rem;
    border-radius: 12px;
    background: var(--dmd-bg-card, #1e293b);
    border: 1px solid var(--dmd-border-color, #334155);
  }
  .motion-demo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--dmd-text-primary, #fff);
  }
  .motion-demo-pill {
    font-size: 0.75rem;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    background: var(--dmd-accent-subtle, rgba(99, 102, 241, 0.15));
    color: var(--dmd-accent, #6366f1);
    font-weight: 700;
  }
  .motion-demo-sub {
    font-size: 0.88rem;
    color: var(--dmd-text-secondary, #94a3b8);
    margin: 0.4rem 0 1rem;
  }
  .motion-demo-controls {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
  }
  .preset-btn, .replay-btn {
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    border: 1px solid var(--dmd-border-color, #475569);
    background: transparent;
    color: var(--dmd-text-secondary, #cbd5e1);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all var(--dmd-transition);
  }
  .preset-btn:hover, .replay-btn:hover {
    background: var(--dmd-accent-subtle, rgba(99, 102, 241, 0.1));
    color: var(--dmd-text-primary, #fff);
  }
  .preset-btn.active {
    background: var(--dmd-accent, #6366f1);
    color: #fff;
    border-color: var(--dmd-accent, #6366f1);
  }
  .replay-btn {
    margin-left: auto;
    border-style: dashed;
  }
  .motion-stage {
    min-height: 80px;
    display: flex;
    align-items: center;
  }
  .motion-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.85rem 1.1rem;
    border-radius: 8px;
    background: var(--dmd-bg-canvas, #0f172a);
    border: 1px solid var(--dmd-accent, #6366f1);
    color: var(--dmd-text-primary, #fff);
    width: 100%;
  }
  .card-icon {
    font-size: 1.5rem;
  }
  .motion-card strong {
    font-size: 0.95rem;
  }
  .motion-card p {
    margin: 0.15rem 0 0;
    font-size: 0.82rem;
    color: var(--dmd-text-secondary, #94a3b8);
  }
</style>

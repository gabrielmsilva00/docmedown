<svelte:options customElement={{ tag: "dmd-callout" }} />
<script lang="ts">
  import Alert from "./Alert.svelte";
  let { type = "note", title = "" }: { type?: string; title?: string } = $props();
</script>

<Alert {type} {title}><slot></slot></Alert>

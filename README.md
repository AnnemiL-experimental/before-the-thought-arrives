# Before The Thought Arrives

> *"the amygdala fires before the cortex has named the threat"*

An interactive 3D brain visualization that maps real-time EEG frequency bands and emotional states onto anatomically positioned brain region volumes. Each state drives cfos-style fluorescent puncta, synchronized waveform rendering, and procedurally assembled stream-of-consciousness text.

**[→ Live](https://before-the-thought-arrives.vercel.app/)**

---

## What It Does

The visualization models eight emotional/neural states — calm, focused, anxious, dreaming, depressed, fear, euphoric, pain — each grounded in actual EEG signatures and neuroanatomical activation patterns.

When a state is selected:

- **Brain regions** light up with cfos-style fluorescent puncta distributed non-uniformly across the surface of each anatomical volume. Density and brightness track activation level; inactive regions dim to near-invisible.
- **Flickering frequency** is driven by a weighted blend of the active EEG bands — delta states pulse slowly (2 Hz), alpha states oscillate at rest frequency (~10 Hz), beta/gamma states produce fast shimmer. Each region has an independent phase offset so they don't synchronize.
- **Live waveforms** render all five bands (δ θ α β γ) in real time, with amplitude and frequency matching the current state.
- **Signal text** assembles a paragraph from a corpus of clinical neuroscience fragments and first-person interior monologue — English followed by Chinese — drawn from independent pools so outputs don't repeat across reads.

---

## Brain Regions

Each region is an independent 3D volume (deformed ellipsoid) placed at its anatomical position, with organic surface noise to approximate lobe morphology.

| Region | Role in visualization |
|---|---|
| Frontal | Executive function, prefrontal recruitment |
| Parietal L / R | Default mode, sensory integration |
| Temporal L / R | Memory, language, dreaming |
| Occipital | Visual processing, resting alpha |
| Limbic | Amygdala / emotional core, fear & pain |
| Hippoc. L / R | Memory consolidation, anxiety, dreaming |
| Cerebellum | Motor baseline |

---

## EEG States

| State | Dominant bands | Primary regions |
|---|---|---|
| Calm | α dominant | Parietal, Occipital |
| Focused | β + γ | Frontal |
| Anxious | β + γ | Limbic, Hippoc. |
| Dreaming | δ + θ | Temporal, Hippoc. |
| Depressed | δ dominant, flat | Limbic, Hippoc. |
| Fear | γ burst | Limbic, Frontal |
| Euphoric | α + γ | Frontal, Limbic |
| Pain | β + γ | Limbic, Hippoc. |

---

## Narrative System

Each "read signal" assembles a unique text from three independent fragment pools per state (opening · middle · closing), in English and Chinese drawn independently. English tracks used combinations to avoid repeats until the pool is exhausted (~512 combinations per state before reset). Chinese pools are always random.

The fragments mix clinical neuroscience terminology with first-person interior monologue — not as explanation, but as texture. The English and Chinese paragraphs are not translations of each other.

---

## Technical Stack

- **Three.js r128** — 3D brain geometry, point cloud puncta, additive blending
- **React 18** — state management, UI
- **Vite** — build tooling
- **Deployed on Vercel**

Brain regions are built from deformed SphereGeometry with multi-scale noise (large-scale lobing + mid-scale sulcal folds + fine texture). Point clouds are area-weighted random surface samples with cluster bias to produce the non-uniform density of cfos expression.

---

## Background

This project grew out of a longer conversation about what it would mean to *see* psychiatric states rather than just label them — to render the signal that arrives before the thought does. The cfos reference is intentional: immediate-early gene expression is one of the few ways we have to literally see which neurons were active, after the fact. This is a speculative version of that, in real time.

Built as part of a broader interest in psychiatric BCI and the phenomenology of neural states.

---

*— Annemi Li, 2026*

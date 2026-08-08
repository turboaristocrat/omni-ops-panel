/**
 * layerActionsData.js
 * Layer-level actions available as button assignments:
 * masks, merge operations, group collapse/expand, and built-in custom functions.
 */

export const layerActions = [
    // ── Built-in Custom Functions ──────────────────────────────────────────
    { label: 'CC Match Layers',    value: 'ccMatchLayers',          type: 'customFunc', displayType: 'Custom Function' },
    { label: 'Levels (Lum)',       value: 'createLevelsLum',        type: 'customFunc', displayType: 'Custom Function' },
    { label: 'Hue/Sat (Color)',    value: 'createHueSatColor',      type: 'customFunc', displayType: 'Custom Function' },
    { label: 'Curves (Color)',     value: 'createCurvesColor',      type: 'customFunc', displayType: 'Custom Function' },
    { label: 'Color Grade Stack',  value: 'createColorGradeStack',  type: 'customFunc', displayType: 'Custom Function' },

    // ── Layer Masks ─────────────────────────────────────────────────────────
    { label: 'Mask: Reveal All',       value: 'revealAll',     type: 'mask', displayType: 'Mask' },
    { label: 'Mask: Hide All',         value: 'hideAll',       type: 'mask', displayType: 'Mask' },
    { label: 'Mask: From Selection',   value: 'fromSelection', type: 'mask', displayType: 'Mask' },
    { label: 'Mask: Delete',           value: 'delete',        type: 'mask', displayType: 'Mask' },
    { label: 'Mask: Invert',           value: 'invert',        type: 'mask', displayType: 'Mask' },

    // ── Merge Operations ────────────────────────────────────────────────────
    { label: 'Merge Down',      value: 'down',    type: 'merge', displayType: 'Merge' },
    { label: 'Merge Visible',   value: 'visible', type: 'merge', displayType: 'Merge' },
    { label: 'Flatten Image',   value: 'flatten', type: 'merge', displayType: 'Merge' },

    // ── Group Operations ────────────────────────────────────────────────────
    { label: 'Collapse All Groups', value: 'collapse', type: 'groups', displayType: 'Groups' },
    { label: 'Expand All Groups',   value: 'expand',   type: 'groups', displayType: 'Groups' },
];

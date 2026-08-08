/**
 * blendModesData.js
 * Complete list of Photoshop layer blend modes with their PS internal values.
 */

export const blendModes = [
    // Normal
    { label: 'Normal',          value: 'normal',         group: 'Normal' },
    { label: 'Dissolve',        value: 'dissolve',        group: 'Normal' },
    // Darken
    { label: 'Darken',          value: 'darken',          group: 'Darken' },
    { label: 'Multiply',        value: 'multiply',        group: 'Darken' },
    { label: 'Color Burn',      value: 'colorBurn',       group: 'Darken' },
    { label: 'Linear Burn',     value: 'linearBurn',      group: 'Darken' },
    { label: 'Darker Color',    value: 'darkerColor',     group: 'Darken' },
    // Lighten
    { label: 'Lighten',         value: 'lighten',         group: 'Lighten' },
    { label: 'Screen',          value: 'screen',          group: 'Lighten' },
    { label: 'Color Dodge',     value: 'colorDodge',      group: 'Lighten' },
    { label: 'Linear Dodge',    value: 'linearDodge',     group: 'Lighten' },
    { label: 'Lighter Color',   value: 'lighterColor',    group: 'Lighten' },
    // Contrast
    { label: 'Overlay',         value: 'overlay',         group: 'Contrast' },
    { label: 'Soft Light',      value: 'softLight',       group: 'Contrast' },
    { label: 'Hard Light',      value: 'hardLight',       group: 'Contrast' },
    { label: 'Vivid Light',     value: 'vividLight',      group: 'Contrast' },
    { label: 'Linear Light',    value: 'linearLight',     group: 'Contrast' },
    { label: 'Pin Light',       value: 'pinLight',        group: 'Contrast' },
    { label: 'Hard Mix',        value: 'hardMix',         group: 'Contrast' },
    // Inversion
    { label: 'Difference',      value: 'difference',      group: 'Inversion' },
    { label: 'Exclusion',       value: 'exclusion',       group: 'Inversion' },
    { label: 'Subtract',        value: 'blendSubtraction', group: 'Inversion' },
    { label: 'Divide',          value: 'blendDivide',     group: 'Inversion' },
    // Component
    { label: 'Hue',             value: 'hue',             group: 'Component' },
    { label: 'Saturation',      value: 'saturation',      group: 'Component' },
    { label: 'Color',           value: 'color',           group: 'Component' },
    { label: 'Luminosity',      value: 'luminosity',      group: 'Component' },
];

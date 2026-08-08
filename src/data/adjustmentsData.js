/**
 * adjustmentsData.js
 * All Photoshop adjustment layer types available for direct creation (no dialog).
 * Mapped to their internal batchPlay _obj values.
 */

export const adjustmentTypes = [
    { label: 'Levels',              value: 'levels',             displayType: 'Adjustment' },
    { label: 'Curves',              value: 'curves',             displayType: 'Adjustment' },
    { label: 'Brightness/Contrast', value: 'brightnessContrast', displayType: 'Adjustment' },
    { label: 'Exposure',            value: 'exposure',           displayType: 'Adjustment' },
    { label: 'Vibrance',            value: 'vibrance',           displayType: 'Adjustment' },
    { label: 'Hue/Saturation',      value: 'hueSaturation',      displayType: 'Adjustment' },
    { label: 'Color Balance',       value: 'colorBalance',       displayType: 'Adjustment' },
    { label: 'Black & White',       value: 'blackAndWhite',      displayType: 'Adjustment' },
    { label: 'Photo Filter',        value: 'photoFilter',        displayType: 'Adjustment' },
    { label: 'Channel Mixer',       value: 'channelMixer',       displayType: 'Adjustment' },
    { label: 'Color Lookup',        value: 'colorLookup',        displayType: 'Adjustment' },
    { label: 'Invert',              value: 'invert',             displayType: 'Adjustment' },
    { label: 'Posterize',           value: 'posterize',          displayType: 'Adjustment' },
    { label: 'Threshold',           value: 'threshold',          displayType: 'Adjustment' },
    { label: 'Gradient Map',        value: 'gradientMap',        displayType: 'Adjustment' },
    { label: 'Selective Color',     value: 'selectiveColor',     displayType: 'Adjustment' },
];

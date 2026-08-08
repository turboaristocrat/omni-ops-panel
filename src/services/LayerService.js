/**
 * LayerService.js
 * Handles layer operations: blend mode, masks, merge, groups.
 * All operations must be called inside executeAsModal.
 */

const { action } = require('photoshop');
const { batchPlay } = action;

// ─── Blend Mode ─────────────────────────────────────────────────────────────

/**
 * Set blend mode on the current target layer.
 * @param {string} mode - e.g. 'multiply', 'screen', 'overlay', 'normal', etc.
 */
export async function setBlendMode(mode) {
    await batchPlay([{
        _obj: 'set',
        _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }],
        to: {
            _obj: 'layer',
            mode: { _enum: 'blendMode', _value: mode }
        }
    }], {});
}

// ─── Adjustment Layers ───────────────────────────────────────────────────────

/**
 * Create an adjustment layer directly (no dialog).
 * @param {string} type - e.g. 'levels', 'curves', 'hueSaturation', etc.
 */
export async function createAdjustmentLayer(type) {
    const descriptor = {
        _obj: 'make',
        _target: [{ _ref: 'adjustmentLayer' }],
        using: {
            _obj: 'adjustmentLayer',
            type: { _obj: type }
        }
    };
    // Add default params for hueSaturation to avoid PS errors
    if (type === 'hueSaturation') {
        descriptor.using.type.adjustment = [{
            _obj: 'hueSatAdjustmentV2',
            hue: 0, saturation: 0, lightness: 0, colorize: false
        }];
    }
    await batchPlay([descriptor], {});
}

// ─── Layer Mask Operations ───────────────────────────────────────────────────

/**
 * Create a layer mask (Reveal All = white mask)
 */
export async function createMaskRevealAll() {
    await batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'channel' }],
        at: { _ref: 'channel', _enum: 'channel', _value: 'mask' },
        using: { _enum: 'userMaskEnabled', _value: 'revealAll' }
    }], {});
}

/**
 * Create a layer mask (Hide All = black mask)
 */
export async function createMaskHideAll() {
    await batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'channel' }],
        at: { _ref: 'channel', _enum: 'channel', _value: 'mask' },
        using: { _enum: 'userMaskEnabled', _value: 'hideAll' }
    }], {});
}

/**
 * Create a layer mask from current selection
 * (Reveal Selection = white where selected, black elsewhere)
 */
export async function createMaskFromSelection() {
    await batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'channel' }],
        at: { _ref: 'channel', _enum: 'channel', _value: 'mask' },
        using: { _enum: 'userMaskEnabled', _value: 'revealSelection' }
    }], {});
}

/**
 * Delete the layer mask from the current target layer
 */
export async function deleteMask() {
    await batchPlay([{
        _obj: 'delete',
        _target: [{ _ref: 'channel', _enum: 'channel', _value: 'mask' }]
    }], {});
}

/**
 * Invert the layer mask on the current target layer
 */
export async function invertMask() {
    await batchPlay([{
        _obj: 'invert',
        _target: [{ _ref: 'channel', _enum: 'channel', _value: 'mask' }]
    }], {});
}

// ─── Merge Operations ────────────────────────────────────────────────────────

/**
 * Merge Down (merge current layer with the one below)
 */
export async function mergeDown() {
    await batchPlay([{
        _obj: 'mergeLayersNew',
    }], {});
}

/**
 * Merge Visible layers
 */
export async function mergeVisible() {
    await batchPlay([{
        _obj: 'flattenImage',
        onlyVisible: true
    }], {});
}

/**
 * Flatten Image
 */
export async function flattenImage() {
    await batchPlay([{
        _obj: 'flattenImage'
    }], {});
}

// ─── Group Operations ────────────────────────────────────────────────────────

/**
 * Collapse all layer groups in the document
 */
export async function collapseAllGroups() {
    await batchPlay([{
        _obj: 'set',
        _target: [{ _ref: 'layerSection', _enum: 'ordinal', _value: 'allEnum' }],
        to: {
            _obj: 'layerSection',
            layerSectionExpanded: false
        }
    }], {});
}

/**
 * Expand all layer groups in the document
 */
export async function expandAllGroups() {
    await batchPlay([{
        _obj: 'set',
        _target: [{ _ref: 'layerSection', _enum: 'ordinal', _value: 'allEnum' }],
        to: {
            _obj: 'layerSection',
            layerSectionExpanded: true
        }
    }], {});
}

// ─── Clipping Mask ───────────────────────────────────────────────────────────

/**
 * Create a clipping mask on the current layer
 */
export async function makeClippingMask() {
    await batchPlay([{
        _obj: 'groupEvent',
        _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }]
    }], {});
}

// ─── General Helpers ─────────────────────────────────────────────────────────

export async function renameCurrentLayer(name) {
    await batchPlay([{
        _obj: 'set',
        _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }],
        to: { _obj: 'layer', name }
    }], {});
}

export async function createSolidColorLayer(r, g, b) {
    await batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'contentLayer' }],
        using: {
            _obj: 'contentLayer',
            type: {
                _obj: 'solidColorLayer',
                color: { _obj: 'RGBColor', red: r, green: g, blue: b }
            }
        }
    }], {});
}

export async function groupSelectedLayers(name) {
    await batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'layerSection' }],
        from: { _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' },
        name
    }], {});
}

export async function selectLayerByName(name, addToSelection = false) {
    await batchPlay([{
        _obj: 'select',
        _target: [{ _ref: 'layer', _name: name }],
        selectionModifier: addToSelection
            ? { _enum: 'selectionModifierType', _value: 'addToSelection' }
            : { _enum: 'selectionModifierType', _value: 'replaceSelection' },
        mkVs: false
    }], {});
}

export async function hideCurrentLayer() {
    await batchPlay([{
        _obj: 'hide',
        _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }]
    }], {});
}

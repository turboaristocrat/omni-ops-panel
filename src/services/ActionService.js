/**
 * ActionService.js
 * Unified action dispatcher. Routes button clicks to the correct service.
 * This is the single entry point called by ActionButton.
 *
 * Action Types:
 *  - tool          → Select a Photoshop tool
 *  - menu          → Execute a menu command (by ID or name)
 *  - playAction    → Play a Photoshop Action from a Set
 *  - customFunc    → Built-in custom workflow functions
 *  - blend         → Set layer blend mode
 *  - adjustment    → Create adjustment layer (no dialog)
 *  - mask          → Layer mask operations
 *  - merge         → Merge/flatten operations
 *  - groups        → Collapse/expand layer groups
 */

const { action, core } = require('photoshop');
const { batchPlay } = action;

import * as LayerService from './LayerService';

// ─── Menu Command Fallback Map ───────────────────────────────────────────────
// Maps legacy numeric IDs to their modern string equivalents
const LEGACY_ID_MAP = {
    '1211': 'levels', '1010': 'curves', '1009': 'levels',
    '1178': 'matchColor', '1177': 'hdrToning', '1179': 'replaceColor',
    '1180': 'equalize', '1021': 'colorRange', '1275': 'selectAndMask',
    '1191': 'applyImage', '1192': 'calculations', '1031': 'trim',
    '1121': 'batch', '1122': 'imageProcessor', '1114': 'quickMask',
    '1000': 'new', '1001': 'open', '1082': 'save', '1083': 'saveAS',
    '1046': 'flattenImage'
};

// ─── String → Internal Enum Map for known menu commands ─────────────────────
const KNOWN_MENU_COMMANDS = {
    'invert': 'invert', 'desaturate': 'desaturate', 'levels': 'levels',
    'curves': 'curves', 'brightness/contrast': 'brightnessContrast',
    'hue/saturation': 'hueSaturation', 'color balance': 'colorBalance',
    'black & white': 'blackAndWhite', 'photo filter': 'photoFilter',
    'channel mixer': 'channelMixer', 'color lookup': 'colorLookup',
    'posterize': 'posterize', 'threshold': 'threshold',
    'gradient map': 'gradientMap', 'selective color': 'selectiveColor',
    'match color': 'matchColor', 'replace color': 'replaceColor',
    'color range': 'colorRange', 'shadows/highlights': 'shadowHighlight'
};

// ─── Main Dispatcher ─────────────────────────────────────────────────────────

export const executeAction = async (actionType, actionValue, options = {}) => {
    console.log(`[ActionService] Dispatch: type="${actionType}" value="${actionValue}"`, options);

    if (!actionValue && actionType !== 'none') {
        console.warn('[ActionService] No action value provided. Aborting.');
        return;
    }

    try {
        switch (actionType) {

            // ── Tools ────────────────────────────────────────────────────────
            case 'tool':
                await _selectTool(String(actionValue).trim());
                break;

            // ── Menu Commands ────────────────────────────────────────────────
            case 'menu':
                await _executeMenuCommand(String(actionValue).trim());
                if (options.clippingMask) {
                    await core.executeAsModal(async () => { await LayerService.makeClippingMask(); }, { commandName: "Clipping Mask" });
                }
                break;

            // ── Play Photoshop Action ────────────────────────────────────────
            case 'playAction':
            case 'action':
                await _playAction(String(actionValue));
                if (options.clippingMask) {
                    await core.executeAsModal(async () => { await LayerService.makeClippingMask(); }, { commandName: "Clipping Mask" });
                }
                break;

            // ── Built-in Custom Workflow Functions ───────────────────────────
            case 'customFunc':
                await core.executeAsModal(async () => {
                    await _runCustomFunc(actionValue, options);
                    if (options.clippingMask) await LayerService.makeClippingMask();
                }, { commandName: `Custom: ${actionValue}` });
                break;

            // ── Blend Mode ───────────────────────────────────────────────────
            case 'blend':
                await core.executeAsModal(async () => {
                    await LayerService.setBlendMode(actionValue);
                }, { commandName: `Set Blend Mode: ${actionValue}` });
                break;

            // ── Direct Adjustment Layer (No Dialog) ──────────────────────────
            case 'adjustment':
                await core.executeAsModal(async () => {
                    await LayerService.createAdjustmentLayer(actionValue);
                    if (options.clippingMask) await LayerService.makeClippingMask();
                }, { commandName: `New Adjustment Layer: ${actionValue}` });
                break;

            // ── Layer Mask Operations ────────────────────────────────────────
            case 'mask':
                await core.executeAsModal(async () => {
                    await _runMaskOp(actionValue);
                }, { commandName: `Mask: ${actionValue}` });
                break;

            // ── Merge / Flatten ──────────────────────────────────────────────
            case 'merge':
                await core.executeAsModal(async () => {
                    await _runMergeOp(actionValue);
                }, { commandName: `Merge: ${actionValue}` });
                break;

            // ── Group Collapse / Expand ──────────────────────────────────────
            case 'groups':
                await core.executeAsModal(async () => {
                    if (actionValue === 'collapse') await LayerService.collapseAllGroups();
                    else if (actionValue === 'expand') await LayerService.expandAllGroups();
                }, { commandName: `Groups: ${actionValue}` });
                break;

            default:
                console.warn(`[ActionService] Unknown action type: "${actionType}"`);
        }
    } catch (e) {
        console.error('[ActionService] Execution error:', e);
        if (e.message && !e.message.includes('NAPI') && !e.message.includes('Time out')) {
            await core.showAlert(`Action Error: ${e.message}`);
        }
    }
};

// ─── Tool Selection ──────────────────────────────────────────────────────────

async function _selectTool(toolId) {
    if (toolId === 'objectSelectTool') {
        toolId = 'objectSelectionTool';
    }
    try {
        const { app } = require('photoshop');
        // Try direct DOM selection first
        app.currentTool = toolId;
    } catch (domError) {
        console.warn(`[ActionService] DOM tool selection failed for "${toolId}", trying batchPlay:`, domError);
        try {
            await core.executeAsModal(async () => {
                const { action } = require('photoshop');
                const { batchPlay } = action;
                await batchPlay([{
                    _obj: 'select',
                    _target: [{ _ref: 'tool', _enum: 'tool', _value: toolId }]
                }], { modalBehavior: 'execute' });
            }, { commandName: `Select Tool: ${toolId}` });
        } catch (bpError) {
            console.error(`[ActionService] Tool selection failed for "${toolId}":`, bpError);
            await core.showAlert(`Could not select tool: ${toolId}`);
        }
    }
}

// ─── Menu Command Execution ──────────────────────────────────────────────────

async function _executeMenuCommand(targetValue) {
    // Resolve legacy numeric IDs
    if (LEGACY_ID_MAP[targetValue]) {
        console.log(`[ActionService] Mapping legacy ID ${targetValue} → ${LEGACY_ID_MAP[targetValue]}`);
        targetValue = LEGACY_ID_MAP[targetValue];
    }

    const commandID = Number(targetValue);
    const isNumeric = !isNaN(commandID) && targetValue.length > 0 && !/[a-zA-Z]/.test(targetValue);

    if (isNumeric) {
        // Numeric ID path
        try {
            await core.executeAsModal(async () => {
                await core.performMenuCommand(commandID);
            }, { commandName: `Menu: ${commandID}` });
        } catch (e) {
            if (e.message && e.message.toLowerCase().includes('timeout')) return; // Dialog is open = success
            console.error(`[ActionService] Menu command ${commandID} failed:`, e);
            await core.showAlert(`Failed to execute menu command ${commandID}.\nError: ${e.message}`);
        }
        return;
    }

    // String / enum path with multi-strategy fallback
    const cleanValue = targetValue.toLowerCase().replace(/\./g, '').replace(/…/g, '').trim();
    const mappedEnum = KNOWN_MENU_COMMANDS[cleanValue];
    const forceEnum = !!mappedEnum;
    if (mappedEnum) targetValue = mappedEnum;

    const originalValue = forceEnum ? targetValue : targetValue;

    const runSelectByRef = async (refType, refValue) => {
        const descriptor = {
            _obj: 'select',
            _target: [{ _ref: 'menuItem', [refType]: refValue }]
        };
        if (refType === '_value') descriptor._target[0]._enum = 'menuItemType';
        return await batchPlay([descriptor], { modalBehavior: 'execute' });
    };

    await core.executeAsModal(async () => {
        // Strategy 1: performMenuCommand with enum
        if (forceEnum) {
            try {
                const success = await core.performMenuCommand(targetValue);
                if (success) return;
            } catch (e) {
                if (e.message && e.message.includes('Time out')) return; // Interactive dialog open = success
                console.warn(`[ActionService] performMenuCommand('${targetValue}') failed:`, e.message);
            }
        }
        // Strategy 2: batchPlay enum
        if (forceEnum || /^[a-z][a-zA-Z0-9]*$/.test(targetValue)) {
            try { await runSelectByRef('_value', targetValue); return; } catch (e) { /* continue */ }
        }
        // Strategy 3: batchPlay by exact name
        try { await runSelectByRef('_name', originalValue); return; } catch (e) { /* continue */ }
        // Strategy 4: Name variations (strip/add ellipsis)
        const base = originalValue.replace(/\.|…/g, '');
        for (const v of [base + '...', base + '…', base].filter(v => v !== originalValue)) {
            try { await runSelectByRef('_name', v); return; } catch (e) { /* continue */ }
        }
        throw new Error(`Menu item '${originalValue}' could not be executed.`);
    }, { commandName: `Menu: ${originalValue}` }).catch(async e => {
        if (e.message && e.message.includes('Time out')) return;
        await core.showAlert(`Could not execute menu item: "${originalValue}".\nError: ${e.message}`);
    });
}

// ─── Play Photoshop Action ───────────────────────────────────────────────────

async function _playAction(actionValue) {
    let actionName = actionValue;
    let actionSet = 'Default Actions';

    if (actionName.includes('>')) {
        const parts = actionName.split('>');
        if (parts.length >= 2) {
            actionSet = parts[0].trim();
            actionName = parts[1].trim();
        }
    }

    await core.executeAsModal(async () => {
        await batchPlay([{
            _obj: 'play',
            _target: [
                { _ref: 'action', _name: actionName },
                { _ref: 'actionSet', _name: actionSet }
            ]
        }], {});
    }, { commandName: `Play Action: ${actionSet} > ${actionName}` });
}

// ─── Custom Workflow Functions ────────────────────────────────────────────────

async function _runCustomFunc(funcId, options) {
    const clip = options.clippingMask;

    const makeAdj = async (type, blend, name) => {
        await LayerService.createAdjustmentLayer(type);
        if (blend) await LayerService.setBlendMode(blend);
        if (name) await LayerService.renameCurrentLayer(name);
        if (clip) await LayerService.makeClippingMask();
    };

    switch (funcId) {
        case 'ccMatchLayers':
            await _runCCMatchLayers();
            break;
        case 'createLevelsLum':
            await makeAdj('levels', 'luminosity', 'Levels (Lum)');
            break;
        case 'createHueSatColor':
            await makeAdj('hueSaturation', 'color', 'Hue/Sat (Color)');
            break;
        case 'createCurvesColor':
            await makeAdj('curves', 'color', 'Curves (Color)');
            break;
        case 'createColorGradeStack':
            await makeAdj('levels', 'luminosity', 'Levels (Lum)');
            await makeAdj('hueSaturation', 'color', 'Hue/Sat (Color)');
            await makeAdj('curves', 'color', 'Curves (Color)');
            break;
        default:
            console.warn(`[ActionService] Unknown customFunc: "${funcId}"`);
    }
}

// ─── Mask Operations ─────────────────────────────────────────────────────────

async function _runMaskOp(op) {
    switch (op) {
        case 'revealAll':    await LayerService.createMaskRevealAll(); break;
        case 'hideAll':      await LayerService.createMaskHideAll(); break;
        case 'fromSelection': await LayerService.createMaskFromSelection(); break;
        case 'delete':       await LayerService.deleteMask(); break;
        case 'invert':       await LayerService.invertMask(); break;
        default: console.warn(`[ActionService] Unknown mask op: "${op}"`);
    }
}

// ─── Merge Operations ─────────────────────────────────────────────────────────

async function _runMergeOp(op) {
    switch (op) {
        case 'down':    await LayerService.mergeDown(); break;
        case 'visible': await LayerService.mergeVisible(); break;
        case 'flatten': await LayerService.flattenImage(); break;
        default: console.warn(`[ActionService] Unknown merge op: "${op}"`);
    }
}

// ─── CC Match Layers (Custom Workflow) ───────────────────────────────────────

async function _runCCMatchLayers() {
    // Color Match group
    await LayerService.createSolidColorLayer(128, 128, 128);
    await LayerService.setBlendMode('luminosity');
    await LayerService.renameCurrentLayer('Grey_Lum_Temp');
    await _createHueSat(76);
    await LayerService.renameCurrentLayer('HueSat_Temp');
    await LayerService.selectLayerByName('Grey_Lum_Temp', true);
    await LayerService.groupSelectedLayers('Color Match');
    await LayerService.renameCurrentLayer('Color Match');

    // Value Match group
    await LayerService.createSolidColorLayer(128, 128, 128);
    await LayerService.setBlendMode('color');
    await LayerService.renameCurrentLayer('Grey_Col_Temp');
    await LayerService.createAdjustmentLayer('levels');
    await LayerService.renameCurrentLayer('Levels_Temp');
    await LayerService.selectLayerByName('Grey_Col_Temp', true);
    await LayerService.groupSelectedLayers('Value Match');
    await LayerService.renameCurrentLayer('Value Match');

    // CC Match outer group
    await LayerService.selectLayerByName('Color Match', true);
    await LayerService.groupSelectedLayers('CC Match');
    await LayerService.renameCurrentLayer('CC Match');
    await LayerService.hideCurrentLayer();

    // Rename internals
    await LayerService.selectLayerByName('Value Match');
    await LayerService.hideCurrentLayer();
    await LayerService.selectLayerByName('Levels_Temp');
    await LayerService.renameCurrentLayer('Levels');
    await LayerService.selectLayerByName('Grey_Col_Temp');
    await LayerService.renameCurrentLayer('50% Grey');
    await LayerService.selectLayerByName('Color Match');
    await LayerService.hideCurrentLayer();
    await LayerService.selectLayerByName('HueSat_Temp');
    await LayerService.renameCurrentLayer('Hue/Saturation');
    await LayerService.selectLayerByName('Grey_Lum_Temp');
    await LayerService.renameCurrentLayer('50% Grey');
    await LayerService.selectLayerByName('CC Match');
}

async function _createHueSat(saturation) {
    const { action } = require('photoshop');
    await action.batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'adjustmentLayer' }],
        using: {
            _obj: 'adjustmentLayer',
            type: {
                _obj: 'hueSaturation',
                adjustment: [{
                    _obj: 'hueSatAdjustmentV2',
                    saturation, hue: 0, lightness: 0, colorize: false
                }]
            }
        }
    }], {});
}

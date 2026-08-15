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
    '1211': 'levels', '1010': 'curves',
    '1178': 'matchColor', '1177': 'hdrToning', '1179': 'replaceColor',
    '1180': 'equalize', '1021': 'colorRange', '1275': 'selectAndMask',
    '1191': 'applyImage', '1192': 'calculations', '1031': 'trim',
    '1121': 'batch', '1122': 'imageprocessor', '1114': 'quickMask',
    '1000': 'new', '1001': 'open', '1082': 'save', '1083': 'saveas',
    '1080': 'close', '1081': 'closeall', '1085': 'closeothers',
    '1046': 'flattenImage',
    '1042': 'freetransform',
    '1040': 'fill'
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

// ─── File Command Descriptor Mapping ──────────────────────────────────────────
const FILE_COMMANDS = {
    'new': async () => {
        try {
            const photoshop = require('photoshop');
            // Try native menu command with both casings
            await photoshop.core.performMenuCommand({ commandID: 1000, commandId: 1000 });
        } catch (e) {
            console.warn("[ActionService] New Document via performMenuCommand failed, trying batchPlay:", e.message);
            await batchPlay([{ _obj: "make", _target: [{ _ref: "document" }] }], { dialogOptions: "display" });
        }
    },
    'open': async () => {
        try {
            const uxp = require('uxp');
            // Show interactive dialog OUTSIDE executeAsModal
            const file = await uxp.storage.localFileSystem.getFileForOpening();
            if (file) {
                const photoshop = require('photoshop');
                // Run document open action INSIDE executeAsModal
                await photoshop.core.executeAsModal(async () => {
                    await photoshop.app.open(file);
                }, { commandName: "Open Document" });
            }
        } catch (err) {
            console.warn("[ActionService] UXP Open File failed:", err.message);
        }
    },
    'openas': async () => {
        try {
            const photoshop = require('photoshop');
            // Try triggering native "Open As..." dialog (ID 1002)
            await photoshop.core.performMenuCommand({ commandID: 1002, commandId: 1002 });
        } catch (e) {
            console.warn("[ActionService] Open As via performMenuCommand failed, falling back to UXP file dialog:", e.message);
            try {
                const uxp = require('uxp');
                const file = await uxp.storage.localFileSystem.getFileForOpening();
                if (file) {
                    const photoshop = require('photoshop');
                    await photoshop.core.executeAsModal(async () => {
                        await photoshop.app.open(file);
                    }, { commandName: "Open As Document" });
                }
            } catch (err) {
                console.warn("[ActionService] UXP Open As fallback failed:", err.message);
            }
        }
    },
    'openassmartobject': async () => {
        await batchPlay([{ _obj: "placedLayerOpenAsSmartObject" }], { dialogOptions: "display" });
    },
    'save': async () => {
        const photoshop = require('photoshop');
        if (photoshop.app.activeDocument) {
            await photoshop.core.executeAsModal(async () => {
                await photoshop.app.activeDocument.save();
            }, { commandName: "Save Document" });
        }
    },
    'saveas': async () => {
        await batchPlay([{ _obj: "save", _options: { dialogOptions: "display" } }], { dialogOptions: "display" });
    },
    'saveacopy': async () => {
        await batchPlay([{ _obj: "save", asCopy: true, _options: { dialogOptions: "display" } }], { dialogOptions: "display" });
    },
    'close': async () => {
        const photoshop = require('photoshop');
        if (photoshop.app.activeDocument) {
            await photoshop.app.activeDocument.close();
        }
    },
    'closeall': async () => {
        const photoshop = require('photoshop');
        const docs = [...photoshop.app.documents];
        for (const doc of docs) {
            try {
                await photoshop.core.executeAsModal(async () => {
                    await doc.close();
                }, { commandName: "Close Document" });
            } catch (e) {
                console.warn("[ActionService] Failed to close document:", doc.name, e.message);
            }
        }
    },
    'closeothers': async () => {
        const photoshop = require('photoshop');
        const active = photoshop.app.activeDocument;
        if (!active) return;
        const docs = [...photoshop.app.documents];
        for (const doc of docs) {
            if (doc.id !== active.id) {
                try {
                    await photoshop.core.executeAsModal(async () => {
                        await doc.close();
                    }, { commandName: "Close Other Document" });
                } catch (e) {
                    console.warn("[ActionService] Failed to close other document:", doc.name, e.message);
                }
            }
        }
    },
    'placeembedded': async () => {
        await batchPlay([{ _obj: "placeEvent", linked: false }], { dialogOptions: "display" });
    },
    'placelinked': async () => {
        await batchPlay([{ _obj: "placeEvent", linked: true }], { dialogOptions: "display" });
    },
    'package': async () => {
        await batchPlay([{ _obj: "package" }], { dialogOptions: "display" });
    },
    'batch': async () => {
        await batchPlay([{ _obj: "batch" }], { dialogOptions: "display" });
    },
    'imageprocessor': async () => {
        await batchPlay([{ _obj: "imageProcessor" }], { dialogOptions: "display" });
    }
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
        const { action } = require('photoshop');
        const { batchPlay } = action;
        // Use batchPlay with direct reference for reliable tool selection in UXP
        await core.executeAsModal(async () => {
            await batchPlay([{
                _obj: 'select',
                _target: [{ _ref: toolId }]
            }], { modalBehavior: 'execute' });
        }, { commandName: `Select Tool: ${toolId}` });
    } catch (bpError) {
        console.error(`[ActionService] Tool selection failed for "${toolId}":`, bpError);
        await core.showAlert(`Tool selection failed: "${toolId}"\nError: ${bpError.message}`);
    }
}

let cachedMenuMap = null;

const cleanMenuKey = (str) => {
    return String(str)
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/…/g, '')
        .replace(/&/g, 'and')
        .replace(/\//g, '')
        .replace(/\s+/g, '')
        .trim();
};

async function getMenuMap() {
    if (cachedMenuMap && Object.keys(cachedMenuMap).length > 0) return cachedMenuMap;
    const menuMap = {};
    try {
        const { action } = require('photoshop');
        const { batchPlay } = action;
        
        console.log("[ActionService] Querying application menuBarInfo via batchPlay...");
        const result = await batchPlay([{
            _obj: "get",
            _target: [{ _ref: "application", _enum: "ordinal", _value: "targetEnum" }],
            _property: "menuBarInfo"
        }], {});
        
        const menuBarInfo = result && result[0] && result[0].menuBarInfo;
        if (result && result[0]) {
            console.log("[ActionService] Query result keys:", Object.keys(result[0]));
            if (result[0].menuBarInfo) {
                console.log("[ActionService] menuBarInfo structure type:", typeof result[0].menuBarInfo);
            }
        }
        if (menuBarInfo) {
            const traverse = (items) => {
                if (!items) return;
                for (const item of items) {
                    const cmdId = item.commandId || item.commandID || item.id;
                    if (cmdId) {
                        const key = cleanMenuKey(item.name);
                        menuMap[key] = cmdId;
                    }
                    if (item.submenu) {
                        traverse(item.submenu);
                    }
                }
            };
            traverse(menuBarInfo);
            console.log(`[ActionService] Dynamically mapped ${Object.keys(menuMap).length} active menu command IDs from application menuBarInfo.`);
        } else {
            console.warn("[ActionService] menuBarInfo property was empty or not found in batchPlay result.");
        }
    } catch (e) {
        console.warn("[ActionService] Failed to dynamically query menuBarInfo via batchPlay:", e);
    }
    cachedMenuMap = menuMap;
    return menuMap;
}

// ─── Menu Command Execution ──────────────────────────────────────────────────

async function _executeMenuCommand(targetValue) {
    // Resolve legacy numeric IDs
    if (LEGACY_ID_MAP[targetValue]) {
        console.log(`[ActionService] Mapping legacy ID ${targetValue} → ${LEGACY_ID_MAP[targetValue]}`);
        targetValue = LEGACY_ID_MAP[targetValue];
    }

    // Map common string commands to numeric IDs for modal-safe performMenuCommand execution
    const MENU_TO_NUMERIC = {
        'selectall': 1017,
        'new': 1000,
        'open': 1001,
        'close': 1080,
        'closeall': 1081,
        'closeothers': 1085,
        'save': 1082,
        'saveas': 1083,
        'curves': 1010,
        'curves...': 1010,
        'levels': 1051,
        'levels...': 1051,
        'freetransform': 2207,
        'free transform': 2207,
        'fill': 1042,
        'fill...': 1042,
        'invert': 1013,
        'colorrange': 1021,
        'color range...': 1021,
        'flattenimage': 1046,
        'desaturate': 1016,
        'brightnesscontrast': 1211,
        'brightness/contrast...': 1211,
        'huesaturation': 1017,
        'hue/saturation...': 1017,
        'colorbalance': 1018,
        'color balance...': 1018,
        'blackandwhite': 1019,
        'black & white...': 1019,
        'photofilter': 1020,
        'photo filter...': 1020,
        'channelmixer': 1022,
        'channel mixer...': 1022,
        'colorlookup': 1023,
        'color lookup...': 1023,
        'posterize': 1024,
        'posterize...': 1024,
        'threshold': 1025,
        'threshold...': 1025,
        'gradientmap': 1026,
        'gradient map...': 1026,
        'selectivelcolor': 1027,
        'selective color...': 1027,
        'matchcolor': 1178,
        'match color...': 1178,
        'replacecolor': 1179,
        'replace color...': 1179,
        'shadows/highlights': 1180,
        'shadows/highlights...': 1180
    };

    const dynamicMenuMap = await getMenuMap();
    const cleanValue = cleanMenuKey(targetValue);
    const resolvedNumeric = dynamicMenuMap[cleanValue] || MENU_TO_NUMERIC[cleanValue] || Number(targetValue);
    const isNumeric = !isNaN(resolvedNumeric) && String(resolvedNumeric).length > 0;

    // Look up the actual menu item display name from our tools database for robust name-based fallbacks
    const { commonCommands } = require('../data/toolsData');
    const foundCmd = commonCommands.find(c => String(c.value) === String(targetValue));
    let resolvedName = targetValue;
    if (foundCmd) {
        const segments = foundCmd.label.split('>');
        resolvedName = segments[segments.length - 1].trim();
    }

    // Intercept File commands and execute via direct batchPlay descriptors to bypass UXP performMenuCommand restrictions
    const fileAction = FILE_COMMANDS[cleanValue];
    if (fileAction) {
        try {
            // Run outside executeAsModal first so interactive dialogs (like New, Open, Close)
            // are not blocked/suppressed by UXP's modal UI thread lock.
            await fileAction();
            return;
        } catch (e) {
            console.log(`[ActionService] File command '${cleanValue}' outside modal failed (expected for some save actions), retrying inside modal...`, e.message);
            try {
                await core.executeAsModal(async () => {
                    await fileAction();
                }, { commandName: `File: ${cleanValue}` });
                return;
            } catch (innerE) {
                if (innerE.message && innerE.message.includes('Time out')) return; // Dialog is open = success
                console.warn(`[ActionService] File command batchPlay failed for '${cleanValue}':`, innerE.message);
            }
        }
    }

    // Intercept standard adjustments and execute via direct descriptor to guarantee dialog box display
    const mappedEnum = KNOWN_MENU_COMMANDS[cleanValue];
    if (mappedEnum) {
        try {
            await core.executeAsModal(async () => {
                await batchPlay([{
                    _obj: mappedEnum,
                    _options: { dialogOptions: 'display' }
                }], { 
                    modalBehavior: 'execute',
                    dialogOptions: 'display'
                });
            }, { commandName: `Adjustment: ${mappedEnum}` });
            return;
        } catch (e) {
            if (e.message && e.message.includes('Time out')) return; // Dialog is open = success
            console.warn(`[ActionService] Descriptor-based batchPlay failed for '${mappedEnum}', falling through:`, e.message);
        }
    }

    if (isNumeric) {
        // Intercept Camera Raw Filter (1061) and execute via standard batchPlay descriptor
        if (resolvedNumeric === 1061) {
            try {
                await core.executeAsModal(async () => {
                    const bpRes = await batchPlay([{
                        _obj: 'Adobe Camera Raw Filter',
                        _options: { dialogOptions: 'display' }
                    }], { 
                        modalBehavior: 'execute',
                        dialogOptions: 'display'
                    });
                    console.log(`[ActionService] Camera Raw Filter batchPlay result:`, bpRes);
                }, { commandName: "Camera Raw Filter" });
                return;
            } catch (e) {
                if (e.message && e.message.includes('Time out')) return; // Dialog is open = success
                console.warn(`[ActionService] Camera Raw Filter batchPlay failed:`, e.message);
            }
        }

        // Numeric ID path - must use the object wrapper in this UXP version
        try {
            const res = await core.performMenuCommand({
                commandId: resolvedNumeric,
                commandID: resolvedNumeric,
                kcanDispatchWhileModal: true,
                _isCommand: false
            });
            console.log(`[ActionService] performMenuCommand result for ${resolvedNumeric}:`, res);
            // Only exit if the command was actually executed and available
            if (res && res.available !== false && res !== false) {
                return;
            }
            console.log(`[ActionService] Command ${resolvedNumeric} not available via performMenuCommand, trying batchPlay name fallback...`);
        } catch (e) {
            console.warn(`[ActionService] Numeric performMenuCommand failed for ${resolvedNumeric}:`, e.message);
        }
    }

    // String / enum path with multi-strategy fallback
    const forceEnum = !!mappedEnum;
    const originalValue = forceEnum ? mappedEnum : resolvedName;

    // Fallbacks using batchPlay (which still requires executeAsModal)
    const runSelectByRef = async (refType, refValue) => {
        const descriptor = {
            _obj: 'select',
            _target: [{ _ref: 'menuItemClass', [refType]: refValue }],
            _options: { dialogOptions: 'display' }
        };
        if (refType === '_value') descriptor._target[0]._enum = 'menuItemType';
        return await batchPlay([descriptor], { 
            modalBehavior: 'execute',
            dialogOptions: 'display'
        });
    };

    try {
        await core.executeAsModal(async () => {
            // Strategy 1: batchPlay enum
            if (forceEnum || /^[a-z][a-zA-Z0-9]*$/.test(originalValue)) {
                try { await runSelectByRef('_value', originalValue); return; } catch (e) { /* continue */ }
            }
            // Strategy 2: batchPlay by exact name
            try { await runSelectByRef('_name', originalValue); return; } catch (e) { /* continue */ }
            // Strategy 4: Name variations (strip/add ellipsis)
            const base = originalValue.replace(/\.|…/g, '');
            for (const v of [base + '...', base + '…', base].filter(v => v !== originalValue)) {
                try { await runSelectByRef('_name', v); return; } catch (e) { /* continue */ }
            }
            throw new Error(`Menu item '${originalValue}' could not be executed.`);
        }, { commandName: `Menu: ${originalValue}` });
    } catch (e) {
        if (e.message && e.message.includes('Time out')) return;
        await core.showAlert(`Could not execute menu item: "${originalValue}".\nError: ${e.message}`);
    }
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

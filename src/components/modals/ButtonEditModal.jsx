import React, { useState, useEffect } from 'react';
import { usePanel } from '../../context/PanelContext';
import { commonTools, commonCommands } from '../../data/toolsData';
import { blendModes } from '../../data/blendModesData';
import { adjustmentTypes } from '../../data/adjustmentsData';
import { layerActions } from '../../data/layerActionsData';
import { getActionSets } from '../../services/ActionSetService';

/**
 * Open Photoshop Native Adobe Color Picker with robust RGB & Hex parsing
 */
async function openAdobeColorPicker(initialColor = null) {
    try {
        const { app, core, action } = require('photoshop');
        const { batchPlay } = action;
        let pickedHex = null;

        await core.executeAsModal(async () => {
            // Set the foreground color first if an initial color is provided
            if (initialColor && /^#[0-9A-F]{6}$/i.test(initialColor)) {
                try {
                    const r = parseInt(initialColor.slice(1, 3), 16);
                    const g = parseInt(initialColor.slice(3, 5), 16);
                    const b = parseInt(initialColor.slice(5, 7), 16);
                    const solidColor = new app.SolidColor();
                    solidColor.rgb.red = r;
                    solidColor.rgb.green = g;
                    solidColor.rgb.blue = b;
                    app.foregroundColor = solidColor;
                } catch (e) {
                    console.log('Could not set initial color', e);
                }
            }

            const initialHex = app.foregroundColor.rgb.hexValue;
            const res = await batchPlay([{ _obj: 'showColorPicker', _isCommand: true }], {});
            
            const newHex = app.foregroundColor.rgb.hexValue;
            if (initialHex !== newHex) {
                pickedHex = `#${newHex}`;
            } else if (res && res[0]) {
                const c = res[0].RGBColor || res[0].color || res[0];
                let r = c.red ?? c._value ?? c.r ?? null;
                let g = c.green ?? c.g ?? null;
                let b = c.blue ?? c.b ?? null;
                if (r == null && c.rgb) {
                    r = c.rgb.red ?? c.rgb.r;
                    g = c.rgb.green ?? c.rgb.g;
                    b = c.rgb.blue ?? c.rgb.b;
                }
                if (r != null && g != null && b != null) {
                    const hexR = Math.round(r).toString(16).padStart(2, '0');
                    const hexG = Math.round(g).toString(16).padStart(2, '0');
                    const hexB = Math.round(b).toString(16).padStart(2, '0');
                    pickedHex = `#${hexR}${hexG}${hexB}`;
                }
            }
        }, { commandName: "Pick Color" });

        return pickedHex ? pickedHex.toUpperCase() : null;
    } catch (e) {
        console.error('[Adobe Color Picker Error]', e);
    }
    return null;
}

/**
 * ColorPickerRow for ButtonEditModal
 */
const ColorPickerRow = ({ label, color, onChange }) => {
    const PALETTE = [
        '#FFFFFF', '#AAAAAA', '#555555', '#2C2C2C', '#000000',
        '#0265DC', '#00A0E9', '#00C853', '#FFD600', '#FF9100', '#FF3D00', '#D32F2F', '#E91E63', '#9C27B0'
    ];

    const handlePickAdobeColor = async () => {
        const hex = await openAdobeColorPicker(color);
        if (hex && /^#[0-9A-F]{6}$/i.test(hex)) {
            onChange(hex);
        }
    };

    const safeColor = (typeof color === 'string' && color !== 'transparent' && !color.includes('NaN')) ? color : '#FFFFFF';

    return (
        <div className="omni-form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="omni-label">{label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                        role="button"
                        onClick={handlePickAdobeColor}
                        style={{
                            width: 22, height: 22, borderRadius: 4,
                            backgroundColor: safeColor,
                            border: '2px solid #0265DC',
                            cursor: 'pointer',
                        }}
                        title="Click to open Adobe Photoshop Color Picker"
                    />
                    <input
                        className="omni-input"
                        type="text"
                        value={color || ''}
                        onChange={(e) => onChange(e.target.value.toUpperCase())}
                        style={{ width: '70px', padding: '0 4px', fontSize: '10px' }}
                        placeholder="#HEX"
                    />
                </div>
            </div>
            <div className="omni-swatches" style={{ marginTop: 6 }}>
                {PALETTE.map(c => (
                    <div
                        key={c}
                        className={`omni-swatch ${color === c ? 'selected' : ''}`}
                        style={{ background: c }}
                        onClick={() => onChange(c)}
                        title={c}
                    />
                ))}
            </div>
        </div>
    );
};

/**
 * ButtonEditModal
 * Tabbed form for adding/editing action buttons.
 * Tabs: Action | Appearance
 * Fixes from DMP: clean categories, real PS actions, validation, shortcut field.
 */
const ButtonEditModal = ({ initialData, onConfirm, onCancel }) => {
    const isEdit = !!(initialData?.id);

    // Action tab state
    const [category, setCategory] = useState('tool');
    const [actionType, setActionType] = useState('tool');
    const [actionValue, setActionValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [psActions, setPsActions] = useState([]);
    const [psActionsLoaded, setPsActionsLoaded] = useState(false);

    // Appearance tab state
    const [label, setLabel] = useState('');
    const [showLabel, setShowLabel] = useState(true);
    const [buttonColor, setButtonColor] = useState('');
    const [textColor, setTextColor] = useState('');
    const [icon, setIcon] = useState('');
    const [buttonSize, setButtonSize] = useState('standard');
    const [fontSize, setFontSize] = useState('11px');
    const [shortcut, setShortcut] = useState('');

    const [activeTab, setActiveTab] = useState('action');
    const [errors, setErrors] = useState({});

    // Populate from initialData on open
    useEffect(() => {
        if (initialData) {
            setLabel(initialData.label || '');
            setShowLabel(initialData.showLabel !== false);
            setButtonColor(initialData.buttonColor || '');
            setTextColor(initialData.textColor || '');
            setIcon(initialData.icon || '');
            setButtonSize(initialData.buttonSize || 'standard');
            setFontSize(initialData.fontSize || '');
            setShortcut(initialData.shortcut || '');

            const initType = initialData.actionType || 'tool';
            setActionType(initType);
            setActionValue(initialData.actionValue || '');
            setSearchTerm(initialData.actionValue || '');
            // Map actionType to category
            if (initType === 'tool' || initType === 'customFunc') setCategory('tool');
            else if (initType === 'menu') setCategory('menu');
            else if (initType === 'playAction') setCategory('psAction');
            else if (initType === 'blend') setCategory('blend');
            else if (initType === 'adjustment') setCategory('adjustment');
            else if (initType === 'mask' || initType === 'merge' || initType === 'groups') setCategory('layer');
            else setCategory('tool');
        }
    }, [initialData]);

    // Load PS actions when category switches to psAction
    useEffect(() => {
        if (category === 'psAction' && !psActionsLoaded) {
            getActionSets().then(sets => {
                setPsActions(sets);
                setPsActionsLoaded(true);
            });
        }
    }, [category, psActionsLoaded]);

    // Build suggestions list based on category + search
    useEffect(() => {
        let pool = [];
        switch (category) {
            case 'tool':
                pool = [
                    ...commonTools.map(t => ({ ...t, type: t.type || 'tool', displayType: t.type === 'customFunc' ? 'Custom' : 'Tool' })),
                ];
                break;
            case 'menu':
                pool = commonCommands.map(c => ({ ...c, type: 'menu', displayType: 'Menu' }));
                break;
            case 'psAction':
                pool = psActions;
                break;
            case 'blend':
                pool = blendModes.map(b => ({ label: b.label, value: b.value, type: 'blend', displayType: `Blend · ${b.group}` }));
                break;
            case 'adjustment':
                pool = adjustmentTypes.map(a => ({ ...a, type: 'adjustment' }));
                break;
            case 'layer':
                pool = layerActions;
                break;
            default:
                pool = [];
        }

        if (!searchTerm) {
            setSuggestions(pool.slice(0, 80));
            return;
        }
        const q = searchTerm.toLowerCase();
        setSuggestions(pool.filter(item =>
            item.label.toLowerCase().includes(q) ||
            String(item.value).toLowerCase().includes(q)
        ).slice(0, 80));
    }, [category, searchTerm, psActions]);

    const handleSelectSuggestion = (item) => {
        setSearchTerm(item.label);
        setActionType(item.type);
        setActionValue(item.value);
        if (!label) setLabel(item.label.replace('...', '').replace('…', ''));
        setShowSuggestions(false);
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (suggestions[highlightedIndex]) handleSelectSuggestion(suggestions[highlightedIndex]); }
        else if (e.key === 'Escape') setShowSuggestions(false);
    };

    const validate = () => {
        const errs = {};
        if (!label.trim()) errs.label = 'Button label is required';
        if (!actionValue.trim()) errs.actionValue = 'Please select or enter an action';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSave = () => {
        if (!validate()) { setActiveTab('action'); return; }
        onConfirm({
            type: 'button',
            label: label.trim(),
            actionType,
            actionValue,
            showLabel,
            buttonColor,
            textColor,
            icon,
            buttonSize,
            fontSize,
            shortcut,
        });
    };

    const COLOR_SWATCHES = [
        { val: '', label: 'Default' },
        { val: '#d13438', label: 'Red' },
        { val: '#da3b01', label: 'Orange' },
        { val: '#ffaa44', label: 'Gold' },
        { val: '#107c10', label: 'Green' },
        { val: '#0078d4', label: 'Blue' },
        { val: '#881798', label: 'Purple' },
        { val: '#e3008c', label: 'Magenta' },
        { val: '#4a4a4a', label: 'Dark' },
        { val: '#202020', label: 'Black' },
    ];

    return (
        <div className="omni-modal-overlay">
            <div className="omni-modal">
                <div className="omni-modal-header">
                    <h3 className="omni-modal-title">{isEdit ? 'Edit Button' : 'Add Button'}</h3>
                    <button className="omni-modal-close" onClick={onCancel}>×</button>
                </div>

                {/* Tabs */}
                <div className="omni-modal-tabs">
                    {['action', 'appearance'].map(tab => (
                        <button
                            key={tab}
                            className={`omni-modal-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'action' ? '⚡ Action' : '🎨 Appearance'}
                        </button>
                    ))}
                </div>

                <div className="omni-modal-body">
                    {/* ── ACTION TAB ─────────────────────────────────────── */}
                    {activeTab === 'action' && (
                        <div className="omni-form-group-stack">
                            {/* Category selector */}
                            <div className="omni-form-group">
                                <label className="omni-label">Action Category</label>
                                <div className="omni-category-grid">
                                    {[
                                        { id: 'tool',       label: '🔧 Tools' },
                                        { id: 'menu',       label: '📋 Menu' },
                                        { id: 'psAction',   label: '▶ PS Action' },
                                        { id: 'blend',      label: '🎭 Blend Mode' },
                                        { id: 'adjustment', label: '🎚 Adjustment' },
                                        { id: 'layer',      label: '📄 Layer Ops' },
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            className={`omni-category-btn ${category === cat.id ? 'active' : ''}`}
                                            onClick={() => { setCategory(cat.id); setSearchTerm(''); setActionValue(''); setShowSuggestions(true); }}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Search / select */}
                            <div className="omni-form-group" style={{ position: 'relative' }}>
                                <label className="omni-label">
                                    {category === 'psAction' && !psActionsLoaded ? 'Loading PS Actions...' : 'Search & Select'}
                                </label>
                                <input
                                    className={`omni-input ${errors.actionValue ? 'error' : ''}`}
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setActionValue(e.target.value); setShowSuggestions(true); setHighlightedIndex(0); }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={`Search ${category}...`}
                                    autoFocus
                                />
                                {errors.actionValue && <span className="omni-error">{errors.actionValue}</span>}

                                {showSuggestions && suggestions.length > 0 && (
                                    <ul className="omni-suggestions">
                                        {suggestions.map((s, i) => (
                                            <li
                                                key={i}
                                                className={`omni-suggestion-item ${i === highlightedIndex ? 'highlighted' : ''}`}
                                                onMouseDown={() => handleSelectSuggestion(s)}
                                            >
                                                <span className="omni-suggestion-label">{s.label}</span>
                                                <span className="omni-suggestion-type">{s.displayType}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {actionValue && (
                                    <div className="omni-binding-preview">
                                        <span className="omni-binding-key">BOUND TO</span>
                                        <span className="omni-binding-value">{actionValue}</span>
                                        <span className="omni-binding-badge">{actionType}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── APPEARANCE TAB ─────────────────────────────────── */}
                    {activeTab === 'appearance' && (
                        <div className="omni-form-group-stack">
                            {/* Label */}
                            <div className="omni-form-group">
                                <label className="omni-label">Button Label</label>
                                <input
                                    className={`omni-input ${errors.label ? 'error' : ''}`}
                                    type="text"
                                    value={label}
                                    onChange={e => setLabel(e.target.value)}
                                    placeholder="e.g. Merge Down"
                                />
                                {errors.label && <span className="omni-error">{errors.label}</span>}
                            </div>

                            {/* Color Pickers */}
                            <ColorPickerRow
                                label="Background Color"
                                color={buttonColor}
                                onChange={setButtonColor}
                            />
                            <ColorPickerRow
                                label="Text Color"
                                color={textColor}
                                onChange={setTextColor}
                            />

                            {/* Font Size */}
                            <div className="omni-form-group">
                                <label className="omni-label">Font Size <span className="omni-label-hint">(optional)</span></label>
                                <input
                                    className="omni-input"
                                    type="text"
                                    value={fontSize}
                                    onChange={e => setFontSize(e.target.value)}
                                    placeholder="e.g. 10px, 12px, 14px"
                                />
                            </div>

                            {/* Icon + Size row */}
                            <div className="omni-form-row">
                                <div className="omni-form-group">
                                    <label className="omni-label">Icon (emoji or path)</label>
                                    <input className="omni-input" type="text" value={icon} onChange={e => setIcon(e.target.value)} placeholder="e.g. 🎨 or /icons/..." />
                                </div>
                                <div className="omni-form-group">
                                    <label className="omni-label">Size</label>
                                    <select className="omni-select" value={buttonSize} onChange={e => setButtonSize(e.target.value)}>
                                        <option value="xs">XS</option>
                                        <option value="sm">Small</option>
                                        <option value="standard">Standard</option>
                                        <option value="lg">Large</option>
                                        <option value="xl">XL</option>
                                    </select>
                                </div>
                            </div>

                            {/* Shortcut */}
                            <div className="omni-form-group">
                                <label className="omni-label">Keyboard Shortcut Label <span className="omni-label-hint">(display only)</span></label>
                                <input className="omni-input" type="text" value={shortcut} onChange={e => setShortcut(e.target.value)} placeholder="e.g. F5, Ctrl+1" />
                                <p className="omni-hint">Displayed as a badge on the button. Assign actual shortcut in PS via Edit → Keyboard Shortcuts.</p>
                            </div>

                            {/* Show Label toggle */}
                            <div className="omni-form-group">
                                <div className="omni-checkbox-row" onClick={() => setShowLabel(!showLabel)}>
                                    <div className={`omni-checkbox ${showLabel ? 'checked' : ''}`}>
                                        {showLabel && <span>✓</span>}
                                    </div>
                                    <span className="omni-checkbox-label">Show Label on Button</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="omni-modal-footer">
                    <button className="omni-btn omni-btn-cancel" onClick={onCancel}>Cancel</button>
                    <button className="omni-btn omni-btn-save" onClick={handleSave}>
                        {isEdit ? 'Update' : 'Add Button'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ButtonEditModal;

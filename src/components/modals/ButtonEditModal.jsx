import React, { useState, useEffect, useRef } from 'react';
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
        { val: '', label: 'Default', bg: 'linear-gradient(135deg, #2a2a2a 45%, #d13438 45%, #d13438 55%, #2a2a2a 55%)' },
        { val: '#FFFFFF', label: 'White', bg: '#FFFFFF' },
        { val: '#AAAAAA', label: 'Gray', bg: '#AAAAAA' },
        { val: '#444444', label: 'Dark', bg: '#444444' },
        { val: '#1A1A1A', label: 'Black', bg: '#1A1A1A' },
        { val: '#0265DC', label: 'Blue', bg: '#0265DC' },
        { val: '#00C853', label: 'Green', bg: '#00C853' },
        { val: '#FFD600', label: 'Gold', bg: '#FFD600' },
        { val: '#FF9100', label: 'Orange', bg: '#FF9100' },
        { val: '#D32F2F', label: 'Red', bg: '#D32F2F' },
        { val: '#9C27B0', label: 'Purple', bg: '#9C27B0' },
    ];

    const handlePickAdobeColor = async () => {
        const hex = await openAdobeColorPicker(color || '#FFFFFF');
        if (hex && /^#[0-9A-F]{6}$/i.test(hex)) {
            onChange(hex);
        }
    };

    const safeColor = (typeof color === 'string' && color && color !== 'transparent' && !color.includes('NaN')) 
        ? color 
        : '#FFFFFF';

    return (
        <div className="omni-form-group" style={{ gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="omni-label" style={{ fontSize: '9.5px', color: 'var(--color-text-dim)' }}>{label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                        role="button"
                        onClick={handlePickAdobeColor}
                        style={{
                            width: 20, height: 20, borderRadius: 3,
                            backgroundColor: color ? safeColor : '#222222',
                            border: color ? '1px solid #0078d4' : '1px solid #444444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box'
                        }}
                        title="Click to open Photoshop Color Picker"
                    >
                        {!color && <span style={{ fontSize: '10px', color: '#666', lineHeight: 1 }}>⊘</span>}
                    </div>
                    <input
                        className="omni-input"
                        type="text"
                        value={color || ''}
                        onChange={(e) => onChange(e.target.value.toUpperCase())}
                        style={{ width: '60px', height: '22px', padding: '0 4px', fontSize: '10px', textAlign: 'center' }}
                        placeholder="#HEX"
                    />
                </div>
            </div>
            <div className="omni-swatches" style={{ display: 'flex', gap: '3px', marginTop: '1px' }}>
                {PALETTE.map((p, idx) => (
                    <div
                        key={idx}
                        className={`omni-swatch ${(color === p.val || (!color && p.val === '')) ? 'selected' : ''}`}
                        style={{
                            background: p.bg,
                            flex: 1,
                            height: '16px',
                            borderRadius: '2px',
                            border: (color === p.val || (!color && p.val === '')) ? '1px solid #0078d4' : '1px solid #333333',
                            cursor: 'pointer',
                            boxSizing: 'border-box'
                        }}
                        onClick={() => onChange(p.val)}
                        title={p.label}
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
    const [selectedActions, setSelectedActions] = useState([]); // For multi-select
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
    const searchAreaRef = useRef(null);

    // Auto-retract suggestion window when clicking outside the search/suggestion area
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchAreaRef.current && !searchAreaRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => {
            document.removeEventListener('pointerdown', handleClickOutside);
        };
    }, []);

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
            if (initialData.actionValue) {
                setSelectedActions([{ type: initType, value: initialData.actionValue, label: initialData.label || initialData.actionValue }]);
            }
            setSearchTerm('');
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
        const isSelected = selectedActions.some(a => a.value === item.value);
        let updated;
        if (isSelected) {
            updated = selectedActions.filter(a => a.value !== item.value);
        } else {
            updated = [...selectedActions, { type: item.type, value: item.value, label: item.label.replace('...', '').replace('…', '') }];
        }
        setSelectedActions(updated);
        if (updated.length === 1) {
            setActionType(updated[0].type);
            setActionValue(updated[0].value);
            if (!label || label === initialData?.label) {
                setLabel(updated[0].label);
            }
        }
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, suggestions.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (suggestions[highlightedIndex]) handleSelectSuggestion(suggestions[highlightedIndex]); }
        else if (e.key === 'Escape') setShowSuggestions(false);
    };

    const handleSave = () => {
        const newErrors = {};
        const chosenAction = selectedActions.length === 1 ? selectedActions[0] : (actionValue ? { type: actionType, value: actionValue, label: label || actionValue } : null);
        
        if (selectedActions.length === 0 && !chosenAction) {
            newErrors.actionValue = 'Please select an action';
            setErrors(newErrors);
            setActiveTab('action');
            return;
        }

        // Auto-assign label if not explicitly typed
        let finalLabel = label.trim();
        if (!finalLabel) {
            if (chosenAction && chosenAction.label) {
                finalLabel = chosenAction.label.replace('...', '').replace('…', '');
            } else if (selectedActions.length > 1) {
                finalLabel = 'Multi';
            } else {
                finalLabel = 'Button';
            }
        }

        if (selectedActions.length > 1) {
            // Bulk insert multiple items
            const itemsToAdd = selectedActions.map((act) => ({
                type: 'button',
                label: act.label.replace('...', '').replace('…', ''),
                actionType: act.type,
                actionValue: act.value,
                buttonColor,
                textColor,
                icon,
                buttonSize,
                fontSize,
                showLabel,
                shortcut: ''
            }));
            onConfirm(itemsToAdd);
        } else {
            const singleAction = chosenAction || { type: actionType || 'tool', value: actionValue || 'tool_move' };
            onConfirm({
                ...(initialData || {}),
                type: 'button',
                label: finalLabel,
                actionType: singleAction.type,
                actionValue: singleAction.value,
                buttonColor,
                textColor,
                icon,
                buttonSize,
                fontSize,
                showLabel,
                shortcut
            });
        }
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
            <div className="omni-modal omni-modal--edit">
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
                            {tab === 'appearance' ? 'Appearance' : 'Action'}
                        </button>
                    ))}
                </div>

                <div className="omni-modal-body">
                    {/* ── ACTION TAB ─────────────────────────────────────── */}
                    {activeTab === 'action' && (
                        <div className="omni-form-group-stack" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Search & Suggestions Container with outside click detection */}
                            <div 
                                ref={searchAreaRef} 
                                onPointerDown={(e) => e.stopPropagation()}
                                style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}
                            >
                                {/* 1. Search Field */}
                                <div className="omni-form-group" style={{ position: 'relative', margin: 0 }}>
                                    <input
                                        className={`omni-input ${errors.actionValue ? 'error' : ''}`}
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => { setSearchTerm(e.target.value); setShowSuggestions(true); setHighlightedIndex(0); }}
                                        onClick={() => setShowSuggestions(true)}
                                        onFocus={() => setShowSuggestions(true)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={category === 'psAction' && !psActionsLoaded ? "Loading PS Actions..." : `Search ${category === 'psAction' ? 'Actions' : category + 's'}...`}
                                        style={{ height: '46px', fontSize: '14px', borderRadius: '6px', padding: '0 12px', background: '#121212', border: '1px solid var(--color-border-hi)', boxSizing: 'border-box' }}
                                    />
                                    {errors.actionValue && <span className="omni-error" style={{ marginTop: '2px' }}>{errors.actionValue}</span>}
                                </div>

                                {/* 2. Suggestions List */}
                                {showSuggestions && (
                                    <div style={{ height: '165px', minHeight: '165px', maxHeight: '165px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px', background: '#181818', padding: '2px 0', boxSizing: 'border-box' }}>
                                        {/* Suggestions Header bar */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px', borderBottom: '1px solid #282828', background: '#202020' }}>
                                            <span style={{ fontSize: '9px', fontWeight: '600', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {!isEdit && selectedActions.length > 0 ? `${selectedActions.length} Selected` : 'Select Action'}
                                            </span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setShowSuggestions(false); }}
                                                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '11px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
                                            >
                                                ✕ Close
                                            </button>
                                        </div>
                                        {suggestions.length > 0 ? (
                                            <ul className="omni-suggestions" style={{ display: 'block', position: 'static', width: '100%', margin: 0, padding: 0, listStyle: 'none', background: 'transparent' }}>
                                                {suggestions.map((s, i) => {
                                                    const isSelected = selectedActions.some(a => a.value === s.value);
                                                    return (
                                                        <li
                                                            key={i}
                                                            className={`omni-suggestion-item ${i === highlightedIndex ? 'highlighted' : ''}`}
                                                            onClick={() => handleSelectSuggestion(s)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #242424', background: isSelected ? 'rgba(0, 120, 212, 0.18)' : 'transparent' }}
                                                        >
                                                            {/* Custom checkbox */}
                                                            <div
                                                                className={`omni-checkbox ${isSelected ? 'checked' : ''}`}
                                                                style={{ flexShrink: 0, width: '16px', height: '16px', border: isSelected ? '1px solid #0078d4' : '1px solid #666', background: isSelected ? '#0078d4' : '#282828', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                {isSelected && <span style={{ fontSize: '11px', color: '#ffffff', fontWeight: 'bold', lineHeight: 1 }}>✓</span>}
                                                            </div>
                                                            <span className="omni-suggestion-label" style={{ flexGrow: 1, fontSize: '12px', color: isSelected ? '#ffffff' : 'var(--color-text)' }}>{s.label}</span>
                                                            <span className="omni-suggestion-type" style={{ fontSize: '9px', opacity: 0.55, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.displayType}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--color-text-dim)', fontSize: '11px' }}>
                                                No matching actions found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 3. Category selector */}
                            <div className="omni-form-group" style={{ marginTop: '2px', flexShrink: 0 }} onPointerDown={(e) => e.stopPropagation()}>
                                <label className="omni-label" style={{ fontSize: '9px', marginBottom: '4px', color: 'var(--color-text-muted)' }}>Filter Category</label>
                                <div className="omni-category-grid" style={{ gap: '4px', display: 'flex', flexWrap: 'wrap' }}>
                                    {[
                                        { id: 'tool',       label: '🔧 Tools' },
                                        { id: 'menu',       label: '📋 Menu' },
                                        { id: 'psAction',   label: '▶ Actions' },
                                        { id: 'blend',      label: '🎭 Blends' },
                                        { id: 'adjustment', label: '🎚 Adjusts' },
                                        { id: 'layer',      label: '📄 Layer Ops' },
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            className={`omni-category-btn ${category === cat.id ? 'active' : ''}`}
                                            onClick={() => { setCategory(cat.id); setSearchTerm(''); setActionValue(''); setShowSuggestions(true); }}
                                            style={{ fontSize: '9.5px', padding: '4px 2px', flex: '1 1 calc(33.33% - 4px)', height: '26px', lineHeight: '16px' }}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 4. Selection / Bound preview badge */}
                            {selectedActions.length > 0 && (
                                <div className="omni-binding-preview" style={{ marginTop: '2px', flexShrink: 0 }}>
                                    <span className="omni-binding-key">{selectedActions.length === 1 ? 'BOUND TO' : 'SELECTED'}</span>
                                    <span className="omni-binding-value">
                                        {selectedActions.length === 1 ? selectedActions[0].value : `${selectedActions.length} items selected`}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── APPEARANCE TAB ─────────────────────────────────── */}
                    {activeTab === 'appearance' && (
                        <div className="omni-form-group-stack" style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                            {/* Label & Font Size Row */}
                            <div className="omni-form-row" style={{ display: 'flex', gap: '8px' }}>
                                <div className="omni-form-group" style={{ flex: 1 }}>
                                    <label className="omni-label" style={{ fontSize: '9.5px' }}>Button Label {selectedActions.length > 1 && <span className="omni-label-hint">(Auto-gen)</span>}</label>
                                    <input
                                        className={`omni-input ${errors.label ? 'error' : ''}`}
                                        type="text"
                                        value={selectedActions.length > 1 ? 'Auto-generated' : label}
                                        onChange={e => setLabel(e.target.value)}
                                        placeholder="e.g. Merge Down"
                                        disabled={selectedActions.length > 1}
                                        style={{ opacity: selectedActions.length > 1 ? 0.5 : 1 }}
                                    />
                                    {errors.label && <span className="omni-error">{errors.label}</span>}
                                </div>
                                <div className="omni-form-group" style={{ width: '65px', flexShrink: 0 }}>
                                    <label className="omni-label" style={{ fontSize: '9.5px' }}>Font Size</label>
                                    <input
                                        className="omni-input"
                                        type="text"
                                        value={fontSize}
                                        onChange={e => setFontSize(e.target.value)}
                                        placeholder="11px"
                                        style={{ textAlign: 'center' }}
                                    />
                                </div>
                            </div>

                            {/* Color Pickers */}
                            <ColorPickerRow
                                label="Text Color"
                                color={textColor}
                                onChange={setTextColor}
                            />
                            <ColorPickerRow
                                label="Background Color"
                                color={buttonColor}
                                onChange={setButtonColor}
                            />

                            {/* Icon & Shortcut Row */}
                            <div className="omni-form-row" style={{ display: 'flex', gap: '8px' }}>
                                <div className="omni-form-group" style={{ flex: 1, minWidth: 0 }}>
                                    <label className="omni-label" style={{ fontSize: '9.5px' }}>Icon (emoji / path)</label>
                                    <input
                                        className="omni-input"
                                        type="text"
                                        value={icon}
                                        onChange={e => setIcon(e.target.value)}
                                        placeholder="e.g. 🎨"
                                    />
                                </div>
                                <div className="omni-form-group" style={{ flex: 1, minWidth: 0 }}>
                                    <label className="omni-label" style={{ fontSize: '9.5px' }}>Shortcut Label <span className="omni-label-hint">(display)</span></label>
                                    <input
                                        className="omni-input"
                                        type="text"
                                        value={shortcut}
                                        onChange={e => setShortcut(e.target.value)}
                                        placeholder="e.g. F5"
                                    />
                                </div>
                            </div>

                            {/* Show Label Checkbox Row */}
                            <div className="omni-form-row" style={{ marginTop: '2px' }}>
                                <div
                                    className="omni-checkbox-row"
                                    onClick={() => setShowLabel(!showLabel)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        padding: '4px 0'
                                    }}
                                >
                                    <div className={`omni-checkbox ${showLabel ? 'checked' : ''}`} style={{ width: '16px', height: '16px', flexShrink: 0 }}>
                                        {showLabel && <span style={{ fontSize: '11px', lineHeight: 1 }}>✓</span>}
                                    </div>
                                    <span className="omni-checkbox-label" style={{ fontSize: '11.5px', color: '#e0e0e0', userSelect: 'none' }}>Show Label</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="omni-modal-footer">
                    <button className="omni-btn omni-btn-cancel" onClick={onCancel}>Cancel</button>
                    <button className="omni-btn omni-btn-save" onClick={handleSave}>
                        {isEdit ? 'Update Button' : (selectedActions.length > 1 ? `Add (${selectedActions.length}) Buttons` : 'Add Button')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ButtonEditModal;

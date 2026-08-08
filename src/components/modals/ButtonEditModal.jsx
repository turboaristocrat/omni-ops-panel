import React, { useState, useEffect } from 'react';
import { usePanel } from '../../context/PanelContext';
import { commonTools, commonCommands } from '../../data/toolsData';
import { blendModes } from '../../data/blendModesData';
import { adjustmentTypes } from '../../data/adjustmentsData';
import { layerActions } from '../../data/layerActionsData';
import { getActionSets } from '../../services/ActionSetService';

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

                            {/* Button Color */}
                            <div className="omni-form-group">
                                <label className="omni-label">Button Color</label>
                                <div className="omni-color-row">
                                    <div className="omni-color-picker-wrap" title="Custom color">
                                        <div className="omni-color-swatch-preview" style={{ backgroundColor: buttonColor || '#2e2e2e' }} />
                                        <input type="color" value={buttonColor || '#2e2e2e'} onChange={e => setButtonColor(e.target.value)} className="omni-color-input" />
                                    </div>
                                    <div className="omni-swatches">
                                        {COLOR_SWATCHES.map((s, i) => (
                                            <div
                                                key={i}
                                                className={`omni-swatch ${buttonColor === s.val ? 'selected' : ''}`}
                                                style={{ backgroundColor: s.val || '#2e2e2e' }}
                                                title={s.label}
                                                onClick={() => setButtonColor(s.val)}
                                            >
                                                {!s.val && <span className="omni-swatch-x">✕</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
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

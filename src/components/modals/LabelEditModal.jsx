import React, { useState, useEffect } from 'react';

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
            
            // This pops the native PS color picker
            const res = await batchPlay([{ _obj: 'showColorPicker', _isCommand: true }], {});
            
            // If user clicked OK and changed the foreground color
            const newHex = app.foregroundColor.rgb.hexValue;
            if (initialHex !== newHex) {
                pickedHex = `#${newHex}`;
            } 
            // Or if batchPlay returned a color directly
            else if (res && res[0]) {
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
 * ColorPickerRow
 * Interactive Spectrum color selector using Adobe Photoshop Color Picker.
 */
const ColorPickerRow = ({ label, color, onChange, allowTransparent = false }) => {
    const PALETTE = [
        '#FFFFFF', '#E0E0E0', '#999999', '#444444', '#1A1A1A',
        '#0265DC', '#00A0E9', '#00C853', '#FFD600', '#FF9100', '#FF3D00', '#D32F2F', '#E91E63', '#9C27B0'
    ];

    const handlePickAdobeColor = async () => {
        const hex = await openAdobeColorPicker(color);
        if (hex && /^#[0-9A-F]{6}$/i.test(hex)) {
            onChange(hex);
        }
    };

    const safeColor = (typeof color === 'string' && color !== 'transparent' && !color.includes('NaN')) ? color : (allowTransparent ? 'transparent' : '#FFFFFF');

    return (
        <div className="omni-form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="omni-label">{label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Swatch Preview Box — Clicking opens Adobe Color Picker */}
                    <div
                        role="button"
                        onClick={handlePickAdobeColor}
                        style={{
                            width: 22, height: 22, borderRadius: 4,
                            backgroundColor: safeColor === 'transparent' ? '#111' : safeColor,
                            border: '2px solid #0265DC',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, color: '#aaa'
                        }}
                        title="Click to open Adobe Photoshop Color Picker"
                    >
                        {safeColor === 'transparent' ? '✕' : ''}
                    </div>
                    <input
                        className="omni-input"
                        type="text"
                        value={safeColor}
                        onChange={e => onChange(e.target.value)}
                        style={{ width: 75, height: 22, fontSize: 11, textAlign: 'center', padding: 0 }}
                        placeholder="#Hex..."
                    />
                </div>
            </div>
            
            {/* Palette Swatches */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {allowTransparent && (
                    <div
                        role="button"
                        onClick={() => onChange('transparent')}
                        style={{
                            width: 18, height: 18, borderRadius: 3,
                            backgroundColor: '#181818',
                            border: safeColor === 'transparent' ? '2px solid #0265DC' : '1px solid #333',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, color: '#aaa'
                        }}
                        title="Transparent"
                    >
                        ✕
                    </div>
                )}
                {PALETTE.map((c, idx) => {
                    const isSelected = safeColor.toLowerCase() === c.toLowerCase();
                    return (
                        <div
                            key={idx}
                            role="button"
                            onClick={() => {
                                if (isSelected) handlePickAdobeColor();
                                else onChange(c);
                            }}
                            style={{
                                width: 18, height: 18, borderRadius: 3,
                                backgroundColor: c,
                                border: isSelected ? '2px solid #0265DC' : '1px solid #333',
                                cursor: 'pointer'
                            }}
                            title={isSelected ? 'Click again for Adobe Color Picker' : c}
                        />
                    );
                })}
            </div>
        </div>
    );
};

/**
 * LabelEditModal
 * Dedicated modal for section header labels.
 * Controls: Text input, Alignment (Left, Center, Right), Text Color, Background Color.
 */
const LabelEditModal = ({ initialData, onConfirm, onCancel }) => {
    const isEdit = !!(initialData?.id);

    const [text, setText] = useState('');
    const [textAlign, setTextAlign] = useState('left');
    const [fontSize, setFontSize] = useState('10px');
    const [textColor, setTextColor] = useState('#ffffff');
    const [backgroundColor, setBackgroundColor] = useState('transparent');

    useEffect(() => {
        if (initialData) {
            setText((initialData.text || initialData.label || '').trim());
            setTextAlign(initialData.textAlign || 'left');
            setFontSize(initialData.fontSize || '10px');
            setTextColor(typeof initialData.textColor === 'string' && !initialData.textColor.includes('NaN') ? initialData.textColor : '#ffffff');
            setBackgroundColor(typeof initialData.backgroundColor === 'string' && !initialData.backgroundColor.includes('NaN') ? initialData.backgroundColor : 'transparent');
        }
    }, [initialData]);

    const handleSave = () => {
        onConfirm({
            type: 'label',
            text: text.trim(),
            label: text.trim(),
            textAlign,
            fontSize,
            textColor,
            backgroundColor,
        });
    };

    return (
        <div className="omni-modal-overlay">
            <div className="omni-modal omni-modal--sm" style={{ width: 280 }}>
                <div className="omni-modal-header">
                    <h3 className="omni-modal-title">{isEdit ? 'Edit Section Header' : 'Add Section Header'}</h3>
                    <div className="omni-modal-close" onClick={onCancel} role="button">×</div>
                </div>

                <div className="omni-modal-body">
                    <div className="omni-form-group-stack">
                        {/* Header Text */}
                        <div className="omni-form-group">
                            <label className="omni-label">Header Text</label>
                            <input
                                className="omni-input"
                                type="text"
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="e.g. COLOR GRADE"
                                autoFocus
                            />
                        </div>

                        {/* Alignment */}
                        <div className="omni-form-group">
                            <label className="omni-label">Alignment</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {[
                                    { id: 'left',   label: 'Left' },
                                    { id: 'center', label: 'Center' },
                                    { id: 'right',  label: 'Right' },
                                ].map(align => (
                                    <div
                                        key={align.id}
                                        role="button"
                                        style={{
                                            flex: 1,
                                            padding: '4px 0',
                                            fontSize: '11px',
                                            height: '26px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: textAlign === align.id ? '#0265DC' : '#2a2a2a',
                                            color: textAlign === align.id ? '#ffffff' : '#aaaaaa',
                                            borderRadius: '3px',
                                            cursor: 'pointer',
                                            fontWeight: textAlign === align.id ? '600' : 'normal'
                                        }}
                                        onClick={() => setTextAlign(align.id)}
                                    >
                                        {align.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Font Size */}
                        <div className="omni-form-group">
                            <label className="omni-label">Font Size</label>
                            <input
                                className="omni-input"
                                type="text"
                                value={fontSize}
                                onChange={e => setFontSize(e.target.value)}
                                placeholder="e.g. 10px, 12px, 14px"
                            />
                        </div>

                        {/* Text Color Picker */}
                        <ColorPickerRow
                            label="Text Color"
                            color={textColor}
                            onChange={setTextColor}
                            allowTransparent={false}
                        />

                        {/* Background Color Picker */}
                        <ColorPickerRow
                            label="Background Color"
                            color={backgroundColor}
                            onChange={setBackgroundColor}
                            allowTransparent={true}
                        />
                    </div>
                </div>

                <div className="omni-modal-footer">
                    <button className="omni-btn omni-btn-cancel" onClick={onCancel}>Cancel</button>
                    <button className="omni-btn omni-btn-save" onClick={handleSave} disabled={!text.trim()}>
                        {isEdit ? 'Update' : 'Add Header'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LabelEditModal;

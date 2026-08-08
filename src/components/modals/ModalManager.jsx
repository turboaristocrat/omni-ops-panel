import React, { useState } from 'react';
import ButtonEditModal from './ButtonEditModal';
import LabelEditModal from './LabelEditModal';

/**
 * ModalManager
 * Routes modal state to the correct modal component.
 * Supported types: add_item, edit_item, confirm, new_tab, tab, context_menu
 */
const ModalManager = ({ modalState, closeModal }) => {
    const { isOpen, type, onConfirm, initialData } = modalState;
    const [ctxVisible, setCtxVisible] = useState(true);

    if (!isOpen) return null;

    const handleConfirm = (data) => {
        closeModal();
        onConfirm && onConfirm(data);
    };

    const handleCancel = () => closeModal();

    // ── Label add/edit ───────────────────────────────────────────────────
    if ((type === 'add_item' || type === 'edit_item') && initialData?.type === 'label') {
        return (
            <LabelEditModal
                initialData={initialData}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        );
    }

    // ── Button add/edit ──────────────────────────────────────────────────
    if (type === 'add_item' || type === 'edit_item') {
        return (
            <ButtonEditModal
                initialData={type === 'edit_item' ? initialData : { type: 'button' }}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        );
    }

    // ── Confirm dialog ───────────────────────────────────────────────────
    if (type === 'confirm') {
        return (
            <div className="omni-modal-overlay">
                <div className="omni-modal omni-modal--sm">
                    <div className="omni-modal-header">
                        <h3 className="omni-modal-title">Confirm</h3>
                    </div>
                    <div className="omni-modal-body">
                        <p style={{ margin: 0, color: 'var(--color-text)' }}>
                            {initialData?.message || 'Are you sure?'}
                        </p>
                    </div>
                    <div className="omni-modal-footer">
                        <button className="omni-btn omni-btn-cancel" onClick={handleCancel}>Cancel</button>
                        <button className="omni-btn omni-btn-danger" onClick={() => handleConfirm(true)}>Confirm</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Add Item Type Selection ──────────────────────────────────────────
    if (type === 'add_item_select') {
        return (
            <div className="omni-modal-overlay">
                <div className="omni-modal omni-modal--sm" style={{ width: 280 }}>
                    <div className="omni-modal-header">
                        <h3 className="omni-modal-title">Select Item Type</h3>
                        <div className="omni-modal-close" onClick={handleCancel} role="button">×</div>
                    </div>
                    <div className="omni-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button 
                            className="omni-btn" 
                            style={{ padding: '12px', background: '#0265DC', border: 'none' }}
                            onClick={() => handleConfirm('button')}
                        >
                            + Action Button
                        </button>
                        <button 
                            className="omni-btn" 
                            style={{ padding: '12px', background: '#333', border: '1px solid #555' }}
                            onClick={() => handleConfirm('label')}
                        >
                            + Section Label
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Tab create/rename ────────────────────────────────────────────────
    if (type === 'new_tab' || type === 'tab') {
        return (
            <TabNameModal
                initialLabel={type === 'tab' ? initialData?.label : ''}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                title={type === 'new_tab' ? 'New Tab' : 'Rename Tab'}
            />
        );
    }

    // ── Right-click context menu ─────────────────────────────────────────
    if (type === 'context_menu') {
        const { item, x, y } = initialData;
        return (
            <div
                className="omni-modal-overlay omni-modal-overlay--transparent"
                onClick={handleCancel}
            >
                <div
                    className="omni-context-menu"
                    style={{ position: 'fixed', top: Math.min(y, window.innerHeight - 120), left: Math.min(x, window.innerWidth - 140) }}
                    onClick={e => e.stopPropagation()}
                >
                    <button className="omni-context-item" onClick={() => handleConfirm('edit')}>✏️ Edit</button>
                    <button className="omni-context-item" onClick={() => handleConfirm('duplicate')}>⧉ Duplicate</button>
                    <div className="omni-context-divider" />
                    <button className="omni-context-item omni-context-item--danger" onClick={() => handleConfirm('delete')}>🗑 Delete</button>
                </div>
            </div>
        );
    }

    return null;
};

// ── Tab name input sub-modal ─────────────────────────────────────────────────
const TabNameModal = ({ initialLabel, onConfirm, onCancel, title }) => {
    const [label, setLabel] = useState(initialLabel || '');
    return (
        <div className="omni-modal-overlay">
            <div className="omni-modal omni-modal--sm">
                <div className="omni-modal-header">
                    <h3 className="omni-modal-title">{title}</h3>
                    <button className="omni-modal-close" onClick={onCancel}>×</button>
                </div>
                <div className="omni-modal-body">
                    <div className="omni-form-group">
                        <label className="omni-label">Tab Name</label>
                        <input
                            className="omni-input"
                            type="text"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') onConfirm({ label }); if (e.key === 'Escape') onCancel(); }}
                            placeholder="Tab name..."
                            autoFocus
                        />
                    </div>
                </div>
                <div className="omni-modal-footer">
                    <button className="omni-btn omni-btn-cancel" onClick={onCancel}>Cancel</button>
                    <button className="omni-btn omni-btn-save" onClick={() => onConfirm({ label })} disabled={!label.trim()}>
                        {title.includes('New') ? 'Create' : 'Rename'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalManager;

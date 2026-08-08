import React, { useState, useRef, useEffect } from 'react';
import { usePanel } from '../context/PanelContext';
import TabBar from './TabBar';
import Space from './Space';
import ModalManager from './modals/ModalManager';

/**
 * Panel
 * Main container. Handles: tabs, space rendering, edit mode, delete,
 * modal management, responsive mini-mode.
 */
const Panel = () => {
    const {
        config, activeSpaceId, isEditing, setIsEditing,
        selectedItemId, setSelectedItemId, modalState, closeModal, updateConfig, showModal
    } = usePanel();

    const panelRef = useRef(null);
    const [isMini, setIsMini] = useState(false);
    const [isCompact, setIsCompact] = useState(false);

    // Mini mode detection
    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                const w = entry.contentRect.width;
                setIsMini(w < 90);
                setIsCompact(w < 160);
            }
        });
        if (panelRef.current) observer.observe(panelRef.current);
        return () => observer.disconnect();
    }, []);

    // Get active space + its index
    const spaces = config.panels[0].spaces;
    const spaceIndex = spaces.findIndex(s => s.id === activeSpaceId);
    const activeSpace = spaces[spaceIndex >= 0 ? spaceIndex : 0];
    const activeSpaceIdx = spaceIndex >= 0 ? spaceIndex : 0;

    // Delete selected item
    const handleDeleteSelected = () => {
        if (!selectedItemId) return;
        showModal('confirm', () => {
            const newConfig = JSON.parse(JSON.stringify(config));
            const layout = newConfig.panels[0].spaces[activeSpaceIdx].layout;
            layout.items = layout.items.filter(it => it.id !== selectedItemId);
            updateConfig(newConfig);
            setSelectedItemId(null);
        }, { message: 'Delete selected item?' });
    };

    const editBtnClass = isEditing ? 'omni-header-btn active' : 'omni-header-btn';

    return (
        <div
            ref={panelRef}
            className={`omni-panel ${isMini ? 'mini-mode' : ''} ${isCompact ? 'compact-mode' : ''} ${isEditing ? 'edit-mode' : ''}`}
        >
            {/* Edit Mode Banner */}
            {isEditing && (
                <div className="omni-edit-banner">
                    ✏ Edit Mode — Drag to move · Double-click to edit · Right-click for options
                </div>
            )}

            {/* Tab Bar / Header */}
            <TabBar onDeleteSelected={handleDeleteSelected} isMini={isMini} />

            {/* Space Content */}
            <div className="omni-space-wrapper">
                {activeSpace ? (
                    <Space space={activeSpace} spaceIndex={activeSpaceIdx} />
                ) : (
                    <div className="omni-empty-state">
                        <div className="omni-empty-icon">◧</div>
                        <p>No tabs yet.</p>
                        <button className="omni-btn omni-btn-save" onClick={() => setIsEditing(true)}>
                            Enter Edit Mode to Start
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            {!isMini && (
                <div className="omni-footer">
                    <span className="omni-footer-grip" title="Resize panel">⠿</span>
                </div>
            )}

            {/* Modal layer */}
            <ModalManager modalState={modalState} closeModal={closeModal} />
        </div>
    );
};

export default Panel;

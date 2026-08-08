import React from 'react';
import { usePanel } from '../context/PanelContext';

import pencilDark from '../assets/pencil-dark.png';
import pencilLight from '../assets/pencil-light.png';
import trashLight from '../assets/trash-light.png';

/**
 * TabBar
 * Renders space tabs and edit mode controls using div elements instead of native <button>
 * to prevent UXP native button background overrides.
 */
const TabBar = ({ onDeleteSelected, isMini }) => {
    const { config, activeSpaceId, setActiveSpaceId, isEditing, setIsEditing, selectedItemId, updateConfig, showModal } = usePanel();
    const spaces = config.panels[0].spaces;

    const handleAddSpace = () => {
        showModal('new_tab', (data) => {
            const newId = `space_${Date.now()}`;
            const newSpace = {
                id: newId,
                name: data.label || 'New Tab',
                layout: { type: 'grid', columns: 6, items: [] }
            };
            const newConfig = JSON.parse(JSON.stringify(config));
            newConfig.panels[0].spaces.push(newSpace);
            updateConfig(newConfig);
            setActiveSpaceId(newId);
        }, { type: 'new_tab' });
    };

    const handleDeleteSpace = (e, spaceId) => {
        e.stopPropagation();
        if (spaces.length <= 1) return;
        showModal('confirm', () => {
            const newConfig = JSON.parse(JSON.stringify(config));
            const idx = newConfig.panels[0].spaces.findIndex(s => s.id === spaceId);
            if (idx > -1) {
                newConfig.panels[0].spaces.splice(idx, 1);
                updateConfig(newConfig);
                if (activeSpaceId === spaceId) {
                    setActiveSpaceId(newConfig.panels[0].spaces[0].id);
                }
            }
        }, { message: 'Delete this tab? This cannot be undone.' });
    };

    const handleRenameSpace = (e, spaceId, currentName) => {
        e.stopPropagation();
        showModal('tab', (data) => {
            const newConfig = JSON.parse(JSON.stringify(config));
            const space = newConfig.panels[0].spaces.find(s => s.id === spaceId);
            if (space) { space.name = data.label; updateConfig(newConfig); }
        }, { label: currentName, type: 'tab' });
    };

    return (
        <div className="omni-tabbar">
            <div className="omni-tabs-scroll">
                {spaces.map(space => (
                    <div
                        key={space.id}
                        className={`omni-tab ${activeSpaceId === space.id ? 'active' : ''}`}
                        onClick={() => setActiveSpaceId(space.id)}
                        onDoubleClick={(e) => isEditing && handleRenameSpace(e, space.id, space.name)}
                        title={isEditing ? 'Double-click to rename' : space.name}
                        style={{ paddingRight: (isEditing && spaces.length > 1 && activeSpaceId === space.id) ? 28 : 14 }}
                    >
                        <span className="omni-tab-label">{space.name}</span>
                        {isEditing && spaces.length > 1 && activeSpaceId === space.id && (
                            <span
                                className="omni-tab-delete"
                                onClick={(e) => handleDeleteSpace(e, space.id)}
                                title="Delete Tab"
                                role="button"
                            >✕</span>
                        )}
                    </div>
                ))}
                {isEditing && (
                    <div className="omni-tab omni-tab-add" onClick={handleAddSpace} title="Add Tab" role="button">
                        +
                    </div>
                )}
            </div>
            
            <div className="omni-header-actions">
                {isEditing && selectedItemId && (
                    <div
                        className="omni-header-btn omni-header-btn--danger"
                        onClick={onDeleteSelected}
                        title="Delete Selected Item"
                        role="button"
                    >
                        <img src={trashLight} style={{ width: 18, height: 18, display: 'block' }} alt="Delete" />
                    </div>
                )}
                <div
                    className={`omni-header-btn ${isEditing ? 'active edit-pencil' : ''}`}
                    onClick={() => setIsEditing(!isEditing)}
                    title={isEditing ? 'Exit Edit Mode' : 'Enter Edit Mode'}
                    role="button"
                >
                    <img
                        src={isEditing ? pencilDark : pencilLight}
                        style={{ width: 18, height: 18, display: 'block' }}
                        alt="Edit"
                    />
                </div>
            </div>
        </div>
    );
};

export default TabBar;

import React from 'react';
import { usePanel } from '../context/PanelContext';

/**
 * TabBar
 * Renders space tabs. In edit mode: double-click to rename, × to delete, + to add.
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
                layout: { type: 'grid', columns: 8, items: [] }
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
                        style={{ paddingRight: isEditing ? 24 : undefined }}
                    >
                        <span className="omni-tab-label">{space.name}</span>
                        {isEditing && spaces.length > 1 && activeSpaceId === space.id && (
                            <button
                                className="omni-tab-delete"
                                onClick={(e) => handleDeleteSpace(e, space.id)}
                                title="Delete Tab"
                            >✕</button>
                        )}
                    </div>
                ))}
                {isEditing && (
                    <div className="omni-tab omni-tab-add" onClick={handleAddSpace} title="Add Tab">
                        +
                    </div>
                )}
            </div>
            
            <div className="omni-header-actions">
                {isEditing && selectedItemId && (
                    <button
                        className="omni-header-btn omni-header-btn--danger"
                        onClick={onDeleteSelected}
                        title="Delete Selected Button"
                    >
                        🗑
                    </button>
                )}
                <button
                    className={`omni-header-btn ${isEditing ? 'active edit-pencil' : ''}`}
                    onClick={() => setIsEditing(!isEditing)}
                    title={isEditing ? 'Exit Edit Mode' : 'Enter Edit Mode'}
                >
                    {isEditing ? '✏' : '✏'}
                </button>
            </div>
        </div>
    );
};

export default TabBar;

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ActionButton from './items/ActionButton';
import { usePanel } from '../context/PanelContext';

const MIN_W = 1;
const MIN_H = 1;
// We now calculate row height dynamically based on width to ensure square buttons

/**
 * GridLayout
 * Renders items in a free-form grid with drag, resize, and edit support.
 *
 * CRITICAL FIX from DMP Tools Panel:
 * The `path` prop is now passed in dynamically from Space.jsx
 * (based on the actual space index), NOT hardcoded to spaces[0].
 */
const GridLayout = ({ layout, spacePath }) => {
    const { isEditing, updateConfig, config, showModal, selectedItemId, setSelectedItemId } = usePanel();
    const containerRef = useRef(null);
    const [localItems, setLocalItems] = useState(layout.items || []);
    const [containerWidth, setContainerWidth] = useState(300);

    const [interactionState, setInteractionState] = useState({
        type: null, itemId: null, startX: 0, startY: 0, initialItem: null, handle: null
    });

    // Sync from context when layout changes
    useEffect(() => {
        setLocalItems(layout.items || []);
    }, [layout.items]);

    // Track container width
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
        };
        const observer = new ResizeObserver(updateWidth);
        if (containerRef.current) observer.observe(containerRef.current);
        updateWidth();
        return () => observer.disconnect();
    }, []);

    const colCount = layout.columns || 8;
    const rowHeight = Math.max(20, Math.floor(containerWidth / colCount));
    const maxRow = Math.max(...localItems.map(i => (i.y || 0) + (i.h || 1)), 0);
    const contentHeight = maxRow * rowHeight;

    // ── Save layout to config ─────────────────────────────────────────────
    const saveLayout = useCallback((items) => {
        const newConfig = JSON.parse(JSON.stringify(config));
        let current = newConfig;
        // Navigate to the layout using dynamic spacePath
        for (let i = 0; i < spacePath.length - 1; i++) {
            current = current[spacePath[i]];
        }
        current[spacePath[spacePath.length - 1]] = { ...layout, items };
        updateConfig(newConfig);
    }, [config, layout, spacePath, updateConfig]);

    // ── Pointer handlers ──────────────────────────────────────────────────
    const handlePointerDown = (e, item, type, handle = null) => {
        if (!isEditing) return;
        setSelectedItemId(item.id);
        if (e.target.closest('.modal-overlay')) return;
        e.preventDefault();
        e.stopPropagation();
        e.target.setPointerCapture(e.pointerId);
        setInteractionState({ type, handle, itemId: item.id, startX: e.clientX, startY: e.clientY, initialItem: { ...item } });
    };

    const handlePointerMove = (e) => {
        if (!isEditing || !interactionState.type) return;
        const { type, itemId, startX, startY, initialItem, handle } = interactionState;
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const cellWidth = rect.width / colCount;
        const deltaGridX = Math.round((e.clientX - startX) / cellWidth);
        const deltaGridY = Math.round((e.clientY - startY) / rowHeight);

        const newItems = localItems.map(it => {
            if (it.id !== itemId) return it;
            if (type === 'drag') {
                return {
                    ...it,
                    x: Math.max(0, Math.min(initialItem.x + deltaGridX, colCount - initialItem.w)),
                    y: Math.max(0, initialItem.y + deltaGridY)
                };
            } else if (type === 'resize') {
                let newW = initialItem.w, newH = initialItem.h;
                if (handle === 'e' || handle === 'se') newW = Math.max(MIN_W, Math.min(initialItem.w + deltaGridX, colCount - initialItem.x));
                if (handle === 's' || handle === 'se') newH = Math.max(MIN_H, initialItem.h + deltaGridY);
                return { ...it, w: newW, h: newH };
            }
            return it;
        });
        setLocalItems(newItems);
    };

    const handlePointerUp = () => {
        if (!interactionState.type) return;
        saveLayout(localItems);
        setInteractionState({ type: null, itemId: null });
    };

    // ── Add item ──────────────────────────────────────────────────────────
    const handleAddItem = () => {
        const maxY = Math.max(...localItems.map(i => (i.y || 0) + (i.h || 1)), 0);
        showModal('add_item', (newItem) => {
            const itemToAdd = { ...newItem, id: `btn_${Date.now()}`, x: 0, y: maxY, w: 4, h: 2 };
            const updated = [...localItems, itemToAdd];
            setLocalItems(updated);
            saveLayout(updated);
        }, { type: 'button' });
    };

    // ── Edit item ─────────────────────────────────────────────────────────
    const handleEditItem = (item) => {
        showModal('edit_item', (updatedData) => {
            const updated = localItems.map(it => it.id === item.id ? { ...it, ...updatedData } : it);
            setLocalItems(updated);
            saveLayout(updated);
        }, item);
    };

    // ── Delete item ───────────────────────────────────────────────────────
    const handleDeleteItem = (itemId) => {
        const updated = localItems.filter(it => it.id !== itemId);
        setLocalItems(updated);
        saveLayout(updated);
        setSelectedItemId(null);
    };

    // ── Duplicate item ────────────────────────────────────────────────────
    const handleDuplicateItem = (item) => {
        const clone = { ...item, id: `btn_${Date.now()}`, y: (item.y || 0) + (item.h || 1) };
        const updated = [...localItems, clone];
        setLocalItems(updated);
        saveLayout(updated);
    };

    // ── Context menu ──────────────────────────────────────────────────────
    const handleContextMenu = (e, item) => {
        if (!isEditing) return;
        e.preventDefault();
        e.stopPropagation();
        setSelectedItemId(item.id);
        showModal('context_menu', (action) => {
            if (action === 'edit') handleEditItem(item);
            else if (action === 'delete') handleDeleteItem(item.id);
            else if (action === 'duplicate') handleDuplicateItem(item);
        }, { item, x: e.clientX, y: e.clientY });
    };

    return (
        <div
            ref={containerRef}
            className={`omni-grid ${isEditing ? 'is-editing' : ''}`}
            onPointerDown={(e) => { if (isEditing && e.target === containerRef.current) setSelectedItemId(null); }}
            style={{ position: 'relative', width: '100%', height: `${contentHeight}px`, boxSizing: 'border-box' }}
        >
            {localItems.map(item => {
                const isSelected = selectedItemId === item.id;
                const isInteracting = interactionState.itemId === item.id;
                const colWidthPct = 100 / colCount;

                return (
                    <div
                        key={item.id}
                        className={`omni-grid-item ${isInteracting ? 'interacting' : ''} ${isSelected && isEditing ? 'selected' : ''}`}
                        onPointerDown={(e) => handlePointerDown(e, item, 'drag')}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                        onDoubleClick={(e) => { if (isEditing) { e.stopPropagation(); handleEditItem(item); } }}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                        onClick={(e) => { if (isEditing) e.stopPropagation(); }}
                        style={{
                            position: 'absolute',
                            left: `${(item.x || 0) * colWidthPct}%`,
                            top: `${(item.y || 0) * rowHeight}px`,
                            width: `${(item.w || 1) * colWidthPct}%`,
                            height: `${(item.h || 1) * rowHeight}px`,
                            zIndex: isInteracting ? 100 : isSelected ? 50 : 1,
                            cursor: isEditing ? 'move' : 'default',
                            touchAction: 'none',
                            padding: '1px',
                            boxSizing: 'border-box',
                        }}
                    >
                        {/* Selection border */}
                        {isEditing && isSelected && (
                            <div className="omni-selection-ring" />
                        )}

                        {/* Item content */}
                        <div style={{ width: '100%', height: '100%', pointerEvents: isEditing ? 'none' : 'auto', overflow: 'hidden' }}>
                            {item.type === 'label' ? (
                                <div className="omni-label-item" style={{
                                    justifyContent: item.textAlign === 'left' ? 'flex-start' : item.textAlign === 'right' ? 'flex-end' : 'center',
                                    color: item.textColor || 'var(--color-label)',
                                    fontWeight: item.fontWeight || 'normal',
                                    fontStyle: item.fontStyle || 'normal',
                                    textTransform: item.textTransform || 'none',
                                    fontSize: item.fontSize || '11px',
                                    background: item.backgroundColor || 'var(--bg-label)',
                                }}>
                                    {item.text || item.label || 'Label'}
                                </div>
                            ) : (
                                <ActionButton {...item} label={item.label || item.text} />
                            )}
                        </div>

                        {/* Resize handles (when selected in edit mode) */}
                        {isEditing && isSelected && (
                            <>
                                <div className="resize-handle resize-e" onPointerDown={(e) => handlePointerDown(e, item, 'resize', 'e')} />
                                <div className="resize-handle resize-s" onPointerDown={(e) => handlePointerDown(e, item, 'resize', 's')} />
                                <div className="resize-handle resize-se" onPointerDown={(e) => handlePointerDown(e, item, 'resize', 'se')} />
                            </>
                        )}
                    </div>
                );
            })}

            {/* Ghost Add Button */}
            {isEditing && (
                <div
                    className="omni-ghost-add"
                    onClick={handleAddItem}
                    style={{ top: `${contentHeight}px` }}
                >
                    <span>+</span>
                    <span className="omni-ghost-add-label">Add Item</span>
                </div>
            )}
        </div>
    );
};

export default GridLayout;

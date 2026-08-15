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
    const { isEditing, updateConfig, config, showModal, selectedItemId, setSelectedItemId, selectedItemIds, setSelectedItemIds } = usePanel();
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

    const colCount = 6;
    const rowHeight = 32; // Photoshop panel row height (32px)
    const maxRow = Math.max(...localItems.map(i => (i.y || 0) + (i.h || 1)), 0);
    const contentHeight = maxRow * rowHeight;

    // ── Save layout to config ─────────────────────────────────────────────
    const saveLayout = useCallback((items) => {
        updateConfig(prevConfig => {
            const newConfig = JSON.parse(JSON.stringify(prevConfig));
            let current = newConfig;
            for (let i = 0; i < spacePath.length - 1; i++) {
                current = current[spacePath[i]];
            }
            if (current && current[spacePath[spacePath.length - 1]]) {
                current[spacePath[spacePath.length - 1]] = {
                    ...current[spacePath[spacePath.length - 1]],
                    items
                };
            }
            return newConfig;
        });
    }, [spacePath, updateConfig]);

    // ── Pointer handlers ──────────────────────────────────────────────────
    const lastClickRef = useRef({ time: 0, id: null });

    const handlePointerDown = (e, item, type, handle = null) => {
        if (!isEditing) return;
        e.stopPropagation();

        const isShift = e.shiftKey;
        let newIds = [...selectedItemIds];

        if (isShift) {
            // Find the last selected item (if any) to calculate range selection
            const lastItem = localItems.find(it => it.id === selectedItemId);
            if (lastItem && lastItem.id !== item.id) {
                // Geometric range selection (bounding box)
                const minX = Math.min((lastItem.x || 0), (item.x || 0));
                const maxX = Math.max((lastItem.x || 0), (item.x || 0));
                const minY = Math.min((lastItem.y || 0), (item.y || 0));
                const maxY = Math.max((lastItem.y || 0), (item.y || 0));

                // Find all items whose top-left coordinate is within the bounding box
                const itemsInRange = localItems.filter(it => 
                    (it.x || 0) >= minX && (it.x || 0) <= maxX &&
                    (it.y || 0) >= minY && (it.y || 0) <= maxY
                );

                // Add all range items to selection
                itemsInRange.forEach(it => {
                    if (!newIds.includes(it.id)) {
                        newIds.push(it.id);
                    }
                });
            } else {
                // Standard toggle behavior if no previous item was selected
                if (newIds.includes(item.id)) {
                    newIds = newIds.filter(id => id !== item.id);
                } else {
                    newIds.push(item.id);
                }
            }
        } else {
            // If the item clicked is not already in the selection list, clear others and select only it
            if (!newIds.includes(item.id)) {
                newIds = [item.id];
            }
        }
        
        setSelectedItemIds(newIds);
        setSelectedItemId(item.id); // For single actions compatibility and tracking last-clicked item

        // UXP Double-click detection for grid items
        const now = Date.now();
        if (lastClickRef.current.id === item.id && (now - lastClickRef.current.time) < 350) {
            lastClickRef.current = { time: 0, id: null };
            handleEditItem(item);
            return;
        }
        lastClickRef.current = { time: now, id: item.id };

        const startX = e.clientX;
        const startY = e.clientY;
        
        // Build map of initial states for all currently selected items
        const initialItemsMap = {};
        localItems.forEach(it => {
            if (newIds.includes(it.id)) {
                initialItemsMap[it.id] = { ...it };
            }
        });

        setInteractionState({
            type,
            itemId: item.id,
            startX,
            startY,
            initialItemsMap,
            handle
        });
    };

    const handlePointerMove = (e) => {
        if (!isEditing || !interactionState.type) return;
        const { type, itemId, startX, startY, initialItemsMap, handle } = interactionState;
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const cellWidth = rect.width / colCount;
        const deltaGridX = Math.round((e.clientX - startX) / cellWidth);
        const deltaGridY = Math.round((e.clientY - startY) / rowHeight);

        const newItems = localItems.map(it => {
            const initialItem = initialItemsMap && initialItemsMap[it.id];
            if (!initialItem) return it;

            if (type === 'drag') {
                return {
                    ...it,
                    x: Math.max(0, Math.min(initialItem.x + deltaGridX, colCount - initialItem.w)),
                    y: Math.max(0, initialItem.y + deltaGridY)
                };
            } else if (type === 'resize') {
                if (it.id !== itemId) return it; // Only resize the primary item
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
        showModal('add_item_select', (selectedType) => {
            if (!selectedType) return;
            showModal('add_item', (newItem) => {
                const isLabel = selectedType === 'label';
                
                let newItemsArr = [];
                if (Array.isArray(newItem)) {
                    let currentY = maxY;
                    let currentX = 0;
                    newItem.forEach((config, idx) => {
                        newItemsArr.push({
                            type: 'button',
                            ...config,
                            id: `btn_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
                            x: currentX,
                            y: currentY,
                            w: 3, // Default to half width for multi-added buttons
                            h: 1
                        });
                        currentX += 3;
                        if (currentX >= 6) {
                            currentX = 0;
                            currentY += 1; // Move down a row
                        }
                    });
                } else {
                    newItemsArr.push({ 
                        ...newItem, 
                        type: isLabel ? 'label' : (newItem.type || 'button'),
                        id: `btn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, 
                        x: 0, 
                        y: maxY, 
                        w: isLabel ? 6 : 3, 
                        h: 1 
                    });
                }
                
                const updated = [...localItems, ...newItemsArr];
                setLocalItems(updated);
                saveLayout(updated);
            }, { type: selectedType });
        });
    };

    // ── Edit item ─────────────────────────────────────────────────────────
    const handleEditItem = (item) => {
        showModal('edit_item', (result) => {
            if (Array.isArray(result)) {
                const [first, ...rest] = result;
                const maxY = Math.max(...localItems.map(i => (i.y || 0) + (i.h || 1)), 0);
                let currentY = maxY;
                let currentX = 0;
                const extraItems = rest.map((cfg, idx) => {
                    const extra = {
                        type: 'button',
                        ...cfg,
                        id: `btn_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
                        x: currentX,
                        y: currentY,
                        w: 3,
                        h: 1
                    };
                    currentX += 3;
                    if (currentX >= 6) { currentX = 0; currentY += 1; }
                    return extra;
                });
                const updated = localItems.map(it => it.id === item.id ? { ...it, ...first } : it).concat(extraItems);
                setLocalItems(updated);
                saveLayout(updated);
            } else {
                const updated = localItems.map(it => it.id === item.id ? { ...it, ...result } : it);
                setLocalItems(updated);
                saveLayout(updated);
            }
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
            onPointerDown={(e) => { if (isEditing && e.target === containerRef.current) { setSelectedItemId(null); setSelectedItemIds([]); } }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ position: 'relative', width: '100%', height: `${contentHeight}px`, boxSizing: 'border-box' }}
        >
            {localItems.map(item => {
                const isSelected = selectedItemIds.includes(item.id);
                const isActive = selectedItemId === item.id;
                const isInteracting = interactionState.itemId === item.id;
                const colWidthPct = 100 / colCount;

                return (
                    <div
                        key={item.id}
                        className={`omni-grid-item ${isInteracting ? 'interacting' : ''} ${isSelected && isEditing ? 'selected' : ''}`}
                        onPointerDown={(e) => handlePointerDown(e, item, 'drag')}
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
                                <div
                                    className="omni-label-item"
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        height: '100%',
                                        background: item.backgroundColor || 'transparent',
                                        padding: '0 8px',
                                        boxSizing: 'border-box',
                                        textAlign: item.textAlign || 'left',
                                        lineHeight: `${(item.h || 1) * 32}px`,
                                        color: item.textColor || '#ffffff',
                                        fontWeight: item.fontWeight || '600',
                                        fontStyle: item.fontStyle || 'normal',
                                        textTransform: item.textTransform || 'uppercase',
                                        fontSize: item.fontSize || '10px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {(item.text || item.label || 'Label').trim()}
                                </div>
                            ) : (
                                <ActionButton {...item} label={item.label || item.text} />
                            )}
                        </div>

                        {/* Resize handles (only show on the active selected item) */}
                        {isEditing && isActive && (
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

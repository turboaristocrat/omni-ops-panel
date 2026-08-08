import React from 'react';
import GridLayout from './GridLayout';
import { usePanel } from '../context/PanelContext';

/**
 * Space
 * Renders the active space using its layout type.
 * Passes dynamic spacePath so GridLayout can save to the correct space index.
 */
const Space = ({ space, spaceIndex }) => {
    if (!space || !space.layout) return null;

    // Dynamic path: points to THIS space's layout in the config tree
    const spacePath = ['panels', 0, 'spaces', spaceIndex, 'layout'];

    if (space.layout.type === 'grid') {
        return (
            <div style={{ width: '100%', padding: 0, margin: 0 }}>
                <GridLayout layout={space.layout} spacePath={spacePath} />
            </div>
        );
    }

    return (
        <div style={{ padding: 12, color: 'var(--color-text-secondary)', fontSize: 11 }}>
            Unsupported layout type: {space.layout.type}
        </div>
    );
};

export default Space;

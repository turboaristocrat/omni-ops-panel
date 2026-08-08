import React from 'react';
import { executeAction } from '../../services/ActionService';
// PanelContext not needed directly in ActionButton

/**
 * ActionButton
 * Renders a single configurable action button.
 * Supports: label, icon, color, size, shortcut label, alt-click for clipping mask.
 */
const ActionButton = ({
    id,
    label,
    actionType,
    actionValue,
    icon,
    buttonColor,
    textColor,
    showLabel = true,
    buttonSize = 'standard',
    shortcut,
    style,
    className = '',
    ...rest
}) => {
    const safeStyle = (typeof style === 'object' && style !== null) ? style : {};

    const handleClick = async (e) => {
        const options = {
            clippingMask: e.altKey,
            shiftKey: e.shiftKey,
        };
        console.log(`[ActionButton] Click: "${label}" | ${actionType}:${actionValue}`, options);
        await executeAction(actionType, actionValue, options);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e);
        }
    };

    const effectiveShowLabel = showLabel || !icon;
    const displayLabel = label || actionValue || '?';

    // Determine size class
    const sizeClass = buttonSize && buttonSize !== 'standard' ? `btn-size-${buttonSize}` : '';

    // Custom background color
    const colorStyle = buttonColor ? { backgroundColor: buttonColor } : {};
    const textColorStyle = textColor ? { color: textColor } : {};

    return (
        <div
            className={`omni-button ${sizeClass} ${className}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            data-label={displayLabel}
            title={displayLabel}
            style={{ ...safeStyle, ...colorStyle }}
            {...rest}
        >
            {/* Icon */}
            {icon && (
                <span className="omni-button-icon" aria-hidden="true">
                    {(typeof icon === 'string' && (icon.includes('/') || icon.includes('.'))) ? (
                        <img src={icon} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                    ) : (
                        <span>{icon}</span>
                    )}
                </span>
            )}

            {/* Label */}
            {effectiveShowLabel && (
                <span className="omni-button-label" style={textColorStyle}>
                    {displayLabel}
                </span>
            )}

            {/* Keyboard Shortcut Badge */}
            {shortcut && (
                <span className="omni-button-shortcut" title={`Shortcut: ${shortcut}`}>
                    {shortcut}
                </span>
            )}
        </div>
    );
};

export default ActionButton;

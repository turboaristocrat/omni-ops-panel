import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StorageService } from '../services/StorageService';

const PanelContext = createContext();
export const usePanel = () => useContext(PanelContext);

// ─── Default Config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  "panels": [
    {
      "id": "main_panel",
      "activeSpaceId": "main_space",
      "spaces": [
        {
          "id": "main_space",
          "name": "My Tools",
          "layout": {
            "type": "grid",
            "columns": 6,
            "items": [
              {
                "id": "lbl_grade",
                "x": 0,
                "y": 0,
                "w": 6,
                "h": 1,
                "type": "label",
                "text": "COLOR GRADE",
                "style": "header",
                "label": "COLOR GRADE",
                "textAlign": "center",
                "fontSize": "12px",
                "textColor": "#FFFFFF",
                "backgroundColor": "#1A1A1A"
              },
              {
                "id": "btn_cc_match",
                "x": 0,
                "y": 1,
                "w": 6,
                "h": 1,
                "type": "button",
                "label": "CC Match Layers",
                "actionType": "customFunc",
                "actionValue": "ccMatchLayers"
              },
              {
                "id": "btn_levels",
                "x": 0,
                "y": 2,
                "w": 3,
                "h": 1,
                "type": "button",
                "label": "Levels Lum",
                "actionType": "customFunc",
                "actionValue": "createLevelsLum"
              },
              {
                "id": "btn_huesat",
                "x": 3,
                "y": 2,
                "w": 3,
                "h": 1,
                "type": "button",
                "label": "HueSat Color",
                "actionType": "customFunc",
                "actionValue": "createHueSatColor"
              },
              {
                "id": "btn_curves",
                "x": 0,
                "y": 3,
                "w": 3,
                "h": 1,
                "type": "button",
                "label": "Curves Color",
                "actionType": "customFunc",
                "actionValue": "createCurvesColor"
              },
              {
                "id": "btn_all",
                "x": 3,
                "y": 3,
                "w": 3,
                "h": 1,
                "type": "button",
                "label": "Create All 3",
                "actionType": "customFunc",
                "actionValue": "createColorGradeStack"
              }
            ]
          }
        }
      ]
    }
  ]
};

// ─── Provider ────────────────────────────────────────────────────────────────

export const PanelProvider = ({ children }) => {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [activeSpaceId, setActiveSpaceId] = useState(DEFAULT_CONFIG.panels[0].activeSpaceId);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [modalState, setModalState] = useState({ isOpen: false, type: null, onConfirm: null, initialData: {} });

    // ── Load config on mount ──────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            const saved = await StorageService.load();
            if (saved && saved.panels) {
                setConfig(saved);
                if (saved.panels[0]?.activeSpaceId) {
                    setActiveSpaceId(saved.panels[0].activeSpaceId);
                }
            }
        };
        load();
    }, []);

    // ── Save on change ────────────────────────────────────────────────────
    const updateConfig = useCallback((newConfig) => {
        const clone = JSON.parse(JSON.stringify(newConfig));
        setConfig(clone);
        StorageService.save(clone);
    }, []);

    // ── Edit mode cleanup ─────────────────────────────────────────────────
    useEffect(() => {
        if (!isEditing) setSelectedItemId(null);
        if (isEditing) document.body.classList.add('edit-mode');
        else document.body.classList.remove('edit-mode');
    }, [isEditing]);

    // ── Modal helpers ─────────────────────────────────────────────────────
    const showModal = useCallback((type, onConfirm, initialData = {}) => {
        setModalState({ isOpen: true, type, onConfirm, initialData });
    }, []);

    const closeModal = useCallback(() => {
        setModalState(prev => ({ ...prev, isOpen: false }));
    }, []);

    // ── Derived state ─────────────────────────────────────────────────────
    const activeSpace = config.panels[0].spaces.find(s => s.id === activeSpaceId)
        || config.panels[0].spaces[0];

    // Sync activeSpaceId if active space was deleted
    useEffect(() => {
        const exists = config.panels[0].spaces.find(s => s.id === activeSpaceId);
        if (!exists && config.panels[0].spaces.length > 0) {
            setActiveSpaceId(config.panels[0].spaces[0].id);
        }
    }, [config, activeSpaceId]);
    const value = {
        config,
        activeSpace,
        activeSpaceId,
        setActiveSpaceId,
        updateConfig,
        isEditing,
        setIsEditing,
        selectedItemId,
        setSelectedItemId,
        modalState,
        showModal,
        closeModal,
    };

    return (
        <PanelContext.Provider value={value}>
            {children}
        </PanelContext.Provider>
    );
};

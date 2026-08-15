import React from 'react';
import { createRoot } from 'react-dom/client';
import { PanelProvider } from './context/PanelContext';
import Panel from './components/Panel';
import './styles/index.css';

// ─── UXP Entrypoints Setup ───────────────────────────────────────────────────
// Must call entrypoints.setup() to register all plugin entry points.
// Commands are headless operations, panels show persistent UI.

const { entrypoints } = require('uxp');
const { storage } = require('uxp');
const fs = storage.localFileSystem;

// ── Panel Entrypoint ──────────────────────────────────────────────────────────
const App = () => (
    <sp-theme theme="spectrum" color="dark" scale="medium">
        <PanelProvider>
            <Panel />
        </PanelProvider>
    </sp-theme>
);

// ── Register all entrypoints ──────────────────────────────────────────────────
entrypoints.setup({
    panels: {
        'omni-ops-main': {
            create() {
                const rootElement = document.getElementById('root');
                const root = createRoot(rootElement);
                root.render(<App />);
            }
        }
    },
    commands: {
        exportConfig: async () => {
            try {
                const dataFolder = await fs.getDataFolder();
                const entries = await dataFolder.getEntries();
                const configFile = entries.find(e => e.name === 'omniops_config_v1.json');
                if (!configFile) {
                    const { core } = require('photoshop');
                    await core.showAlert('No config found to export.');
                    return;
                }
                const content = await configFile.read();
                const saveFile = await fs.getFileForSaving('omniops-layout-backup.json', { types: ['json'] });
                if (saveFile) {
                    await saveFile.write(content);
                    const { core } = require('photoshop');
                    await core.showAlert('Config exported successfully!');
                }
            } catch (e) { console.error('[Command: exportConfig]', e); }
        },
        importConfig: async () => {
            try {
                const file = await fs.getFileForOpening({ allowMultiple: false, types: ['json'] });
                if (!file) return;
                const content = await file.read();
                const parsed = JSON.parse(content);
                if (!parsed.panels) {
                    const { core } = require('photoshop');
                    await core.showAlert('Invalid config file. Please import a valid Omni Ops backup.');
                    return;
                }
                const dataFolder = await fs.getDataFolder();
                const saveFile = await dataFolder.createEntry('omniops_config_v1.json', { overwrite: true });
                await saveFile.write(JSON.stringify(parsed, null, 2));
                const { core } = require('photoshop');
                await core.showAlert('Config imported! Please close and reopen the panel to apply.');
            } catch (e) { console.error('[Command: importConfig]', e); }
        },
        resetConfig: async () => {
            try {
                const { core } = require('photoshop');
                const result = await core.showAlert('This will reset all your layouts to defaults. Continue?');
                const dataFolder = await fs.getDataFolder();
                const entries = await dataFolder.getEntries();
                const configFile = entries.find(e => e.name === 'omniops_config_v1.json');
                if (configFile) await configFile.delete();
                await core.showAlert('Config reset! Please close and reopen the panel.');
            } catch (e) { console.error('[Command: resetConfig]', e); }
        },
        showAbout: async () => {
            const { core } = require('photoshop');
            await core.showAlert(
                'Omni Ops v0.1.0\n\nA fully-customizable Photoshop UXP panel.\nBuild and manage action buttons, shortcuts, and custom workflows.\n\n© 2026 Omni Ops'
            );
        }
    }
});

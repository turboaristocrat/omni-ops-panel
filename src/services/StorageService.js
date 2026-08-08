/**
 * StorageService.js
 * Handles all config persistence: load, save, export, import, reset.
 * Uses UXP localFileSystem for storage.
 */

const { storage } = require('uxp');
const fs = storage.localFileSystem;

const CONFIG_FILENAME = 'omniops_config_v1.json';

export const StorageService = {

    /**
     * Load config from UXP data folder.
     * Returns null if no config file exists.
     */
    async load() {
        try {
            const dataFolder = await fs.getDataFolder();
            const entries = await dataFolder.getEntries();
            const found = entries.find(e => e.name === CONFIG_FILENAME);
            if (found) {
                const json = await found.read();
                const parsed = JSON.parse(json);
                console.log('[StorageService] Config loaded successfully.');
                return parsed;
            }
            console.log('[StorageService] No saved config found. Using defaults.');
            return null;
        } catch (e) {
            console.error('[StorageService] Failed to load config:', e);
            return null;
        }
    },

    /**
     * Save config to UXP data folder.
     */
    async save(config) {
        try {
            const dataFolder = await fs.getDataFolder();
            const file = await dataFolder.createEntry(CONFIG_FILENAME, { overwrite: true });
            await file.write(JSON.stringify(config, null, 2));
            console.log('[StorageService] Config saved.');
        } catch (e) {
            console.error('[StorageService] Failed to save config:', e);
        }
    },

    /**
     * Export config to a user-chosen file path.
     */
    async exportConfig(config) {
        try {
            const file = await fs.getFileForSaving('omniops-layout-backup.json', {
                types: ['json']
            });
            if (!file) return false; // User cancelled
            await file.write(JSON.stringify(config, null, 2));
            console.log('[StorageService] Config exported successfully.');
            return true;
        } catch (e) {
            console.error('[StorageService] Export failed:', e);
            return false;
        }
    },

    /**
     * Import config from a user-chosen file.
     * Returns parsed config or null on failure/cancel.
     */
    async importConfig() {
        try {
            const file = await fs.getFileForOpening({
                allowMultiple: false,
                types: ['json']
            });
            if (!file) return null; // User cancelled
            const json = await file.read();
            const parsed = JSON.parse(json);
            console.log('[StorageService] Config imported successfully.');
            return parsed;
        } catch (e) {
            console.error('[StorageService] Import failed:', e);
            return null;
        }
    },

    /**
     * Delete the saved config file (reset to defaults).
     */
    async reset() {
        try {
            const dataFolder = await fs.getDataFolder();
            const entries = await dataFolder.getEntries();
            const found = entries.find(e => e.name === CONFIG_FILENAME);
            if (found) {
                await found.delete();
                console.log('[StorageService] Config reset.');
            }
        } catch (e) {
            console.error('[StorageService] Reset failed:', e);
        }
    }
};

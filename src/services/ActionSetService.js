/**
 * ActionSetService.js
 * Reads real Photoshop Actions from the app's action tree.
 * Replaces the mock fetchedActions array in the old ConfigModal.
 */

const { app } = require('photoshop');

/**
 * Fetch all available Photoshop Action Sets and their actions.
 * Returns a flat array of action items for the button config search.
 *
 * @returns {Array<{label: string, value: string, type: string, displayType: string, setName: string}>}
 */
export async function getActionSets() {
    const results = [];
    try {
        const actionTree = app.actionTree;
        if (!actionTree || actionTree.length === 0) {
            console.warn('[ActionSetService] No action sets found. Make sure the Actions panel is open in PS.');
            return results;
        }
        for (const set of actionTree) {
            const setName = set.name;
            for (const action of set.actions) {
                results.push({
                    label: `${setName} > ${action.name}`,
                    value: `${setName}>${action.name}`,
                    type: 'playAction',
                    displayType: 'PS Action',
                    setName: setName,
                    actionName: action.name
                });
            }
        }
        console.log(`[ActionSetService] Loaded ${results.length} actions from ${actionTree.length} sets.`);
    } catch (e) {
        console.error('[ActionSetService] Failed to read action tree:', e);
    }
    return results;
}

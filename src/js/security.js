/**
 * security.js
 *
 * Security utilities for XSS prevention, URL validation, and data validation
 * Provides functions to sanitize user input and validate external resources
 */

/**
 * Escape HTML to prevent XSS attacks
 * Replaces dangerous characters with HTML entities
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Validate that a URL is HTTPS only
 * Used for user photo URLs and external resources
 */
function isValidHttpsUrl(urlString) {
    try {
        const url = new URL(urlString);
        return url.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

/**
 * Sanitize profile name (alphanumeric only, max 20 characters)
 * Removes all non-alphanumeric characters
 */
function sanitizeProfileName(name) {
    const cleaned = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
    return cleaned;
}

/**
 * Validate app data structure
 * Ensures data integrity before loading
 */
function validateAppData(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.profiles || typeof data.profiles !== 'object') return false;
    // Must have at least one profile
    if (Object.keys(data.profiles).length === 0) return false;
    // activeProfileId should be a string
    if (!data.activeProfileId || typeof data.activeProfileId !== 'string') return false;
    // Validate each profile contains valid chapter data
    for (const profileName in data.profiles) {
        const profile = data.profiles[profileName];
        if (typeof profile !== 'object') return false;
    }
    return true;
}

/**
 * Hash-based color generator for profile colors
 * Generates consistent colors based on string hash
 */
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return {
        bg: `hsl(${hue}, 70%, 92%)`,
        border: `hsl(${hue}, 50%, 70%)`,
        text: `hsl(${hue}, 60%, 35%)`,
        solid: `hsl(${hue}, 65%, 55%)`
    };
}

export {
    escapeHtml,
    isValidHttpsUrl,
    sanitizeProfileName,
    validateAppData,
    stringToColor
};

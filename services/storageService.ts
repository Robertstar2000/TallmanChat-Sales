// Safe wrapper around localStorage that handles errors gracefully
export const safeLocalStorage = {
    getItem: (key: string): string | null => {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn(`Failed to get item from localStorage: ${key}`, error);
            return null;
        }
    },

    setItem: (key: string, value: string): void => {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn(`Failed to set item in localStorage: ${key}`, error);
        }
    },

    removeItem: (key: string): void => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn(`Failed to remove item from localStorage: ${key}`, error);
        }
    },

    clear: (): void => {
        try {
            localStorage.clear();
        } catch (error) {
            console.warn(`Failed to clear localStorage`, error);
        }
    }
};

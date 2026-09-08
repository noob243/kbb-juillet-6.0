
// Import React to resolve namespace errors for React.Dispatch and React.SetStateAction types
import React, { useState, useEffect } from 'react';
import { safeSetItem, safeGetItem } from '../utils/storageHelper';

export const usePersistentState = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [state, setState] = useState<T>(() => {
        try {
            const storedValue = safeGetItem(key);
            return storedValue ? JSON.parse(storedValue) : initialValue;
        } catch (error) {
            console.error("Error reading from localStorage", error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            safeSetItem(key, JSON.stringify(state));
        } catch (error) {
            console.error("Error writing to localStorage", error);
        }
    }, [key, state]);

    return [state, setState];
};

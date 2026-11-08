const RECENCY_FIELDS = [
    'archivedAt',
    'createdAt',
    'updatedAt',
    'dateCreated',
    'dateCreation',
    'date',
    'dueDate',
    'startDate',
    'serviceStartDate',
    'firstOathDate'
];

const asRecord = (value: unknown): Record<string, unknown> | null =>
    value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;

const getRecency = (record: unknown): number | null => {
    const values = asRecord(record);
    if (!values) return null;

    for (const field of RECENCY_FIELDS) {
        const value = values[field];
        if (typeof value !== 'string' || !value.trim()) continue;
        const timestamp = Date.parse(value);
        if (Number.isFinite(timestamp)) return timestamp;
    }

    return null;
};

export const recentFirst = <T,>(items: T[]): T[] =>
    [...items].sort((a, b) => {
        const aDate = getRecency(a);
        const bDate = getRecency(b);

        if (aDate !== null && bDate !== null && aDate !== bDate) return bDate - aDate;
        if (aDate !== null && bDate === null) return -1;
        if (aDate === null && bDate !== null) return 1;

        const aId = asRecord(a)?.id;
        const bId = asRecord(b)?.id;
        return String(bId ?? '').localeCompare(String(aId ?? ''), undefined, { numeric: true });
    });

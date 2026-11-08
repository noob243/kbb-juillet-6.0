import { useEffect, useState } from 'react';
import { recentFirst } from '../utils/recentFirst';

export const PAGE_SIZE = 10;

export const usePagination = <T,>(items: T[], resetKey?: string | number) => {
    const [currentPage, setCurrentPage] = useState(1);
    const pageCount = Math.ceil(items.length / PAGE_SIZE);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const sortedItems = recentFirst<T>(items);

    useEffect(() => {
        setCurrentPage(1);
    }, [resetKey]);

    useEffect(() => {
        setCurrentPage(page => Math.min(page, Math.max(1, pageCount)));
    }, [pageCount]);

    return {
        currentPage,
        pageCount,
        startIndex,
        visibleItems: sortedItems.slice(startIndex, startIndex + PAGE_SIZE),
        setCurrentPage
    };
};

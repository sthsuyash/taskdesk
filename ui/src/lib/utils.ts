import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(ts: number, options?: { short?: boolean; time?: boolean }) {
    const date = new Date(ts);
    const day = date.getDate();
    const suffix = [11, 12, 13].includes(day) ? 'th' :
        [1, 21, 31].includes(day) ? 'st' :
        [2, 22].includes(day) ? 'nd' :
        [3, 23].includes(day) ? 'rd' : 'th';

    const month = date.toLocaleString('default', { month: options?.short ? 'short' : 'long' });
    const year = date.getFullYear();
    const time = options?.time ? ` ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';

    return `${day}${suffix} ${month}, ${year}${time}`;
}

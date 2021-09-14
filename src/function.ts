export function msSince(since: Date | null): number {
    if (!since)
        return 0;

    const now = new Date();
    return now.getTime() - since.getTime();
}

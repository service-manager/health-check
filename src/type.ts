export type StatusCount = {
    up: number,
    down: number,
    timeout: number
}

export type StatusLast = {
    up: Date | null,
    down: Date | null,
    timeout: Date | null
}

export type Result = Promise<boolean> | boolean;

export type Callback = () => Result;

export type TimeoutStatus = "timeout";


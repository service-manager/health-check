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

export type HealthCheckResult = Promise<boolean> | boolean;

export type HealthCheckCallback = () => HealthCheckResult;

export type HealthCheckTimeout = "timeout";


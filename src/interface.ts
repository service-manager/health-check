import {HealthCheckStatus} from "./enum";
import {HealthCheckCallback} from "./type";

export interface Options {
    callback?: HealthCheckCallback,
    interval?: number,
    timeout?: number
    start?: boolean;
    onStart?: () => void,
    onStop?: () => void,
    onUp?: (event: HealthCheckEventPayload) => void,
    onDown?: (event: HealthCheckEventPayload) => void,
    onChange?: (event: HealthCheckEventPayload) => void,
    onTimeout?: (event: HealthCheckStatusChange) => void,
}

export interface HealthCheckStatusChange {
    timestamp: Date,
    status: HealthCheckStatus
}

export interface HealthCheckEventPayload extends HealthCheckStatusChange {
    since?: Date | null,
    for?: number | null,
}


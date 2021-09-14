import {Status} from "./enum";

export interface Options {
    interval?: number,
    timeout?: number
    autoStart?: boolean;
}

export interface StatusChange {
    timestamp: Date,
    status: Status
}

export interface EventPayload extends StatusChange {
    since?: Date | null,
    for?: number | null,
}


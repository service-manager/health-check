/// <reference types="node" />

import EventEmitter from 'events';

export declare interface HealthCheck {
    on(event: HealthCheckEvent.Timeout, listener: (change: HealthCheckStatusChange) => void): this;
    on(event: HealthCheckEvent.Change, listener: (event: HealthCheckEventPayload) => void): this;
    on(event: HealthCheckEvent.Up, listener: (event: HealthCheckEventPayload) => void): this;
    on(event: HealthCheckEvent.Down, listener: (event: HealthCheckEventPayload) => void): this;
    on(event: HealthCheckEvent.Start, listener: () => void): this;
    on(event: HealthCheckEvent.Stop, listener: () => void): this;
    on(event: string, listener: Function): this;
}

export declare class HealthCheck extends EventEmitter {
    private readonly _init;
    private _count;
    private _last;
    private _changedAt;
    private readonly _interval;
    private readonly _timeout;
    private history;
    readonly Timeout: HealthCheckTimeout;
    constructor(options: HealthCheckOptions);
    constructor(callback: HealthCheckCallback, options?: HealthCheckOptions);
    private _status;
    private _setStatus;
    private _updateStatus;
    private _addHistory;
    private readonly _callback?;
    private _check;
    private _wait;
    private _tick;
    private _timer;
    stop(): void;
    start(): void;
    get isUp(): boolean;
    get isDown(): boolean;
    get upSince(): Date | null;
    get downSince(): Date | null;
    get upFor(): number;
    get downFor(): number;
}

declare type HealthCheckCallback = () => HealthCheckResult;

declare enum HealthCheckEvent {
    Up = "up",
    Down = "down",
    Change = "change",
    Start = "start",
    Stop = "stop",
    Timeout = "timeout",
    Result = "result"
}

declare interface HealthCheckEventPayload extends HealthCheckStatusChange {
    since?: Date | null;
    for?: number | null;
}

declare interface HealthCheckOptions {
    callback?: HealthCheckCallback;
    interval?: number;
    timeout?: number;
    start?: boolean;
    onStart?: () => void;
    onStop?: () => void;
    onUp?: (event: HealthCheckEventPayload) => void;
    onDown?: (event: HealthCheckEventPayload) => void;
    onChange?: (event: HealthCheckEventPayload) => void;
    onTimeout?: (event: HealthCheckStatusChange) => void;
}

declare type HealthCheckResult = Promise<boolean> | boolean;

declare enum HealthCheckStatus {
    Up = "up",
    Down = "down"
}

declare interface HealthCheckStatusChange {
    timestamp: Date;
    status: HealthCheckStatus;
}

declare type HealthCheckTimeout = "timeout";

export { }

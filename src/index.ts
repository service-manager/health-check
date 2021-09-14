import EventEmitter from "events";
import {msSince} from "./function";
import {HealthCheckEvent, HealthCheckStatus} from "./enum";
import {HealthCheckEventPayload, HealthCheckStatusChange, HealthCheckOptions} from "./interface";
import {HealthCheckCallback, HealthCheckTimeout, StatusCount, StatusLast} from "./type";

const DefaultInterval = 5000;

export declare interface HealthCheck {
    on(event: HealthCheckEvent.Timeout, listener: (change: HealthCheckStatusChange) => void): this;
    on(event: HealthCheckEvent.Change, listener: (event: HealthCheckEventPayload) => void): this;
    on(event: HealthCheckEvent.Up, listener: (event: HealthCheckEventPayload) => void): this;
    on(event: HealthCheckEvent.Down, listener: (event: HealthCheckEventPayload) => void): this;
    on(event: HealthCheckEvent.Start, listener: () => void): this;
    on(event: HealthCheckEvent.Stop, listener: () => void): this;
    on(event: string, listener: Function): this;
}

export class HealthCheck extends EventEmitter {

    private readonly _init: Date;

    private _count: StatusCount;
    private _last: StatusLast;
    private _changedAt: Date | null = null;

    private readonly _interval: number;
    private readonly _timeout: number;

    private history: HealthCheckStatusChange[] = [];

    readonly Timeout: HealthCheckTimeout = "timeout";

    constructor(options: HealthCheckOptions)
    constructor(callback: HealthCheckCallback, options?: HealthCheckOptions)
    constructor(cbOrOpts: HealthCheckCallback | HealthCheckOptions, opt?: HealthCheckOptions) {
        super();

        let options: HealthCheckOptions = opt || {}
        if (typeof cbOrOpts === "object") {
            options = cbOrOpts
        }
        if (typeof cbOrOpts === "function") {
            options.callback = cbOrOpts;
        }

        const now = new Date();
        this._init = now;

        this._count = {
            up: 0,
            down: 0,
            timeout: 0,
        };

        this._last = {
            up: null,
            down: now,
            timeout: null,
        }

        this._interval = options.interval || DefaultInterval;
        this._timeout = options.timeout || this._interval;

        this._callback = options.callback;

        // pass event handlers
        if (options.onStart) this.on(HealthCheckEvent.Start, options.onStart);
        if (options.onStop) this.on(HealthCheckEvent.Stop, options.onStop);
        if (options.onUp) this.on(HealthCheckEvent.Up, options.onUp);
        if (options.onDown) this.on(HealthCheckEvent.Down, options.onDown);
        if (options.onChange) this.on(HealthCheckEvent.Change, options.onChange);
        if (options.onTimeout) this.on(HealthCheckEvent.Timeout, options.onTimeout);

        // auto start
        if (options.start) this.start();

    }

    private _status: HealthCheckStatus = HealthCheckStatus.Down;

    private _setStatus(status: boolean | HealthCheckStatus | HealthCheckTimeout) {

        // convert boolean to status
        if (status === true || status === false) {
            status = status ? HealthCheckStatus.Up : HealthCheckStatus.Down;
        }

        // timestamp of now
        const timestamp = new Date();

        // emit every timeout event and then treat as down
        if (status === this.Timeout) {
            status = HealthCheckStatus.Down;
            this._last.timeout = timestamp;
            this._count.timeout++;
            this.emit(HealthCheckEvent.Timeout, {status, timestamp});
        }

        // update last and count
        if (status === HealthCheckStatus.Up) {
            this._last.up = timestamp;
            this._count.up++;
        }

        // emit result
        this.emit(HealthCheckEvent.Result, {status, timestamp});

        // if status has not changed return and don't stress about the following
        if (status !== this._status)
            this._updateStatus(status, timestamp);

    }

    private _updateStatus(status: HealthCheckStatus, timestamp: Date) {

        // update status
        const lastStatus = this._status;
        this._status = status;

        // build event payload
        const eventPayload: HealthCheckEventPayload = {
            status,
            timestamp,
            since: status === HealthCheckStatus.Up ? this.upSince : this.downSince,
            for: status === HealthCheckStatus.Up ? this.upFor : this.downFor
        }

        this.emit(HealthCheckEvent.Change, eventPayload);

        // emit up and down events
        if (lastStatus === HealthCheckStatus.Up && status !== HealthCheckStatus.Up)
            this.emit(HealthCheckEvent.Down, eventPayload);
        if (lastStatus !== HealthCheckStatus.Up && status === HealthCheckStatus.Up)
            this.emit(HealthCheckEvent.Up , eventPayload);

        // set last status change timestamp
        this._changedAt = timestamp;

        // add history
        this._addHistory(status, timestamp);
    }

    private _addHistory(status: HealthCheckStatus, timestamp: Date) {
        // TODO: allow for maximum number of history entries (garbage collection to prevent memory consumption)
        this.history.push({status, timestamp});
    }

    private readonly _callback?: HealthCheckCallback;

    private async _check(): Promise<boolean> {
        if (!this._callback)
            return false;

        const result: boolean = await this._callback();
        return result;
    }

    private async _wait(): Promise<HealthCheckTimeout> {
        return await new Promise((resolve) => {
            let id = setTimeout(() => {
                clearTimeout(id);
                resolve(this.Timeout);
            })
        })
    }

    private async _tick() {
        const result = await Promise.race([
            this._check(),
            this._wait()
        ]);
        this._setStatus(result);
    }

    private _timer: NodeJS.Timer | null = null;

    stop() {
        if (!this._timer) return;
        clearInterval(this._timer);
        this._timer = null;
        this.emit(HealthCheckEvent.Timeout);
    }

    start() {
        this.stop();
        this._timer = setInterval(this._tick.bind(this), this._interval);
        this.emit(HealthCheckEvent.Start);
    }

    get isUp(): boolean {
        return this._status === HealthCheckStatus.Up;
    }

    get isDown(): boolean {
        return this.isUp ? false : true;
    }

    get upSince(): Date | null {
        return this.isUp ? this._changedAt : null;
    }

    get downSince(): Date | null {
        return this.isDown ? this._changedAt : null;
    }

    get upFor(): number {
        return msSince(this.upSince);
    }

    get downFor(): number {
        return msSince(this.downSince);
    }

}

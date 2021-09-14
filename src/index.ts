import EventEmitter from "events";
import {msSince} from "./timeSince";
import {Status, Event} from "./enum";
import {EventPayload, Options, StatusChange} from "./interface";
import {Callback, StatusCount, StatusLast, TimeoutStatus} from "./type";
const DefaultInterval = 5000;






export declare interface HealthCheck {
    on(event: Event.Timeout, listener: (change: StatusChange) => void): this;
    on(event: 'change', listener: (event: EventPayload) => void): this;
    on(event: 'healthy', listener: (event: EventPayload) => void): this;
    on(event: 'unhealthy', listener: (event: EventPayload) => void): this;
    on(event: 'start', listener: () => void): this;
    on(event: 'stop', listener: () => void): this;
    on(event: string, listener: Function): this;
}

export class HealthCheck extends EventEmitter {

    private readonly _init: Date;

    private _count: StatusCount;
    private _last: StatusLast;
    private _changedAt: Date | null = null;

    private readonly _interval: number;
    private readonly _timeout: number;

    private history: StatusChange[] = [];

    readonly Timeout: TimeoutStatus = "timeout";

    constructor(callback: Callback, opts: Options = {}) {
        super();

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

        this._interval = opts.interval || DefaultInterval;
        this._timeout = opts.timeout || this._interval;

        this._callback = callback;

        if (opts && opts.autoStart) {
            this.start();
        }

    }

    private _status: Status = Status.Down;

    private _setStatus(status: boolean | Status | TimeoutStatus) {

        // convert boolean to status
        if (status === true || status === false) {
            status = status ? Status.Up : Status.Down;
        }

        // timestamp of now
        const timestamp = new Date();

        // emit every timeout event and then treat as down
        if (status === this.Timeout) {
            this.emit(Event.Timeout, {status,timestamp});
            this._last.timeout = timestamp;
            this._count.timeout++;
            status = Status.Down;
        }

        // update last and count
        if (status === Status.Up) {
            this._last.up = timestamp;
            this._count.up++;
        }

        // if status has not changed return and don't stress about the following
        if (status !== this._status)
            this._updateStatus(status, timestamp);

    }

    private _updateStatus(status: Status, timestamp: Date) {

        // update status
        const lastStatus = this._status;
        this._status = status;

        // build event payload
        const eventPayload: EventPayload = {
            status,
            timestamp,
            since: status === Status.Up ? this.upSince : this.downSince,
            for: status === Status.Up ? this.upFor : this.downFor
        }

        this.emit(Event.Status, eventPayload);

        // emit up and down events
        if (lastStatus === Status.Up && status !== Status.Up)
            this.emit(Event.Down, eventPayload);
        if (lastStatus !== Status.Up && status === Status.Up)
            this.emit(Event.Up , eventPayload);

        // set last status change timestamp
        this._changedAt = timestamp;

        // add history
        this._addHistory(status, timestamp);
    }

    private _addHistory(status: Status, timestamp: Date) {
        // TODO: allow for maximum number of history entries (garbage collection to prevent memory consumption)
        this.history.push({status, timestamp});
    }

    private readonly _callback: Callback;

    private async _check(): Promise<boolean> {
        const result: boolean = await this._callback();
        return result;
    }

    private async _wait(): Promise<TimeoutStatus> {
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
        this.emit(Event.Timeout);
    }

    start() {
        this.stop();
        this._timer = setInterval(this._tick.bind(this), this._interval);
        this.emit(Event.Start);
    }

    get isUp(): boolean {
        return this._status === Status.Up;
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

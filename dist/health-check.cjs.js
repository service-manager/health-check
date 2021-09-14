'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var EventEmitter = require('events');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var EventEmitter__default = /*#__PURE__*/_interopDefaultLegacy(EventEmitter);

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function msSince(since) {
    if (!since)
        return 0;
    const now = new Date();
    return now.getTime() - since.getTime();
}

var HealthCheckStatus;
(function (HealthCheckStatus) {
    HealthCheckStatus["Up"] = "up";
    HealthCheckStatus["Down"] = "down";
})(HealthCheckStatus || (HealthCheckStatus = {}));
var HealthCheckEvent;
(function (HealthCheckEvent) {
    HealthCheckEvent["Up"] = "up";
    HealthCheckEvent["Down"] = "down";
    HealthCheckEvent["Change"] = "change";
    HealthCheckEvent["Start"] = "start";
    HealthCheckEvent["Stop"] = "stop";
    HealthCheckEvent["Timeout"] = "timeout";
    HealthCheckEvent["Result"] = "result";
})(HealthCheckEvent || (HealthCheckEvent = {}));

const DefaultInterval = 5000;
class HealthCheck extends EventEmitter__default['default'] {
    constructor(cbOrOpts, opt) {
        super();
        this._changedAt = null;
        this.history = [];
        this.Timeout = "timeout";
        this._status = HealthCheckStatus.Down;
        this._timer = null;
        let options = opt || {};
        if (typeof cbOrOpts === "object") {
            options = cbOrOpts;
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
        };
        this._interval = options.interval || DefaultInterval;
        this._timeout = options.timeout || this._interval;
        this._callback = options.callback;
        // pass event handlers
        if (options.onStart)
            this.on(HealthCheckEvent.Start, options.onStart);
        if (options.onStop)
            this.on(HealthCheckEvent.Stop, options.onStop);
        if (options.onUp)
            this.on(HealthCheckEvent.Up, options.onUp);
        if (options.onDown)
            this.on(HealthCheckEvent.Down, options.onDown);
        if (options.onChange)
            this.on(HealthCheckEvent.Change, options.onChange);
        if (options.onTimeout)
            this.on(HealthCheckEvent.Timeout, options.onTimeout);
        // auto start
        if (options.start)
            this.start();
    }
    _setStatus(status) {
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
            this.emit(HealthCheckEvent.Timeout, { status, timestamp });
        }
        // update last and count
        if (status === HealthCheckStatus.Up) {
            this._last.up = timestamp;
            this._count.up++;
        }
        // emit result
        this.emit(HealthCheckEvent.Result, { status, timestamp });
        // if status has not changed return and don't stress about the following
        if (status !== this._status)
            this._updateStatus(status, timestamp);
    }
    _updateStatus(status, timestamp) {
        // update status
        const lastStatus = this._status;
        this._status = status;
        // build event payload
        const eventPayload = {
            status,
            timestamp,
            since: status === HealthCheckStatus.Up ? this.upSince : this.downSince,
            for: status === HealthCheckStatus.Up ? this.upFor : this.downFor
        };
        this.emit(HealthCheckEvent.Change, eventPayload);
        // emit up and down events
        if (lastStatus === HealthCheckStatus.Up && status !== HealthCheckStatus.Up)
            this.emit(HealthCheckEvent.Down, eventPayload);
        if (lastStatus !== HealthCheckStatus.Up && status === HealthCheckStatus.Up)
            this.emit(HealthCheckEvent.Up, eventPayload);
        // set last status change timestamp
        this._changedAt = timestamp;
        // add history
        this._addHistory(status, timestamp);
    }
    _addHistory(status, timestamp) {
        // TODO: allow for maximum number of history entries (garbage collection to prevent memory consumption)
        this.history.push({ status, timestamp });
    }
    _check() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._callback)
                return false;
            const result = yield this._callback();
            return result;
        });
    }
    _wait() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new Promise((resolve) => {
                let id = setTimeout(() => {
                    clearTimeout(id);
                    resolve(this.Timeout);
                });
            });
        });
    }
    _tick() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield Promise.race([
                this._check(),
                this._wait()
            ]);
            this._setStatus(result);
        });
    }
    stop() {
        if (!this._timer)
            return;
        clearInterval(this._timer);
        this._timer = null;
        this.emit(HealthCheckEvent.Timeout);
    }
    start() {
        this.stop();
        this._timer = setInterval(this._tick.bind(this), this._interval);
        this.emit(HealthCheckEvent.Start);
    }
    get isUp() {
        return this._status === HealthCheckStatus.Up;
    }
    get isDown() {
        return this.isUp ? false : true;
    }
    get upSince() {
        return this.isUp ? this._changedAt : null;
    }
    get downSince() {
        return this.isDown ? this._changedAt : null;
    }
    get upFor() {
        return msSince(this.upSince);
    }
    get downFor() {
        return msSince(this.downSince);
    }
}

exports.HealthCheck = HealthCheck;

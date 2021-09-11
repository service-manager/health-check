
export namespace HealthCheck {
    
    const DefaultInterval = 5000;
    
    type status = "up" | "down" | "timeout";

    export enum Status {
        Up = "up",
        Down = "down",
        Timeout = "timeout"
    }

    export type Result = Promise<boolean> | boolean;
    export type Callback = () => Result;

    export interface Options {
        interval?: number,
        timeout?: number
        autoStart?: boolean;
    }

    export default class HealthCheck extends EventEmitter {

        private readonly _init: Date;
        
        private _count: {[status: status]: number} = {
            up: 0,
            down: 0,
            timeout: 0,
        }
        private _last: {[status: status]:  Date | null} = {
            up: null,
            down: null,
            timeout: null
        }

        private readonly _interval: number;
        private readonly _timeout: number;  


        constructor(callback: Callback, opts: Options = {}) {
            super();

            const now = new Date();
            this._init = now;

            this._count = {
                up: 0,
                down: 0,
                null: 0,
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

        private _setStatus(status: boolean | HealthCheckStatus) {
            if (status === true) {
                status = HealthCheckStatus.Up;
            }
            if (status === false) {
                status = HealthCheckStatus.Down;
            }

            this._status = status;
            if (status) {
                this._last.up = new Date();
                this._last.up++;
            } else {
                this._last.down = new Date();
                this._last.down++;
            }
        }

        private async _timeout(): Promise<Status.Timeout> {
            return await new Promise((resolve) => {
                let id = setTimeout(() => {
                    clearTimeout(id);
                    resolve(Status.Timeout);
                })
            })
        }
        
        private readonly _callback: Callback;
    
        private async _check() {
            const result: Result = this._callback()
            return await Promise.resolve(result);
        }


        stop() {
            if (!this._timer) return;
            clearInterval(this._timer);
            this._timer = null;
        }

        start() {
            this.stop();
            this._timer = setInterval(this._tick.bind(this), this._interval);
        }

        private async _tick() {
            const result = await Promise.race([
                this._check(),
                this._timeout()
            ]);
            this._setStatus(result);
        }

      

        get healthy(): boolean {
            return this._status === HealthCheckStatus.Up;
        }

        get isUp(): boolean {
            return this.healthy;
        }

        get isDown(): boolean {
            return this.healthy ? false : true;
        }


        get timeUp(): number {
            const upSince = this.upSince;
            return upSince ? new Date().getTime() - this.upSince.getTime() : 0;
        }

        get timeDown(): number {
            const downSince = this.downSince;    
            return new Date().getTime() - this.downSince.getTime();
        }

        get downSince(): Date | null {
            if(this.healthy)
                return null;

            return this._last.down || this._init;
        }
        
        get upSince(): Date | null {
            if(!this.healthy)
                return null;

            return this._last.up || this._init;        
        }
        
    }

    
}
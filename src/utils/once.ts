type Callback = () => void;

export class Once {
    private _callback: Callback | undefined;

    constructor(callback: Callback) {
        this._callback = callback;
    }

    trigger() {
        if (this._callback !== undefined) {
            this._callback();
            this._callback = undefined;
        }
    }
}

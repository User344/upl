interface Factory<T> { () : T }

class Lazy<T> {
    private Value: T | undefined

    constructor(private factory: Factory<T>) { }

    get value(): T {
        if (this.Value === undefined) {
            this.Value = this.factory();
        }
        return this.Value;
    }
}

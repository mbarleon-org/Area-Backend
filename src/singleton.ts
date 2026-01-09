/**
 * Registry mapping constructors to their cached singleton instances.
 */
const singletonMap = new WeakMap<Function, unknown>();

export abstract class Singleton {
    /**
     * Protected constructor to prevent direct instantiation.
     */
    protected constructor() { }

    /**
     * Retrieve or create the singleton instance for the current subclass.
     *
     * @template T
     * @param {Function} this Constructor of the subclass requesting its instance.
     * @returns {T} Singleton instance associated with the subclass.
     */
    static getInstance<T>(this: Function): T {
        let instance = singletonMap.get(this) as T | undefined;

        if (!instance) {
            const Ctor = this as unknown as new () => T;
            instance = new Ctor();
            singletonMap.set(this, instance);
        }

        return instance;
    }
}

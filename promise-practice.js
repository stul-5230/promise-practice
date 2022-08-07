

class PromiseA {
    constructor(fn) {
        if (typeof fn !== 'function') {
            throw new TypeError(fn + 'is not function')
        }

        const resolver = new Resolver()

        this._resolver = resolver

        try {
            fn((value) => {
                resolver._resolve(value)
            }, (reason) => {
                resolver._reject(reason)
            })
        } catch (e) {
            resolver._reject(e)
        }
    }

    static async(fn) {
        setTimeout(fn, 0)
    }
    
    then = (callback, errback) => {
        let resolve, reject,
        promise = new PromiseA((res, rej) => {
            resolve = res
            reject = rej
        })

        this._resolver._addCallBack(
            typeof callback === 'function' ? 
                this._makeCallback(promise, resolve, reject, callback) : resolve,
            typeof errback === 'function' ? 
                this._makeCallback(promise, resolve, reject, errback)  : reject  
        )
        return promise
    }

    _makeCallback = (PromiseA, resolve, reject, fn) => {
        return (valueOrReason) => {
            let result;
            try {
                result = fn(valueOrReason)
            } catch (e) {
                reject(e)
                return
            }

            if (result === PromiseA) {
                reject(new TypeError('cannot resolve a PromiseA with itself'))
                return;
            }

            resolve(result)
        }
    }
}

PromiseA.prototype.then = PromiseA.then


class Resolver {
    constructor () {
        this._status = 'pending'

        this._callbacks = []
    
        this._errbacks = []
    
        this._result = null
    }

    _resolve = (value) => {
        if (this._status === 'pending') {
            this._status = 'accepted'
            this._value = value

            if (this._callbacks && this._callbacks.length !== 0 ||
                this._errbacks && this._errbacks.length !== 0) {
                    this._unwrap(this._value)
            }
        }
    }

    _reject = (reason) => {
        const status = this._status
        if (status === 'pending' || status === 'accepted') {
            this._status = 'rejected'
            this._result = reason
        }

        if (this._status === 'rejected') {
            this._notify(this._errbacks, this._result)
            this._errbacks = []
            this._callbacks = null
        }
    }

    _fulfill = (value) => {
        const status = this._status
        if (status === 'pending' || status === 'accepted') {
            this._result = value
            this._status = 'fulfilled'
        }

        if (this._status === 'fulfilled') {
            this._notify(this._callbacks, this._result)
            this._callbacks = []
            this._errbacks = null
        }

    }

    _unwrap = (value) => {
        let self = this, unwrapped = false, then;
        if (!value || (typeof value !== 'object' && 
        typeof value !== 'function')) {
            self._fulfill(value)
            return
        }
        
        try {
            then = value.then
            if (typeof then === 'function') {
                then.call(value, (v) => {
                    if (!unwrapped) {
                        unwrapped = true
                        self._unwrap(v)
                    }
                }, (r) => {
                    if (!unwrapped) {
                        unwrapped = true
                        self._reject(r)
                    }
                })
            } else {
                self._fulfill(value)
            }
        } catch (e) {
            if (!unwrapped) {
                self._reject(e)
            }
        }


    }

    _notify = (callbacks, value) => {
        if (callbacks && callbacks.length !== 0) {
            PromiseA.async(function() {
                for (let i in callbacks) {
                    callbacks[i](value)
                }
            })
        }
    }

    _addCallBack = (callback, errback) => {
        if (this._callbacks) {
            this._callbacks.push(callback)
        }

        if (this._errbacks) {
            this._errbacks.push(errback)
        }

        switch (this._status) {
            case 'accepted':
                this._unwrap(this._value)
                break
            case 'fulfilled':
                this._fulfill(this._result)
                break
            case 'rejected':
                this._reject(this._result)
                break
        }
    }

}

let MyPromiseA = {};
// defered
MyPromiseA.deferred = function () {
    const dfd = {};
    dfd.promise = new PromiseA((resolve, reject) => {
        dfd.resolve = resolve;
        dfd.reject = reject;
    })
    return dfd;
}


module.exports = MyPromiseA
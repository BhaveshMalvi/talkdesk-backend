

class ErrorHandler extends Error {
    constructor( messages, statusCode){
        super(messages)
        this.statusCode = statusCode
    }
}

export {ErrorHandler}
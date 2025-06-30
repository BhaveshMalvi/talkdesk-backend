import { envMode } from "../index.js";



const errorMiddleware = (err, req, res, next) => {

    console.count("error", err)


    err.message ||= "Internal Server Error";
    err.statusCode ||= 500;


    if (err.code === 11000) {
        const error = Object.keys(err.keyPattern).join(",")
        err.message = `Duplicate field - ${error}`;
        err.statusCode = 400;
    }

    if (err.name === "CastError") {
        const errorPath = err.path
        err.message = `Invalid Formate of ${errorPath}`
        err.statusCode = 200
    }

    const response = {
        success: false,
        message: err.message
    };

    if (envMode === "DEVELOPMENT") {
        response.error = err
    }

    return res.status(err.statusCode).json(response)

    // return res.status(err.statusCode).json({
    //     success: false,
    //     message: envMode === "DEVELOPMENT" ?  err : err.message,
    // })
}


const TryCatch = (passedFunc) => async (req, res, next) => {
    try {
        await passedFunc(req, res, next);
    } catch (error) {
        console.log(error, "33");
        next(error)
    }
}




export { errorMiddleware, TryCatch }
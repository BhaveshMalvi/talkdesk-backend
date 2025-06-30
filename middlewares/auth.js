import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utility.js";
import { adminSecretKey } from "../index.js";
import { PAKAU_TOKEN } from "../constants/config.js";
import User from "../models/user.js";


const isAuthenticated = (req, res, next) => {

  const token = req.cookies[PAKAU_TOKEN];
  if (!token)
    return next(new ErrorHandler("Please Login to access this route", 401));

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);

  req.user = decodedData._id;

  next();
};


const adminOnly = (req, res, next) => {
  

 try {
   const token = req.cookies["pakau-admin-token"];
   if (!token)
     return next(new ErrorHandler("Only Admin can access this route", 401));
 
   if (!token || typeof token !== 'string') {
     return next(new ErrorHandler("Only Admin can access this route", 401));
   }
   const secretKey = jwt.verify(token, process.env.JWT_SECRET);
   console.log("secret key", secretKey,  adminSecretKey);
   
   const isMatched = secretKey === adminSecretKey;

   console.log("is match", isMatched);
   
 
   if (!isMatched) return next(new ErrorHandler("Only Admin can access this route", 401));
    else
     {
      console.log("22222");
       req.user = secretKey._id;
       return next();
      }
 
   
 } catch (error) {
  console.log(err);
  
 }
};

const socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(err);

    const authToken = socket.request.cookies[PAKAU_TOKEN];
    if (!authToken) return next(new ErrorHandler("Please login to access this route", 401))

    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET)

    const user = await User.findById(decodedData._id)
    if (!user) return next(new ErrorHandler("Please login to access this route", 401))

    socket.user = user

    return next()

  } catch (error) {
    console.log('error', error)
    return next(new ErrorHandler("Please login to access this route", 401))
  }
}


export { isAuthenticated, adminOnly, socketAuthenticator };

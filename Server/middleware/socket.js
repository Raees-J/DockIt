// Socket middleware to attach socket instance to req object
let socketInstance = null;

const setSocketInstance = (io) => {
  socketInstance = io;
};

const attachSocket = (req, res, next) => {
  req.io = socketInstance;
  next();
};

module.exports = { setSocketInstance, attachSocket };
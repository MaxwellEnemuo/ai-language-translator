import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const pinoOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }),
};

const createLogger = (serviceName: string) => {
  return pino(pinoOptions).child({ service: serviceName });
};

export default createLogger;

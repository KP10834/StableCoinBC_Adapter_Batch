import path from "path";
import pino from "pino";

const logLevel = process.env.LOG_LEVEL?.trim() || "info";
const logPretty = (process.env.LOG_PRETTY?.trim() ?? "true") === "true";
const logColorize = (process.env.LOG_COLORIZE?.trim() ?? "false") === "true";

const shouldUseTransport = logPretty || logColorize;

const stdoutTarget: pino.TransportTargetOptions = {
  target: "pino-pretty",
  level: logLevel,
  options: {
    colorize: logColorize,
    translateTime: false,
    singleLine: !logPretty,
    ignore: "pid,hostname",
  },
};

const transport =
  shouldUseTransport ? pino.transport({ targets: [stdoutTarget] }) : undefined;

const kstFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const rootLogger = pino(
  {
    level: logLevel,
    timestamp: () => {
      const now = new Date();
      const p: Record<string, string> = {};
      for (const { type, value } of kstFormatter.formatToParts(now)) {
        p[type] = value;
      }
      const ms = String(now.getMilliseconds()).padStart(3, "0");
      return `,"time":"${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.${ms}+09:00"`;
    },
    formatters: { level: (label) => ({ level: label }) },
  },
  transport,
);

export function createLogger(context: string): pino.Logger {
  const module = context.includes(path.sep) ? path.basename(context, path.extname(context)) : context;
  return rootLogger.child({ module });
}

export async function shutdownLogger(): Promise<void> {
  if (!transport) return;
  await new Promise<void>((resolve) => {
    transport.once("close", resolve);
    transport.once("error", resolve);
    transport.end();
  });
}

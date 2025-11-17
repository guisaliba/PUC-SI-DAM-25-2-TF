type PunchType = "in" | "start-break" | "out" | "end-break";

function labelForType(type: PunchType): string {
  switch (type) {
    case "in":
      return "Entrada";
    case "start-break":
      return "Intervalo";
    case "out":
      return "Saída";
    case "end-break":
      return "Retorno do intervalo";
    default:
      return "Unknown";
  }
}

export { labelForType, PunchType };

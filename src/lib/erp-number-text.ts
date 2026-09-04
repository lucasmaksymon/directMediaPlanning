/** Misma conversión que ADMINISTRACION/ordenesPagoGenerar.aspx (ConviertNumeroATexto). */
function convertNumberToText(number: number): string {
  const unitsArray = [
    "",
    "Un",
    "Dos",
    "Tres",
    "Cuatro",
    "Cinco",
    "Seis",
    "Siete",
    "Ocho",
    "Nueve",
    "Diez",
    "Once",
    "Doce",
    "Trece",
    "Catorce",
    "Quince",
    "Dieciseis",
    "Diecisiete",
    "Dieciocho",
    "Diecinueve",
  ];
  const tensArray = ["", "", "Veinte", "Treinta", "Cuarenta", "Cincuenta", "Sesenta", "Setenta", "Ochenta", "Noventa"];
  const cientosArray = [
    "",
    "Cien",
    "Doscientos",
    "Trescientos",
    "Cuatrocientos",
    "Quinientos",
    "Seiscientos",
    "Setecientos",
    "Ochocientos",
    "Novecientos",
  ];

  let value = Math.floor(Math.abs(number));
  if (value === 0) return "Cero";

  let result = "";

  if (value >= 1_000_000) {
    result += `${convertNumberToText(Math.floor(value / 1_000_000))} Millones `;
    value %= 1_000_000;
  }
  if (value >= 1000) {
    result += `${convertNumberToText(Math.floor(value / 1000))} Mil `;
    value %= 1000;
  }
  if (value >= 100) {
    result += `${cientosArray[Math.floor(value / 100)]} `;
    value %= 100;
  }
  if (value >= 20) {
    result += `${tensArray[Math.floor(value / 10)]} `;
    value %= 10;
  }
  if (value > 0) result += unitsArray[value];

  return result.trim();
}

export function amountToPesosText(amount: number) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "SON PESOS CERO";
  let text = convertNumberToText(n);
  const cents = Math.round(Math.abs(n - Math.trunc(n)) * 100);
  if (cents) text += ` Con ${cents}/100`;
  return `SON PESOS ${text.toUpperCase()}`;
}
